"use client";

import { Leaf, ShieldCheck } from "lucide-react";
import { BUSINESS_RULES } from "@greenroots/shared";
import type { OrderDto } from "@/features/orders/schemas/order.schema";
import { formatVnd, roundQuantity } from "@/lib/format";
import { ComplaintImage } from "./complaint-thumbnail";

interface ComplaintOrderAsideProps {
  readonly order: OrderDto;
}

/**
 * Right-column order summary and 24-hour support policy for the complaint page.
 */
export function ComplaintOrderAside({ order }: ComplaintOrderAsideProps) {
  return (
    <aside className="flex flex-col divide-y divide-border-subtle lg:col-span-4 lg:border-l lg:border-border-subtle lg:pl-6">
      <section
        aria-label="Tóm tắt đơn hàng"
        className="flex flex-col gap-4 pb-6"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-gray-900 tabular-nums">
            {order.orderCode}
          </h2>
          <span className="text-sm font-semibold text-brand-forest tabular-nums">
            {formatVnd(order.totalAmountVnd)}
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <ComplaintImage
                src={item.productImageUrl}
                alt={item.productName}
              />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900">
                  {item.productName}
                </span>
                <span className="text-xs text-gray-500 tabular-nums">
                  {item.unit} × {roundQuantity(item.quantity)} —{" "}
                  {formatVnd(item.lineTotalVnd)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        aria-label="Cam kết hỗ trợ 24h"
        className="flex flex-col gap-2 pt-6"
      >
        <div className="flex items-center gap-1.5 text-brand-forest">
          <ShieldCheck className="size-4" aria-hidden="true" />
          <h2 className="text-sm font-bold text-gray-900">
            Cam kết tươi ngon {BUSINESS_RULES.COMPLAINT_WINDOW_HOURS}h
          </h2>
        </div>
        <ul className="flex flex-col gap-1.5 text-xs text-gray-500">
          <li className="flex items-start gap-1.5">
            <Leaf
              className="mt-0.5 size-3.5 shrink-0 text-brand-forest"
              aria-hidden="true"
            />
            <span>
              Hoàn tiền 100% hoặc giao bù miễn phí trong chuyến kế tiếp.
            </span>
          </li>
          <li className="flex items-start gap-1.5">
            <Leaf
              className="mt-0.5 size-3.5 shrink-0 text-brand-forest"
              aria-hidden="true"
            />
            <span>Kiểm tra và phản hồi yêu cầu trong vòng 2 giờ làm việc.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <Leaf
              className="mt-0.5 size-3.5 shrink-0 text-brand-forest"
              aria-hidden="true"
            />
            <span>
              Áp dụng trong {BUSINESS_RULES.COMPLAINT_WINDOW_HOURS} giờ kể từ
              thời điểm đơn hàng được giao thành công.
            </span>
          </li>
        </ul>
      </section>
    </aside>
  );
}
