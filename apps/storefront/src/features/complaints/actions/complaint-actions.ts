"use server";

import { API_ERROR_CODES, type ApiErrorCode } from "@greenroots/shared";
import { revalidatePath } from "next/cache";
import { api } from "@/lib/api-client";
import {
  type BffActionFailure,
  buildActionFailure,
  buildNetworkFailure,
  buildServiceUnavailableFailure,
  buildValidationFailure,
  isTransientRefreshFailure,
} from "@/features/auth/utils/bff-error";
import {
  clearServerSessionCookies,
  runWithServerActionRefresh,
} from "@/features/auth/services/session.server";
import type {
  ComplaintDto,
  ComplaintSubmissionInput,
  ComplaintUploadSignatureInput,
  CreateComplaintDto,
  SignedUploadResponseDto,
} from "../schemas/complaint.schema";
import {
  complaintSubmissionInputSchema,
  complaintUploadSignatureInputSchema,
} from "../schemas/complaint.schema";

const COMPLAINT_INSTANCE = "/orders/[id]/complaint";

/**
 * Failure payload returned by Storefront complaint Server Actions.
 */
export interface ComplaintActionFailure extends BffActionFailure {
  readonly sessionInvalidated: boolean;
}

/** Discriminated result returned by `requestComplaintUploadSignatureAction`. */
export type ComplaintUploadSignatureActionResult =
  | { readonly ok: true; readonly signature: SignedUploadResponseDto }
  | ComplaintActionFailure;

/** Discriminated result returned by `submitComplaintAction`. */
export type SubmitComplaintActionResult =
  | { readonly ok: true; readonly complaint: ComplaintDto }
  | ComplaintActionFailure;

/**
 * Optional dependency overrides for isolated unit testing of complaint Server Actions.
 */
export interface ComplaintActionDeps {
  readonly postUploadSignature?: (
    body: ComplaintUploadSignatureInput & { folder: "complaints" },
  ) => Promise<{
    response: Response;
    data?: { data: SignedUploadResponseDto };
    error?: unknown;
  }>;
  readonly postComplaint?: (
    orderId: string,
    body: CreateComplaintDto,
  ) => Promise<{
    response: Response;
    data?: { data: ComplaintDto };
    error?: unknown;
  }>;
  readonly runWithRefresh?: typeof runWithServerActionRefresh;
  readonly clearCookies?: () => Promise<void>;
}

function resolveStatusFallbackCode(status: number): ApiErrorCode {
  if (status === 429) {
    return API_ERROR_CODES.TOO_MANY_REQUESTS;
  }
  if (status === 404) {
    return API_ERROR_CODES.ORDER_NOT_FOUND;
  }
  if (status === 409) {
    return API_ERROR_CODES.ORDER_COMPLAINT_ALREADY_EXISTS;
  }
  if (status === 422) {
    return API_ERROR_CODES.VALIDATION_FAILED;
  }
  if (status === 403) {
    return API_ERROR_CODES.FORBIDDEN;
  }
  if (status === 503) {
    return API_ERROR_CODES.SERVICE_UNAVAILABLE;
  }
  if (status >= 500) {
    return API_ERROR_CODES.INTERNAL_SERVER_ERROR;
  }
  return API_ERROR_CODES.VALIDATION_FAILED;
}

