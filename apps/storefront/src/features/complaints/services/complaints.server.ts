import { api } from "@/lib/api-client";
import { runWithServerActionRefresh } from "@/features/auth/services/session.server";
import type { OrderDto } from "@/features/orders/schemas/order.schema";
import {
  resolveCustomerOrderDetailSession,
  type OrdersServerDeps,
} from "@/features/orders/services/orders.server";
import type { ComplaintDto } from "../schemas/complaint.schema";

/**
 * Discriminated SSR outcome for `/orders/[id]/complaint` (`SF-05`).
 */
export type CustomerComplaintSessionResolution =
  | {
      readonly status: "authenticated";
      readonly order: OrderDto;
      readonly complaints: readonly ComplaintDto[];
    }
  | { readonly status: "unauthenticated" }
  | { readonly status: "forbidden" }
  | { readonly status: "not_found" }
  | { readonly status: "degraded" };

/**
 * Optional dependency overrides for isolated unit testing of the complaint SSR resolver.
 */
export interface ComplaintsServerDeps extends OrdersServerDeps {
  readonly fetchComplaints?: (id: string) => Promise<{
    response: Response;
    data?: { data: ComplaintDto[] };
    error?: unknown;
  }>;
}

async function fetchOrderComplaintsResponse(
  orderId: string,
  deps?: Pick<ComplaintsServerDeps, "runWithRefresh" | "fetchComplaints">,
) {
  const runWithRefresh = deps?.runWithRefresh ?? runWithServerActionRefresh;
  const fetchComplaints =
    deps?.fetchComplaints ??
    ((id: string) =>
      api.GET("/api/v1/orders/{id}/complaints", {
        params: { path: { id } },
        cache: "no-store",
      }));

  return runWithRefresh(() => fetchComplaints(orderId));
}

/**
 * Checks whether the authenticated customer already submitted a complaint for an order.
 * Degrades cleanly to `false` when the lookup is unavailable so `/orders/[id]` still renders.
 *
 * @param orderId Order UUIDv7 identifier.
 * @param deps Optional dependency overrides for unit testing.
 * @returns `true` if at least one complaint exists for the order.
 */
export async function hasCustomerOrderComplaint(
  orderId: string,
  deps?: Pick<ComplaintsServerDeps, "runWithRefresh" | "fetchComplaints">,
): Promise<boolean> {
  try {
    const result = await fetchOrderComplaintsResponse(orderId, deps);
    if (!result.error && result.response.ok && result.data) {
      return result.data.data.length > 0;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Resolves the owned order plus its complaints for `/orders/[id]/complaint`.
 * Reuses the order detail gate so ownership, UUID validation, and auth states stay consistent,
 * then reads the complaint list (an empty array when none exist).
 *
 * @param orderId Route `[id]` parameter.
 * @param deps Optional dependency overrides for unit testing.
 * @returns Discriminated SSR outcome separating `404`, `401`, `403`, and `5xx` degradation.
 */
export async function resolveCustomerComplaintSession(
  orderId: string,
  deps?: ComplaintsServerDeps,
): Promise<CustomerComplaintSessionResolution> {
  try {
    const orderResolution = await resolveCustomerOrderDetailSession(
      orderId,
      deps,
    );
    if (orderResolution.status !== "authenticated") {
      return orderResolution;
    }

    const result = await fetchOrderComplaintsResponse(orderId, deps);

    if (!result.error && result.response.ok && result.data) {
      return {
        status: "authenticated",
        order: orderResolution.order,
        complaints: result.data.data,
      };
    }

    if (result.response.status === 401) {
      return { status: "unauthenticated" };
    }
    if (result.response.status === 403) {
      return { status: "forbidden" };
    }
    if (result.response.status === 400 || result.response.status === 404) {
      return { status: "not_found" };
    }
    return { status: "degraded" };
  } catch {
    return { status: "degraded" };
  }
}
