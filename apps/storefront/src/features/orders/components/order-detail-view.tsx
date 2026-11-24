"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Skeleton, buttonVariants } from "@greenroots/ui";
import {
  OrderStatus,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@greenroots/shared";
import { Check, MapPin, ShieldAlert, Truck } from "lucide-react";
import { FARM_METADATA } from "@/constants/farm-metadata.constant";
import { formatVnd, formatViDate, roundQuantity } from "@/lib/format";
import { buildOrderTimeline } from "@/lib/orders/order-status";
import type { StorefrontOrder, StorefrontOrderItem } from "@/types/order.types";
import { AccountProfileDegradedCard } from "@/features/account/components/account-profile-view";
import { OrderItemThumbnail } from "./order-item-thumbnail";
import { OrderStatusBadge } from "./order-status-badge";

interface OrderDetailViewProps {
  readonly order: StorefrontOrder;
}

/**
 * Notification row shown instead of the progression timeline for cancelled orders.
 */
function CancelledNotice() {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-warm p-4">
      <ShieldAlert
        className="size-4 shrink-0 text-status-spoiled"
        aria-hidden="true"
      />
      <div>
        <p className="text-sm font-semibold text-gray-900">
          Đơn hàng đã bị hủy
        </p>
        <p className="text-xs text-gray-500">
          Đơn hàng này không còn trong tiến trình giao hàng.
        </p>
      </div>
    </div>
  );
}

/**
 * Vertical status timeline derived from the current order status and the 7-state progression.
 */
