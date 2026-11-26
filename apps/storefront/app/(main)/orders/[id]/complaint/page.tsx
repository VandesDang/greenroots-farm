import type { Metadata } from "next";
import { forbidden, notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Skeleton } from "@greenroots/ui";
import {
  ComplaintDegradedView,
  ComplaintView,
} from "@/features/complaints/components/complaint-view";
import { resolveCustomerComplaintSession } from "@/features/complaints/services/complaints.server";

export const metadata: Metadata = {
  title: "Khiếu nại đơn hàng",
  description:
    "Gửi khiếu nại đơn hàng GreenRoots Farm trong 24 giờ sau khi nhận hàng kèm ảnh/video bằng chứng.",
};

interface OrderComplaintPageProps {
  readonly params: Promise<{ readonly id: string }>;
}

async function OrderComplaintGate({ params }: OrderComplaintPageProps) {
  // Force per-request dynamic execution before uncached params/session reads under cacheComponents.
  await connection();
  const { id } = await params;

  const resolution = await resolveCustomerComplaintSession(id);

  if (resolution.status === "not_found") {
    notFound();
  }

  if (resolution.status === "unauthenticated") {
    redirect(
      `/login?redirect=${encodeURIComponent(`/orders/${id}/complaint`)}`,
    );
  }

  if (resolution.status === "forbidden") {
    forbidden();
  }

  if (resolution.status === "degraded") {
    return <ComplaintDegradedView />;
  }

  return (
    <ComplaintView
      order={resolution.order}
      complaints={resolution.complaints}
      serverNowMs={Date.now()}
    />
  );
}

/**
 * Authenticated customer complaint route (`/orders/[id]/complaint`, SF-05).
 */
export default function OrderComplaintPage({
  params,
}: OrderComplaintPageProps) {
  return (
    <Suspense
      fallback={
        <div
          aria-hidden="true"
          className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6"
        >
          <div className="space-y-3 rounded-xl border border-border-subtle bg-white p-6">
            <Skeleton className="h-6 w-3/4 bg-gray-200" />
            <Skeleton className="h-4 w-full bg-gray-200" />
            <Skeleton className="h-4 w-5/6 bg-gray-200" />
          </div>
        </div>
      }
    >
      <OrderComplaintGate params={params} />
    </Suspense>
  );
}
