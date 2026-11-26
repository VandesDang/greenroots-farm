"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  AlertDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@greenroots/ui";
import { ArrowLeft, CheckCircle2, Clock, Headset, Lock } from "lucide-react";
import { BUSINESS_RULES } from "@greenroots/shared";
import { AccountProfileDegradedCard } from "@/features/account/components/account-profile-view";
import type { OrderDto } from "@/features/orders/schemas/order.schema";
import type { ComplaintDto } from "../schemas/complaint.schema";
import { COMPLAINT_STATUS_LABELS } from "../constants/complaint-constants";
import { useAuthStore } from "@/stores/auth.store";
import { formatViDateTime } from "@/lib/format";
import {
  formatComplaintCountdown,
  resolveComplaintDeadline,
  resolveComplaintWindowState,
} from "../utils/complaint.utils";
import { ComplaintForm } from "./complaint-form";
import { ComplaintOrderAside } from "./complaint-order-aside";
import { ComplaintStatusView } from "./complaint-status-view";

interface ComplaintViewProps {
  readonly order: OrderDto;
  readonly complaints: readonly ComplaintDto[];
  readonly serverNowMs: number;
}

/**
 * SF-05 complaint page container: 24-hour countdown banner, form/status tabs,
 * and the order summary aside (`khi_u_n_i_n_h_ng.html`).
 */
export function ComplaintView({
  order,
  complaints,
  serverNowMs,
}: ComplaintViewProps) {
  const router = useRouter();
  const clearSession = useAuthStore((state) => state.clearSession);

  const serverComplaint: ComplaintDto | null = complaints.at(0) ?? null;
  const [localComplaint, setLocalComplaint] = useState<ComplaintDto | null>(
    null,
  );
  const [tab, setTab] = useState<string>(serverComplaint ? "status" : "form");
  const [nowMs, setNowMs] = useState(serverNowMs);

  const deadline = resolveComplaintDeadline(order.deliveredAt);
  const windowState = resolveComplaintWindowState(
    order.orderStatus,
    order.deliveredAt,
    nowMs,
  );
  const complaint = localComplaint ?? serverComplaint;

  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  function handleSessionInvalidated() {
    clearSession();
    router.replace(
      `/login?redirect=${encodeURIComponent(`/orders/${order.id}/complaint`)}`,
    );
  }

  const remainingMs = deadline !== null ? deadline - nowMs : 0;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-4 pb-8 lg:px-6 lg:pt-5 lg:pb-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={`/orders/${order.id}`}
          className="inline-flex items-center gap-1.5 rounded text-xs font-semibold text-brand-forest hover:underline focus-visible:ring-2 focus-visible:ring-brand-forest focus-visible:outline-none"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span>Quay lại chi tiết đơn hàng</span>
        </Link>
      </div>

      {/* Deadline banner */}
      <section
        aria-label="Thời hạn khiếu nại"
        className="flex flex-col justify-between gap-3 border-b border-border-subtle pb-4 sm:flex-row sm:items-center"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-full bg-green-50 text-brand-forest">
            <Headset className="size-5" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-gray-900">
              Khiếu nại đơn hàng {order.orderCode}
            </h1>
            {order.deliveredAt ? (
              <span className="text-xs text-gray-500 tabular-nums">
                Đã giao lúc {formatViDateTime(order.deliveredAt)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="inline-flex items-center gap-2 rounded-md bg-surface-warm px-3 py-2">
          {complaint ? (
            <CheckCircle2
              className="size-4 text-brand-forest"
              aria-hidden="true"
            />
          ) : windowState === "expired" ? (
            <Lock className="size-4 text-red-600" aria-hidden="true" />
          ) : (
            <Clock className="size-4 text-brand-forest" aria-hidden="true" />
          )}
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-gray-400">
              {complaint
                ? "Trạng thái khiếu nại"
                : `Hạn gửi khiếu nại (${BUSINESS_RULES.COMPLAINT_WINDOW_HOURS}h)`}
            </span>
            {complaint ? (
              <span className="text-sm font-bold text-gray-900">
                {COMPLAINT_STATUS_LABELS[complaint.status]}
              </span>
            ) : windowState === "open" ? (
              <span className="text-sm font-bold text-gray-900 tabular-nums">
                Còn lại {formatComplaintCountdown(remainingMs)}
              </span>
            ) : (
              <span className="text-sm font-bold text-gray-900 tabular-nums">
                {windowState === "expired"
                  ? "Đã hết hạn khiếu nại"
                  : "Chưa đủ điều kiện khiếu nại"}
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-8">
          <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
            <TabsList>
              <TabsTrigger value="form">Gửi khiếu nại</TabsTrigger>
              <TabsTrigger value="status">Trạng thái xử lý</TabsTrigger>
            </TabsList>

            <TabsContent value="form" className="pt-5">
              {complaint ? (
                <Alert>
                  <AlertDescription>
                    Bạn đã gửi khiếu nại cho đơn hàng này. Mỗi đơn hàng chỉ gửi
                    một khiếu nại duy nhất.
                  </AlertDescription>
                </Alert>
              ) : windowState === "not_eligible" ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    Đơn hàng chưa đủ điều kiện để gửi khiếu nại. Khiếu nại chỉ
                    áp dụng cho đơn hàng đã giao thành công.
                  </AlertDescription>
                </Alert>
              ) : windowState === "expired" ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    Đã quá thời hạn {BUSINESS_RULES.COMPLAINT_WINDOW_HOURS} giờ
                    kể từ lúc giao hàng để gửi khiếu nại.
                  </AlertDescription>
                </Alert>
              ) : (
                <ComplaintForm
                  order={order}
                  onSubmitted={(submitted) => {
                    setLocalComplaint(submitted);
                    setTab("status");
                  }}
                  onSessionInvalidated={handleSessionInvalidated}
                />
              )}
            </TabsContent>

            <TabsContent value="status" className="pt-5">
              {complaint ? (
                <ComplaintStatusView
                  complaint={complaint}
                  orderCode={order.orderCode}
                />
              ) : (
                <Alert>
                  <AlertDescription>
                    Chưa có khiếu nại nào cho đơn hàng này. Chuyển sang tab
                    &ldquo;Gửi khiếu nại&rdquo; để bắt đầu.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <ComplaintOrderAside order={order} />
      </div>
    </div>
  );
}

/**
 * Degraded recovery view when `/orders/[id]/complaint` fails to reach the API.
 */
export function ComplaintDegradedView() {
  const router = useRouter();

  return (
    <AccountProfileDegradedCard
      title="Không thể tải trang khiếu nại lúc này"
      description="Kết nối tới máy chủ GreenRoots Farm đang tạm gián đoạn. Vui lòng thử tải lại sau ít giây."
      onRetry={() => router.refresh()}
    />
  );
}
