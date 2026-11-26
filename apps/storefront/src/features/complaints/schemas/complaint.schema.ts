import { BUSINESS_RULES } from "@greenroots/shared";
import { z } from "zod";
import type { components } from "@/types/api-schema";

/** Customer-facing complaint projection mirroring the API `ComplaintDto`. */
export type ComplaintDto = components["schemas"]["ComplaintDto"];

/** Signed Cloudinary upload parameters returned by `POST /api/v1/media/upload-signature`. */
export type SignedUploadResponseDto =
  components["schemas"]["SignedUploadResponseDto"];

/** Request payload accepted by `POST /api/v1/orders/:id/complaints`. */
export type CreateComplaintDto = components["schemas"]["CreateComplaintDto"];

/** Complaint reason bounds mirroring the API `CreateComplaintDto` (10..2000 chars). */
export const COMPLAINT_REASON_MIN_LENGTH = 10;
export const COMPLAINT_REASON_MAX_LENGTH = 2000;

/**
 * Validated payload for the signed Cloudinary upload signature Server Action.
 */
export const complaintUploadSignatureInputSchema = z
  .object({
    resourceType: z.enum(["image", "video"]),
    fileSizeBytes: z.number().int().positive(),
  })
  .strict();

export type ComplaintUploadSignatureInput = z.infer<
  typeof complaintUploadSignatureInputSchema
>;

/**
 * Validated payload for the complaint submission Server Action, mirroring the API DTO
 * so the BFF rejects malformed client input before it reaches the backend.
 */
export const complaintSubmissionInputSchema = z
  .object({
    orderId: z.uuid("Mã đơn hàng không hợp lệ."),
    reason: z
      .string()
      .trim()
      .min(
        COMPLAINT_REASON_MIN_LENGTH,
        "Vui lòng nhập lý do khiếu nại chi tiết hơn.",
      )
      .max(COMPLAINT_REASON_MAX_LENGTH, "Lý do khiếu nại quá dài."),
    proofImageUrls: z
      .array(z.url("Đường dẫn ảnh không hợp lệ."))
      .min(BUSINESS_RULES.COMPLAINT_MIN_IMAGES, "Cần ít nhất 1 ảnh bằng chứng.")
      .max(BUSINESS_RULES.COMPLAINT_MAX_IMAGES, "Tối đa 5 ảnh bằng chứng."),
    proofVideoUrl: z.url("Đường dẫn video không hợp lệ.").nullable().optional(),
  })
  .strict();

export type ComplaintSubmissionInput = z.infer<
  typeof complaintSubmissionInputSchema
>;
