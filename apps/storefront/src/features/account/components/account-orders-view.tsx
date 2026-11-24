"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Skeleton, buttonVariants } from "@greenroots/ui";
import { OrderStatus } from "@greenroots/shared";
import { PackageOpen } from "lucide-react";
import { formatVnd, formatViDate } from "@/lib/format";
import {
  buildOrdersHref,
  type OrderHistoryStatusFilter,
} from "@/lib/orders/orders-query";
import type { OrderListMeta, StorefrontOrder } from "@/types/order.types";
import { OrderItemThumbnail } from "@/features/orders/components/order-item-thumbnail";
import { OrderStatusBadge } from "@/features/orders/components/order-status-badge";
import { AccountProfileDegradedCard } from "./account-profile-view";

const STATUS_FILTER_TABS: readonly {
  readonly status: OrderHistoryStatusFilter | null;
  readonly label: string;
}[] = [
  { status: null, label: "Tất cả" },
  { status: OrderStatus.PENDING_CONFIRMATION, label: "Chờ xác nhận" },
  { status: OrderStatus.SHIPPING, label: "Đang giao" },
  { status: OrderStatus.DELIVERED, label: "Đã giao" },
  { status: OrderStatus.CANCELLED, label: "Đã hủy" },
];

interface AccountOrdersViewProps {
  readonly orders: readonly StorefrontOrder[];
  readonly meta: OrderListMeta;
  readonly activeStatus?: OrderHistoryStatusFilter;
}

interface OrderStatusFilterTabsProps {
  readonly activeStatus?: OrderHistoryStatusFilter;
}

/**
 * URL-driven status filter tabs rendered as links so each selection re-runs the
 * server query with `?status=` and keeps browser back/forward behavior intact.
 */
function OrderStatusFilterTabs({ activeStatus }: OrderStatusFilterTabsProps) {
  return (
    <nav
      aria-label="Lọc đơn hàng theo trạng thái"
      className="flex gap-2 overflow-x-auto pb-1"
    >
      {STATUS_FILTER_TABS.map((tab) => {
        const isActive = tab.status === (activeStatus ?? null);
        return (
          <Link
            key={tab.label}
            href={buildOrdersHref({ status: tab.status })}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "shrink-0 rounded-full border border-brand-forest bg-brand-forest px-3.5 py-1.5 text-xs font-semibold text-white"
                : "shrink-0 rounded-full border border-border-subtle bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-600 hover:border-gray-300 hover:text-brand-dark"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

interface OrderCardProps {
  readonly order: StorefrontOrder;
}

/**
 * Compact order summary card linking to the immutable `/orders/[id]` detail view.
 */
function OrderCard({ order }: OrderCardProps) {
  return (
    <Link
      href={`/orders/${order.id}`}
      className="group flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-card p-4 transition-colors hover:border-brand-forest"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-sm font-bold text-gray-900 tabular-nums">
            {order.orderCode}
          </span>
          <span className="text-xs text-gray-500 tabular-nums">
            Đặt ngày {formatViDate(order.createdAt)}
          </span>
        </div>
        <OrderStatusBadge status={order.orderStatus} />
      </div>

      <div className="flex items-center gap-1.5">
        {order.items.slice(0, 3).map((item) => (
          <OrderItemThumbnail
            key={item.id}
            imageUrl={item.productImageUrl}
            alt={item.productName}
          />
        ))}
        <span className="ml-1 text-xs text-gray-600 tabular-nums">
          {order.items.length} sản phẩm
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-border-subtle pt-3">
        <span className="text-xs text-gray-600">Tổng tiền</span>
        <span className="text-sm font-bold text-brand-dark tabular-nums">
          {formatVnd(order.totalAmountVnd)}
        </span>
      </div>
    </Link>
  );
}

interface EmptyOrdersProps {
  readonly hasActiveFilter: boolean;
}

/**
 * Empty-state panel distinguishing "no orders yet" from "no orders for this filter".
 */
function EmptyOrders({ hasActiveFilter }: EmptyOrdersProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl bg-surface-warm px-6 py-12 text-center">
      <span
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-full bg-green-50 text-brand-dark"
      >
        <PackageOpen className="size-6" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-bold text-gray-900">
          {hasActiveFilter
            ? "Không có đơn hàng nào ở trạng thái này"
            : "Bạn chưa có đơn hàng nào"}
        </p>
        <p className="text-xs text-gray-500">
          {hasActiveFilter
            ? "Hãy thử chọn trạng thái khác hoặc xem tất cả đơn hàng."
            : "Đơn hàng sẽ xuất hiện tại đây sau khi bạn đặt hàng thành công."}
        </p>
      </div>
      <Link
        href={hasActiveFilter ? "/account/orders" : "/"}
        className={buttonVariants({
          variant: "outline",
          className: "mt-1 h-9 rounded-lg text-xs font-semibold",
        })}
      >
        {hasActiveFilter ? "Xem tất cả đơn hàng" : "Tiếp tục mua sắm"}
      </Link>
    </div>
  );
}

interface OrderPaginationProps {
  readonly meta: OrderListMeta;
  readonly activeStatus?: OrderHistoryStatusFilter;
}

/**
 * Previous/next page controls rendered as links so pagination stays server-driven.
 */
function OrderPagination({ meta, activeStatus }: OrderPaginationProps) {
  if (meta.totalPages <= 1) {
    return null;
  }

  const status = activeStatus ?? null;
  const prevHref = buildOrdersHref({ status, page: meta.page - 1 });
  const nextHref = buildOrdersHref({ status, page: meta.page + 1 });

  return (
    <nav
      aria-label="Phân trang đơn hàng"
      className="flex items-center justify-between gap-3 border-t border-border-subtle pt-4"
    >
      <span className="text-xs text-gray-600 tabular-nums">
        Trang {meta.page} / {meta.totalPages}
      </span>
      <div className="flex items-center gap-2">
        {meta.hasPrevPage ? (
          <Link
            href={prevHref}
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "h-8 text-xs font-semibold",
            })}
          >
            Trang trước
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className:
                "pointer-events-none h-8 text-xs font-semibold opacity-50",
            })}
          >
            Trang trước
          </span>
        )}
        {meta.hasNextPage ? (
          <Link
            href={nextHref}
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "h-8 text-xs font-semibold",
            })}
          >
            Trang sau
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className:
                "pointer-events-none h-8 text-xs font-semibold opacity-50",
            })}
          >
            Trang sau
          </span>
        )}
      </div>
    </nav>
  );
}

