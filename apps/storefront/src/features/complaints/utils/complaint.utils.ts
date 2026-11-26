import {
  BUSINESS_RULES,
  ComplaintStatus,
  OrderStatus,
} from "@greenroots/shared";
import type { ComplaintDto } from "../schemas/complaint.schema";
import {
  COMPLAINT_IMAGE_MAX_BYTES,
  COMPLAINT_VIDEO_MAX_BYTES,
} from "../constants/complaint-constants";

const WINDOW_MS = BUSINESS_RULES.COMPLAINT_WINDOW_HOURS * 60 * 60 * 1000;

/**
 * Builds the single `reason` string submitted to the API by folding the preset/custom reason,
 * affected item names, and free-form description together. Backend `reason` is the only
 * free-text complaint field, so client composition keeps the API contract intact.
 *
 * @returns A trimmed, `<= 2000`-character reason string.
 */
export function buildComplaintReason(input: {
  readonly reasonText: string;
  readonly affectedItemNames: readonly string[];
  readonly description: string;
}): string {
  const segments: string[] = [input.reasonText.trim()];

  const affected = input.affectedItemNames
    .map((name) => name.trim())
    .filter(Boolean);
  if (affected.length > 0) {
    segments.push(`Sản phẩm gặp sự cố: ${affected.join(", ")}`);
  }

  const description = input.description.trim();
  if (description) {
    segments.push(`Mô tả chi tiết: ${description}`);
  }

  const reason = segments.join(". ");
  return reason.length > 2000 ? reason.slice(0, 2000) : reason;
}

/**
 * Computes the absolute 24-hour complaint deadline in epoch milliseconds from `deliveredAt`.
 *
 * @returns Epoch ms of the deadline, or `null` when `deliveredAt` is missing/invalid.
 */
export function resolveComplaintDeadline(
  deliveredAt: string | null,
): number | null {
  if (!deliveredAt) {
    return null;
  }
  const deliveredMs = new Date(deliveredAt).getTime();
  if (Number.isNaN(deliveredMs)) {
    return null;
  }
  return deliveredMs + WINDOW_MS;
}

/** Complaint submission eligibility state for a given order. */
export type ComplaintWindowState = "open" | "expired" | "not_eligible";

/**
 * Derives the complaint window state, mirroring the backend `INV-CMP-2` eligibility rules:
 * the order must be `DELIVERED`/`COMPLETED`, carry a non-null `deliveredAt`, and stay within 24h.
 */
export function resolveComplaintWindowState(
  orderStatus: OrderStatus,
  deliveredAt: string | null,
  nowMs: number,
): ComplaintWindowState {
  if (
    orderStatus !== OrderStatus.DELIVERED &&
    orderStatus !== OrderStatus.COMPLETED
  ) {
    return "not_eligible";
  }
  const deadline = resolveComplaintDeadline(deliveredAt);
  if (deadline === null) {
    return "not_eligible";
  }
  return nowMs > deadline ? "expired" : "open";
}

/**
 * Formats remaining milliseconds into a zero-padded `HH:MM:SS` countdown string.
 */
export function formatComplaintCountdown(remainingMs: number): string {
  const clamped = Math.max(0, remainingMs);
  const totalSeconds = Math.floor(clamped / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((unit) => String(unit).padStart(2, "0"))
    .join(":");
}

/** Allowed proof image MIME types (JPEG/PNG/WebP). */
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Allowed proof video MIME types (MP4/QuickTime/WebM). */
const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

/**
 * Client-side image validation (type + size). Cloudinary re-verifies metadata server-side.
 *
 * @returns A Vietnamese error message, or `null` when the file is acceptable.
 */
export function validateComplaintImage(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.";
  }
  if (file.size > COMPLAINT_IMAGE_MAX_BYTES) {
    return "Mỗi ảnh tối đa 5MB.";
  }
  return null;
}

/**
 * Client-side video validation (type + size). Duration is validated separately once metadata loads.
 *
 * @returns A Vietnamese error message, or `null` when the file is acceptable.
 */
export function validateComplaintVideo(file: File): string | null {
  if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
    return "Chỉ chấp nhận video MP4, MOV hoặc WebM.";
  }
  if (file.size > COMPLAINT_VIDEO_MAX_BYTES) {
    return "Video vượt quá dung lượng 15MB.";
  }
  return null;
}

/**
 * Validates a parsed video duration in seconds against the `<= 15s` ceiling.
 */
export function isComplaintVideoDurationValid(
  durationSeconds: number,
): boolean {
  return (
    Number.isFinite(durationSeconds) &&
    durationSeconds > 0 &&
    durationSeconds <= BUSINESS_RULES.COMPLAINT_VIDEO_MAX_SECONDS
  );
}

/** Processing state for a single complaint status timeline step. */
export type ComplaintStepState = "completed" | "current" | "upcoming";

/** A single honest processing step derived from real complaint fields. */
export interface ComplaintTimelineStep {
  readonly key: string;
  readonly label: string;
  readonly state: ComplaintStepState;
  readonly timestamp: string | null;
  readonly note: string | null;
}

/**
 * Maps a complaint's real `status`, `resolution`, `createdAt`, and `updatedAt` into a
 * customer timeline without fabricating intermediate timestamps.
 */
export function buildComplaintTimeline(
  complaint: ComplaintDto,
): ComplaintTimelineStep[] {
  const resolved = complaint.status !== ComplaintStatus.PENDING;

  return [
    {
      key: "received",
      label: "Đã tiếp nhận khiếu nại",
      state: "completed",
      timestamp: complaint.createdAt,
      note: null,
    },
    {
      key: "reviewing",
      label: "Kiểm tra hình ảnh & lô hàng",
      state: resolved ? "completed" : "current",
      timestamp: resolved ? complaint.updatedAt : null,
      note: resolved ? null : "Đang xử lý (phản hồi trong 2h)",
    },
    {
      key: "result",
      label: "Kết quả xử lý",
      state: resolved ? "completed" : "upcoming",
      timestamp: resolved ? complaint.updatedAt : null,
      note: resolved ? null : "Chờ xác nhận",
    },
  ];
}
