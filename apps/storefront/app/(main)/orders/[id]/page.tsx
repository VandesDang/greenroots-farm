import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  OrderDetailDegradedView,
  OrderDetailSkeleton,
  OrderDetailView,
} from "@/features/orders/components/order-detail-view";
import { getOrderDetail } from "@/lib/orders/orders.server";

export const metadata: Metadata = {
  title: "Chi tiết đơn hàng",
  description:
    "Theo dõi trạng thái, thông tin nhận hàng và tổng tiền của đơn hàng GreenRoots Farm.",
};

interface OrderDetailPageProps {
  readonly params: Promise<{ id: string }>;
}

async function OrderDetailGate({ params }: OrderDetailPageProps) {
  // Force per-request dynamic execution before uncached session/API reads under cacheComponents.
  await connection();
  const { id } = await params;
  const resolution = await getOrderDetail(id);

  if (resolution.status === "unauthenticated") {
    redirect(`/login?redirect=%2Forders%2F${id}`);
  }

  if (resolution.status === "not_found") {
    notFound();
  }

  if (resolution.status === "degraded") {
    return <OrderDetailDegradedView />;
  }

  return <OrderDetailView order={resolution.order} />;
}

/**
 * Immutable customer order detail route (`/orders/[id]`).
 */
export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  return (
    <Suspense fallback={<OrderDetailSkeleton />}>
      <OrderDetailGate params={params} />
    </Suspense>
  );
}