/**
 * Customer order history dashboard rendering filter tabs, order cards, and pagination
 * inside persistent `/account/layout.tsx` from server-fetched `GET /api/v1/orders/me` data.
 *
 * @param props Orders, pagination meta, and the currently active status filter.
 * @returns Order list with URL-driven status and pagination navigation.
 */
export function AccountOrdersView({
  orders,
  meta,
  activeStatus,
}: AccountOrdersViewProps) {
  return (
    <section aria-label="Danh sách đơn hàng" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline gap-2.5 border-b border-border-subtle pb-4">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
          Đơn hàng của tôi
        </h1>
        <Badge className="border-0 bg-green-100 text-brand-dark tabular-nums">
          {meta.total} đơn hàng
        </Badge>
      </div>

      <OrderStatusFilterTabs activeStatus={activeStatus} />

      {orders.length === 0 ? (
        <EmptyOrders hasActiveFilter={activeStatus !== undefined} />
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

      <OrderPagination meta={meta} activeStatus={activeStatus} />
    </section>
  );
}

/**
 * Degraded-mode recovery view preserving session cookies when order history SSR fails transiently.
 */
export function AccountOrdersDegradedView() {
  const router = useRouter();
  return (
    <AccountProfileDegradedCard
      title="Không thể tải đơn hàng lúc này"
      description="Kết nối tới máy chủ GreenRoots Farm đang tạm gián đoạn. Phiên đăng nhập của bạn vẫn được giữ nguyên — vui lòng thử tải lại sau ít giây."
      onRetry={() => router.refresh()}
    />
  );
}

/**
 * Streaming skeleton rendered inside `<Suspense>` while `/account/orders` resolves session & orders.
 */
export function AccountOrdersSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <Skeleton className="h-8 w-48 rounded-full" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}
