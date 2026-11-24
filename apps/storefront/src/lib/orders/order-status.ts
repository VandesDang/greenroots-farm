import { OrderStatus } from "@greenroots/shared";

/**
 * Semantic visual tone derived from an `OrderStatus` for badge and timeline styling.
 */
export type OrderStatusTone =
  | "pending"
  | "active"
  | "success"
  | "completed"
  | "cancelled";

const ORDER_STATUS_TONES: Record<OrderStatus, OrderStatusTone> = {
  [OrderStatus.PENDING_PAYMENT]: "pending",
  [OrderStatus.PENDING_CONFIRMATION]: "pending",
  [OrderStatus.CONFIRMED]: "active",
  [OrderStatus.PACKING]: "active",
  [OrderStatus.SHIPPING]: "active",
  [OrderStatus.DELIVERED]: "success",
  [OrderStatus.COMPLETED]: "completed",
  [OrderStatus.CANCELLED]: "cancelled",
};

/**
 * Maps an `OrderStatus` to its semantic display tone.
 *
 * @param status Persisted order status.
 * @returns Tone driving badge color and timeline emphasis.
 */
export function getOrderStatusTone(status: OrderStatus): OrderStatusTone {
  return ORDER_STATUS_TONES[status];
}

/**
 * Position of a step in the visual order timeline relative to the current status.
 */
export type OrderTimelineState = "done" | "current" | "upcoming";

/**
 * A single step in the derived order status timeline.
 */
export interface OrderTimelineStep {
  readonly status: OrderStatus;
  readonly state: OrderTimelineState;
}

const ORDER_TIMELINE_PROGRESSION: readonly OrderStatus[] = [
  OrderStatus.PENDING_PAYMENT,
  OrderStatus.PENDING_CONFIRMATION,
  OrderStatus.CONFIRMED,
  OrderStatus.PACKING,
  OrderStatus.SHIPPING,
  OrderStatus.DELIVERED,
  OrderStatus.COMPLETED,
];

/**
 * Builds the derived status progression shown on `/orders/[id]`, marking steps before the
 * current status as `done`, the current status as `current`, and the remainder as `upcoming`.
 *
 * A cancelled order has no meaningful progression and yields an empty timeline.
 *
 * @param currentStatus Persisted order status.
 * @returns Ordered timeline steps, or an empty list for cancelled orders.
 */
export function buildOrderTimeline(
  currentStatus: OrderStatus,
): readonly OrderTimelineStep[] {
  const currentIndex = ORDER_TIMELINE_PROGRESSION.indexOf(currentStatus);
  if (currentIndex < 0) {
    return [];
  }
  return ORDER_TIMELINE_PROGRESSION.map((status, index) => ({
    status,
    state:
      index < currentIndex
        ? "done"
        : index === currentIndex
          ? "current"
          : "upcoming",
  }));
}
