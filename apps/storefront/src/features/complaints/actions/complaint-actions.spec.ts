import { describe, expect, it } from "bun:test";
import type {
  ComplaintDto,
  SignedUploadResponseDto,
} from "../schemas/complaint.schema";
import {
  executeRequestComplaintUploadSignatureAction,
  executeSubmitComplaintAction,
} from "./complaint-actions";

const orderId = "019fa8bc-8f4d-7000-b366-e691f45cfb91";

const signature: SignedUploadResponseDto = {
  signature: "abc123",
  timestamp: 1731744000,
  apiKey: "1234567890",
  cloudName: "greenroots-dev",
  folder: "complaints",
  resourceType: "image",
  maxBytes: 5 * 1024 * 1024,
};

const complaint: ComplaintDto = {
  id: "019fa8bc-8f4d-7000-b366-e691f45cfb92",
  orderId,
  customerId: "019fa8bc-8f4d-7000-b366-e691f45cfb93",
  reason: "Rau bị dập nát khi giao hàng",
  proofImageUrls: [
    "https://res.cloudinary.com/demo/image/upload/v1/complaints/a.webp",
  ],
  proofVideoUrl: null,
  status: "pending",
  resolution: null,
  createdAt: "2026-11-25T09:00:00.000Z",
  updatedAt: "2026-11-25T09:00:00.000Z",
};

const passthroughRefresh = async <T>(
  operation: () => Promise<T>,
): Promise<T & { refreshOutcome: "not-needed" }> => ({
  ...(await operation()),
  refreshOutcome: "not-needed",
});

describe("complaint Server Actions", () => {
  describe("executeRequestComplaintUploadSignatureAction", () => {
    it("returns signed upload parameters for the complaints folder", async () => {
      let capturedBody: Record<string, unknown> | undefined;
      const res = await executeRequestComplaintUploadSignatureAction(
        { resourceType: "image", fileSizeBytes: 64 },
        {
          runWithRefresh: passthroughRefresh as never,
          postUploadSignature: (body) => {
            capturedBody = body;
            return Promise.resolve({
              response: new Response(null, { status: 200 }),
              data: { data: signature },
            });
          },
        },
      );

      expect(capturedBody).toEqual({
        resourceType: "image",
        fileSizeBytes: 64,
        folder: "complaints",
      });
      expect(res).toEqual({ ok: true, signature });
    });

    it("returns a validation failure for malformed input", async () => {
      const res = await executeRequestComplaintUploadSignatureAction(
        { resourceType: "document" as "image", fileSizeBytes: -1 },
        {},
      );
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.sessionInvalidated).toBe(false);
      }
    });
  });

  describe("executeSubmitComplaintAction", () => {
    const input = {
      orderId,
      reason: "Rau bị dập nát khi giao hàng",
      proofImageUrls: [
        "https://res.cloudinary.com/demo/image/upload/v1/complaints/a.webp",
      ],
    };

    it("posts the complaint and returns the persisted projection", async () => {
      let capturedBody: Record<string, unknown> | undefined;
      const res = await executeSubmitComplaintAction(input, {
        runWithRefresh: passthroughRefresh as never,
        postComplaint: (id, body) => {
          capturedBody = body;
          expect(id).toBe(orderId);
          return Promise.resolve({
            response: new Response(null, { status: 201 }),
            data: { data: complaint },
          });
        },
      });

      expect(capturedBody).toEqual({
        reason: input.reason,
        proofImageUrls: input.proofImageUrls,
      });
      expect(res).toEqual({ ok: true, complaint });
    });

    it("maps a 409 duplicate to the shared complaint conflict code", async () => {
      const res = await executeSubmitComplaintAction(input, {
        runWithRefresh: passthroughRefresh as never,
        postComplaint: () =>
          Promise.resolve({
            response: new Response(null, { status: 409 }),
            error: {
              status: 409,
              code: "ORDER_COMPLAINT_ALREADY_EXISTS",
              detail: "duplicate",
            },
          }),
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("ORDER_COMPLAINT_ALREADY_EXISTS");
        expect(res.sessionInvalidated).toBe(false);
      }
    });
  });
});
