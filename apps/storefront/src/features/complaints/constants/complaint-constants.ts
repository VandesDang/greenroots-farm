import { ComplaintResolution, ComplaintStatus } from "@greenroots/shared";

/** Complaint reason bounds mirroring the API `CreateComplaintDto` (10..2000 chars). */
export const COMPLAINT_REASON_MIN_LENGTH = 10;
export const COMPLAINT_REASON_MAX_LENGTH = 2000;

/** Per-file byte ceilings for client-side pre-validation (Cloudinary re-verifies server-side). */
export const COMPLAINT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const COMPLAINT_VIDEO_MAX_BYTES = 15 * 1024 * 1024;

/** Description textarea character ceiling matching the SF-05 design (`500 ký tự`). */
export const COMPLAINT_DESCRIPTION_MAX_LENGTH = 500;

/** Preset complaint reason choices rendered as radio cards (`khi_u_n_i_n_h_ng.html`). */
export const COMPLAINT_REASON_OPTIONS = [
  { value: "damaged", label: "Sản phẩm dập nát / héo úa" },
  { value: "missing", label: "Giao thiếu sản phẩm" },
  { value: "wrong", label: "Giao nhầm sản phẩm" },
  { value: "not_fresh", label: "Không đạt độ tươi cam kết" },
  { value: "other", label: "Khác" },
] as const;

/** Discriminated preset reason key. */
export type ComplaintReasonType =
  (typeof COMPLAINT_REASON_OPTIONS)[number]["value"];

/** Resolves the customer-facing label for a preset reason key. */
export function resolveComplaintReasonLabel(type: ComplaintReasonType): string {
  return (
    COMPLAINT_REASON_OPTIONS.find((option) => option.value === type)?.label ??
    COMPLAINT_REASON_OPTIONS[0].label
  );
}

/** Customer-facing Vietnamese labels for complaint processing status. */
export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  [ComplaintStatus.PENDING]: "Đang kiểm tra",
  [ComplaintStatus.APPROVED]: "Đã chấp thuận",
  [ComplaintStatus.REJECTED]: "Đã từ chối",
};

/** Customer-facing Vietnamese labels for approved complaint resolutions. */
export const COMPLAINT_RESOLUTION_LABELS: Record<ComplaintResolution, string> =
  {
    [ComplaintResolution.REFUND]: "Hoàn tiền",
    [ComplaintResolution.REPLACEMENT]: "Giao bù",
  };
