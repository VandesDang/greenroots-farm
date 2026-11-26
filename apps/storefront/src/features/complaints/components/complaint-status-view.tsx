"use client";

import Link from "next/link";
import { Badge, buttonVariants } from "@greenroots/ui";
import { CheckCircle2, CircleDashed, Clock3, Hourglass } from "lucide-react";
import type { ComplaintDto } from "../schemas/complaint.schema";
import { formatViDateTime } from "@/lib/format";
import { isApprovedStorefrontImageUrl } from "@/lib/image-url";
import {
  COMPLAINT_RESOLUTION_LABELS,
  COMPLAINT_STATUS_LABELS,
} from "../constants/complaint-constants";
import { buildComplaintTimeline } from "../utils/complaint.utils";
import { ComplaintImage } from "./complaint-thumbnail";

interface ComplaintStatusViewProps {
  readonly complaint: ComplaintDto;
  readonly orderCode: string;
}

function resolveBadgeTone(
  status: ComplaintDto["status"],
): "default" | "outline" | "destructive" {
  if (status === "approved") {
    return "default";
  }
  if (status === "rejected") {
    return "destructive";
  }
  return "outline";
}

/**
 * Read-only complaint processing status and resolution, mapped from real
 * `status`, `resolution`, `createdAt`, and `updatedAt` fields.
 */
export function ComplaintStatusView({
  complaint,
  orderCode,
}: ComplaintStatusViewProps) {
  const steps = buildComplaintTimeline(complaint);

  const resolutionText =
    complaint.resolution !== null
      ? COMPLAINT_RESOLUTION_LABELS[complaint.resolution]
      : null;
  const approvedVideoUrl =
    complaint.proofVideoUrl !== null &&
    isApprovedStorefrontImageUrl(complaint.proofVideoUrl)
      ? complaint.proofVideoUrl
      : null;

  return (
    <section
      aria-label="Trạng thái xử lý khiếu nại"
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-0.5 border-b border-border-subtle pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900 tabular-nums">
              Đơn hàng {orderCode}
            </h2>
            <Badge variant={resolveBadgeTone(complaint.status)}>
              {COMPLAINT_STATUS_LABELS[complaint.status]}
            </Badge>
          </div>
          <span className="text-xs text-gray-500 tabular-nums">
            Gửi lúc {formatViDateTime(complaint.createdAt)} — Cập nhật{" "}
            {formatViDateTime(complaint.updatedAt)}
          </span>
        </div>
      </div>

      <div className="flex flex-col divide-y divide-border-subtle border-b border-border-subtle">
        {steps.map((step) => (
          <div
            key={step.key}
            className="flex items-center justify-between gap-2 py-3"
          >
            <div
              className={`flex items-center gap-1.5 ${
                step.state === "upcoming" ? "text-gray-400" : "text-brand-dark"
              }`}
            >
              {step.state === "completed" ? (
                <CheckCircle2
                  className="size-4 text-brand-forest"
                  aria-hidden="true"
                />
              ) : step.state === "current" ? (
                <Hourglass
                  className="size-4 text-brand-forest"
                  aria-hidden="true"
                />
              ) : (
                <CircleDashed className="size-4" aria-hidden="true" />
              )}
              <span className="text-sm font-semibold">{step.label}</span>
            </div>
            <span className="text-xs text-gray-500 tabular-nums">
              {step.timestamp ? formatViDateTime(step.timestamp) : step.note}
            </span>
          </div>
        ))}
      </div>

      {resolutionText ? (
        <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-brand-dark">
          <Clock3 className="size-4 text-brand-forest" aria-hidden="true" />
          <span>
            Kết quả: <strong>{resolutionText}</strong>
          </span>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 rounded-md bg-surface-warm p-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-gray-400">
            Nội dung khiếu nại đã gửi
          </span>
          <p className="text-sm text-pretty text-gray-900">
            {complaint.reason}
          </p>
        </div>

        {complaint.proofImageUrls.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {complaint.proofImageUrls.map((url) => (
              <ComplaintImage
                key={url}
                src={url}
                alt="Ảnh bằng chứng khiếu nại"
                className="size-14"
              />
            ))}
          </div>
        ) : null}

        {approvedVideoUrl ? (
          <div className="flex flex-col gap-1.5 pt-2">
            <span className="text-xs font-semibold text-gray-400">
              Video bằng chứng
            </span>
            <video
              controls
              preload="metadata"
              src={approvedVideoUrl}
              className="max-h-64 w-full rounded-md bg-black"
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/account/orders"
          className={buttonVariants({ variant: "default" })}
        >
          Xem danh sách đơn hàng
        </Link>
      </div>
    </section>
  );
}