function OrderStatusTimeline({ order }: { readonly order: StorefrontOrder }) {
  const steps = buildOrderTimeline(order.orderStatus);
  if (steps.length === 0) {
    return <CancelledNotice />;
  }

  return (
    <ol className="flex flex-col">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const isCurrent = step.state === "current";
        const isDone = step.state === "done";

        return (
          <li key={step.status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                aria-hidden="true"
                className={
                  isDone || isCurrent
                    ? "flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-forest text-white"
                    : "size-6 shrink-0 rounded-full border-2 border-border-subtle bg-white"
                }
              >
                {isDone ? <Check className="size-3.5" /> : null}
                {isCurrent ? (
                  <span className="size-2 rounded-full bg-white" />
                ) : null}
              </span>
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className="w-px flex-1 bg-border-subtle"
                />
              ) : null}
            </div>
            <div className={isLast ? "pb-0" : "pb-5"}>
              <span
                className={
                  isCurrent
                    ? "text-sm font-bold text-brand-dark"
                    : isDone
                      ? "text-sm font-medium text-gray-700"
                      : "text-sm text-gray-400"
                }
              >
                {ORDER_STATUS_LABELS[step.status]}
              </span>
              {isCurrent ? (
                <span className="ml-2 text-xs font-semibold text-brand-forest">
                  Trạng thái hiện tại
                </span>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

interface OrderLineItemProps {
  readonly item: StorefrontOrderItem;
}

/**
 * Immutable line-item row rendering the historical product name, unit, quantity, and totals.
 */
function OrderLineItem({ item }: OrderLineItemProps) {
  return (
    <li className="flex items-center gap-3 py-3">
      <Link
        href={`/products/${item.productSlug}`}
        className="shrink-0 rounded-lg focus-visible:ring-2 focus-visible:ring-brand-forest focus-visible:outline-none"
      >
        <OrderItemThumbnail
          imageUrl={item.productImageUrl}
          alt={item.productName}
          size="md"
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-semibold text-gray-900">
          {item.productName}
        </span>
        <span className="text-xs text-gray-500 tabular-nums">
          {roundQuantity(item.quantity)} {item.unit} ×{" "}
          {formatVnd(item.unitPriceVnd)}
        </span>
      </div>
      <span className="shrink-0 text-sm font-semibold text-gray-900 tabular-nums">
        {formatVnd(item.lineTotalVnd)}
      </span>
    </li>
  );
}

interface OrderSummaryRowProps {
  readonly label: string;
  readonly value: string;
  readonly emphasized?: boolean;
}

/**
 * Plain key-value totals row following the flat surface hierarchy (no nested sub-box).
 */
function OrderSummaryRow({
  label,
  value,
  emphasized = false,
}: OrderSummaryRowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={
          emphasized
            ? "text-sm font-bold text-gray-900"
            : "text-xs text-gray-600"
        }
      >
        {label}
      </span>
      <span
        className={
          emphasized
            ? "text-base font-bold text-brand-dark tabular-nums"
            : "text-sm font-semibold text-gray-900 tabular-nums"
        }
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Customer order detail view rendering the status timeline, immutable address snapshot,
 * historical line items, totals, and the 24h complaint entry point when `DELIVERED`.
 *
 * @param props Server-fetched owned `StorefrontOrder`.
 * @returns Order detail sections using semantic GreenRoots design tokens.
 */
export function OrderDetailView({ order }: OrderDetailViewProps) {
  const isDelivered = order.orderStatus === OrderStatus.DELIVERED;
  const hasDiscount = order.discountAmountVnd > 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 lg:px-6">
      <div className="flex flex-col gap-3 border-b border-border-subtle pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-xl font-bold text-gray-900">
              Chi tiết đơn hàng
            </h1>
            <span className="text-sm font-bold text-gray-900 tabular-nums">
              {order.orderCode}
            </span>
            <span className="text-xs text-gray-500 tabular-nums">
              Đặt ngày {formatViDate(order.createdAt)}
            </span>
          </div>
          <OrderStatusBadge status={order.orderStatus} />
        </div>
      </div>

      <section aria-label="Tiến trình đơn hàng" className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-gray-900">
          Tiến trình giao hàng
        </h2>
        <OrderStatusTimeline order={order} />
      </section>

      <section
        aria-label="Thông tin nhận hàng"
        className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-card p-4"
      >
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
          <MapPin className="size-4 text-brand-forest" aria-hidden="true" />
          Thông tin nhận hàng
        </h2>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-gray-900">
            {order.receiverName}
          </span>
          <span className="text-xs text-gray-500 tabular-nums">
            {order.receiverPhone}
          </span>
          <span className="text-sm text-gray-700">{order.shippingAddress}</span>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border-subtle pt-3">
          <span className="flex items-center gap-1.5 text-xs text-gray-600">
            <Truck className="size-4 text-brand-forest" aria-hidden="true" />
            Phương thức thanh toán
          </span>
          <span className="text-xs font-semibold text-gray-900">
            {PAYMENT_METHOD_LABELS[order.paymentMethod]}
          </span>
        </div>
      </section>

      <section aria-label="Sản phẩm đã đặt" className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-gray-900">
          Sản phẩm ({order.items.length})
        </h2>
        <ul className="divide-y divide-border-subtle border-b border-border-subtle">
          {order.items.map((item) => (
            <OrderLineItem key={item.id} item={item} />
          ))}
        </ul>
      </section>

      <section
        aria-label="Tổng tiền"
        className="flex flex-col gap-2.5 rounded-xl border border-border-subtle bg-surface-card p-4"
      >
        <OrderSummaryRow
          label="Tạm tính"
          value={formatVnd(order.subtotalVnd)}
        />
        {hasDiscount ? (
          <OrderSummaryRow
            label="Giảm giá điểm tích lũy"
            value={`-${formatVnd(order.discountAmountVnd)}`}
          />
        ) : null}
        <OrderSummaryRow
          label="Phí giao hàng"
          value={formatVnd(order.shippingFeeVnd)}
        />
        <div className="border-t border-border-subtle pt-2.5">
          <OrderSummaryRow
            label="Tổng cộng"
            value={formatVnd(order.totalAmountVnd)}
            emphasized
          />
        </div>
      </section>

      {isDelivered ? (
        <section
          aria-label="Khiếu nại đơn hàng"
          className="flex flex-col gap-2"
        >
          <p className="text-xs text-gray-600">
            Nông sản bị dập nát khi nhận? Bạn có{" "}
            {FARM_METADATA.complaintWindowHours}h kể từ lúc nhận hàng để gửi
            khiếu nại kèm hình ảnh bằng chứng.
          </p>
          <Link
            href={`/orders/${order.id}/complaint`}
            className={buttonVariants({
              variant: "outline",
              className: "h-9 w-fit gap-1.5 rounded-lg text-xs font-semibold",
            })}
          >
            <ShieldAlert className="size-4" aria-hidden="true" />
            Gửi khiếu nại
          </Link>
        </section>
      ) : null}
    </div>
  );
}

/**
 * Degraded-mode recovery view preserving session cookies when order detail SSR fails transiently.
 */
export function OrderDetailDegradedView() {
  const router = useRouter();
  return (
    <AccountProfileDegradedCard
      title="Không thể tải chi tiết đơn hàng lúc này"
      description="Kết nối tới máy chủ GreenRoots Farm đang tạm gián đoạn. Phiên đăng nhập của bạn vẫn được giữ nguyên — vui lòng thử tải lại sau ít giây."
      onRetry={() => router.refresh()}
    />
  );
}

/**
 * Streaming skeleton rendered inside `<Suspense>` while `/orders/[id]` resolves session & order.
 */
export function OrderDetailSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 lg:px-6"
    >
      <Skeleton className="h-20 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  );
}