async function runProtectedComplaintCall<TValue, TSuccess extends object>(
  operation: () => Promise<{
    response: Response;
    data?: { data: TValue };
    error?: unknown;
  }>,
  mapSuccess: (data: TValue) => TSuccess,
  deps?: Pick<ComplaintActionDeps, "runWithRefresh" | "clearCookies">,
): Promise<({ readonly ok: true } & TSuccess) | ComplaintActionFailure> {
  const runWithRefresh = deps?.runWithRefresh ?? runWithServerActionRefresh;
  const clearCookies = deps?.clearCookies ?? clearServerSessionCookies;

  try {
    const result = await runWithRefresh(operation);

    if (!result.error && result.response.ok) {
      const data = result.data?.data;
      if (!data) {
        return {
          ...buildActionFailure(
            undefined,
            API_ERROR_CODES.INTERNAL_SERVER_ERROR,
            COMPLAINT_INSTANCE,
          ),
          sessionInvalidated: false,
        };
      }
      return { ok: true, ...mapSuccess(data) };
    }

    if (isTransientRefreshFailure(result)) {
      return {
        ...buildServiceUnavailableFailure(COMPLAINT_INSTANCE),
        sessionInvalidated: false,
      };
    }

    if (result.response.status === 401) {
      await clearCookies();
      return {
        ...buildActionFailure(
          result.error,
          API_ERROR_CODES.AUTH_TOKEN_INVALID_OR_EXPIRED,
          COMPLAINT_INSTANCE,
        ),
        sessionInvalidated: true,
      };
    }

    return {
      ...buildActionFailure(
        result.error,
        resolveStatusFallbackCode(result.response.status),
        COMPLAINT_INSTANCE,
      ),
      sessionInvalidated: false,
    };
  } catch {
    return {
      ...buildNetworkFailure(),
      sessionInvalidated: false,
    };
  }
}

/**
 * Executes `POST /api/v1/media/upload-signature` for the `complaints` folder,
 * issuing Cloudinary signed parameters used by the client for direct upload.
 */
export async function executeRequestComplaintUploadSignatureAction(
  input: ComplaintUploadSignatureInput,
  deps?: ComplaintActionDeps,
): Promise<ComplaintUploadSignatureActionResult> {
  const parsed = complaintUploadSignatureInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ...buildValidationFailure(
        parsed.error,
        API_ERROR_CODES.VALIDATION_FAILED,
        COMPLAINT_INSTANCE,
      ),
      sessionInvalidated: false,
    };
  }

  const postUploadSignature =
    deps?.postUploadSignature ??
    ((body) =>
      api.POST("/api/v1/media/upload-signature", {
        body: { ...body, folder: "complaints" },
      }));

  return runProtectedComplaintCall(
    () =>
      postUploadSignature({
        resourceType: parsed.data.resourceType,
        fileSizeBytes: parsed.data.fileSizeBytes,
        folder: "complaints",
      }),
    (signature) => ({ signature }),
    deps,
  );
}

/**
 * Executes `POST /api/v1/orders/:id/complaints` through the Storefront BFF with
 * single-flight token refresh (`ADR-0036`).
 */
export async function executeSubmitComplaintAction(
  input: ComplaintSubmissionInput,
  deps?: ComplaintActionDeps,
): Promise<SubmitComplaintActionResult> {
  const parsed = complaintSubmissionInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ...buildValidationFailure(
        parsed.error,
        API_ERROR_CODES.VALIDATION_FAILED,
        COMPLAINT_INSTANCE,
      ),
      sessionInvalidated: false,
    };
  }

  const { orderId, ...body } = parsed.data;
  const postComplaint =
    deps?.postComplaint ??
    ((id, payload) =>
      api.POST("/api/v1/orders/{id}/complaints", {
        params: { path: { id } },
        body: payload,
      }));

  return runProtectedComplaintCall(
    () => postComplaint(orderId, body),
    (complaint) => ({ complaint }),
    deps,
  );
}

/**
 * Next.js Server Action requesting a signed Cloudinary upload signature for proof media.
 */
export async function requestComplaintUploadSignatureAction(
  input: ComplaintUploadSignatureInput,
): Promise<ComplaintUploadSignatureActionResult> {
  return executeRequestComplaintUploadSignatureAction(input);
}

/**
 * Next.js Server Action submitting a post-delivery complaint for an owned order.
 */
export async function submitComplaintAction(
  input: ComplaintSubmissionInput,
): Promise<SubmitComplaintActionResult> {
  const result = await executeSubmitComplaintAction(input);
  if (result.ok) {
    revalidatePath(`/orders/${input.orderId}`);
    revalidatePath(`/orders/${input.orderId}/complaint`);
    revalidatePath("/account/orders");
  }
  return result;
}
