import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import {
  AccountOrdersDegradedView,
  AccountOrdersSkeleton,
  AccountOrdersView,
} from "@/features/account/components/account-orders-view";
import { getAccountOrders } from "@/lib/orders/orders.server";
import { buildOrdersQuery } from "@/lib/orders/orders-query";

export const metadata: Metadata = {
  title: "Đơn hàng của tôi",
  description:
    "Xem lịch sử đơn hàng, theo dõi trạng thái giao hàng và chi tiết từng đơn tại GreenRoots Farm.",
};

interface AccountOrdersPageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function AccountOrdersGate({ searchParams }: AccountOrdersPageProps) {
  // Force per-request dynamic execution before uncached session/API reads under cacheComponents.
  await connection();
  const query = buildOrdersQuery(await searchParams);
  const resolution = await getAccountOrders(query);

  if (resolution.status === "unauthenticated") {
    redirect("/login?redirect=%2Faccount%2Forders");
  }

  if (resolution.status === "degraded") {
    return <AccountOrdersDegradedView />;
  }

  return (
    <AccountOrdersView
      orders={resolution.orders}
      meta={resolution.meta}
      activeStatus={query.status}
    />
  );
}

/**
 * Authenticated customer order history route (`/account/orders`).
 */
export default function AccountOrdersPage({
  searchParams,
}: AccountOrdersPageProps) {
  return (
    <Suspense fallback={<AccountOrdersSkeleton />}>
      <AccountOrdersGate searchParams={searchParams} />
    </Suspense>
  );
}
