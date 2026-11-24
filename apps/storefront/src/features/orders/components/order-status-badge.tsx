import { Badge } from "@greenroots/ui";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@greenroots/shared";
import {
  getOrderStatusTone,
  type OrderStatusTone,
} from "@/lib/orders/order-status";

const ORDER_STATUS_TONE_BADGE_CLASSES: Record<OrderStatusTone, string> = {
  pending: "border-0 bg-amber-100 text-amber-800",
  active: "border-0 bg-green-100 text-brand-dark",
  success: "border-0 bg-green-100 text-brand-dark",
  completed: "border-0 bg-gray-100 text-gray-700",
  cancelled: "border-0 bg-red-50 text-status-spoiled",
};

interface OrderStatusBadgeProps {
  readonly status: OrderStatus;
}

/**
 * Semantic status badge derived from the shared `OrderStatus` label and tone mapping,
 * reused across the account order list and the order detail timeline.
 *
 * @param props Persisted order status.
 * @returns Accessible status badge using semantic GreenRoots design tokens.
 */
export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  return (
    <Badge
      className={ORDER_STATUS_TONE_BADGE_CLASSES[getOrderStatusTone(status)]}
    >
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
