import { BUSINESS_RULES, OrderStatus } from "@greenroots/shared";

const COMPLAINT_WINDOW_MS =
  BUSINESS_RULES.COMPLAINT_WINDOW_HOURS * 60 * 60 * 1000;

/** Complaint submission eligibility state for a given order. */
export type ComplaintWindowState = "open" | "expired" | "not_eligible";

/**
 * Computes the absolute 24-hour complaint deadline in epoch milliseconds from `deliveredAt`.
 *
 * @param deliveredAt Order delivery ISO timestamp, or `null` when not yet delivered.
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
  return deliveredMs + COMPLAINT_WINDOW_MS;
}

/**
 * Derives the complaint window state, mirroring the backend `INV-CMP-2` eligibility rules:
 * the order must be `DELIVERED`/`COMPLETED`, carry a non-null `deliveredAt`, and stay within 24h.
 *
 * @param orderStatus Current order lifecycle status.
 * @param deliveredAt Order delivery ISO timestamp, or `null`.
 * @param nowMs Reference current timestamp in epoch milliseconds.
 * @returns Whether the 24h complaint window is open, expired, or ineligible.
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
