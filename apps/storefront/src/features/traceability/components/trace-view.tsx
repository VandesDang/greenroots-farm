import Image from "next/image";
import Link from "next/link";
import { Badge, buttonVariants } from "@greenroots/ui";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Droplets,
  FlaskConical,
  Lock,
  MapPin,
  ShieldCheck,
  Sprout,
  XCircle,
} from "lucide-react";
import {
  BATCH_STATUS_LABELS,
  FARMING_ACTION_LABELS,
} from "@/constants/domain-labels.constant";
import { filterApprovedProductImages } from "@/lib/image-url";
import { formatViDate } from "@/lib/format";
import type { TraceRecordDto } from "@/types/trace.types";
import { TraceCertificateDialog } from "./trace-certificate-dialog";

interface TraceViewProps {
  readonly record?: TraceRecordDto;
  readonly batchCode: string;
}

/** Derives a human-referenceable short hash from a UUID log id for timeline rows. */
function shortLogId(id: string): string {
  return `#${id.slice(0, 6)}`;
}

function LabPassBadge({ pass }: { readonly pass: boolean }) {
  return pass ? (
    <span className="inline-flex items-center gap-1 font-bold text-status-fresh">
      <CheckCircle2 className="size-3.5" aria-hidden="true" />
      Đạt chuẩn
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 font-bold text-status-spoiled">
      <XCircle className="size-3.5" aria-hidden="true" />
      Cảnh báo
    </span>
  );
}

interface LabMetricProps {
  readonly label: string;
  readonly hint?: string;
  readonly value: string;
}

function LabMetric({ label, hint, value }: LabMetricProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-gray-900">{label}</span>
        {hint ? (
          <span className="text-[11px] text-gray-500">{hint}</span>
        ) : null}
      </div>
      <span className="text-xs font-bold text-brand-dark tabular-nums">
        {value}
      </span>
    </div>
  );
}

export function TraceView({ record, batchCode }: TraceViewProps) {
  if (!record) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="rounded-2xl border border-red-200 bg-white p-6 text-center">
          <p className="text-base font-extrabold text-red-600">
            Không tìm thấy mã lô {batchCode}
          </p>
          <p className="mt-2 text-xs text-gray-600">
            Vui lòng kiểm tra lại tem QR trên bao bì nông sản hoặc thử mã mẫu
            BATCH-2026-TOM-01.
          </p>
          <Link
            href="/"
            className={buttonVariants({
              className:
                "mt-4 bg-brand-forest font-bold text-white hover:bg-brand-dark",
            })}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  const {
    batch,
    product,
    farm,
    plot,
    season,
    farmingLogs,
    totalLogCount,
    logsTruncated,
  } = record;
  const productImage = filterApprovedProductImages(product.imageUrls)[0];
  const soil = plot.soilTestResult;
  const water = plot.waterTestResult;
  const hasLabResults = soil !== null || water !== null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:px-6">
      <nav
        aria-label="Đường dẫn"
        className="flex flex-wrap items-center gap-1.5 text-[13px] text-gray-500"
      >
        <Link href="/" className="transition-colors hover:text-brand-forest">
          Trang chủ
        </Link>
        <ChevronRight className="size-3.5" aria-hidden="true" />
        <Link
          href="/trace"
          className="transition-colors hover:text-brand-forest"
        >
          Tra cứu nguồn gốc QR
        </Link>
        <ChevronRight className="size-3.5" aria-hidden="true" />
        <span className="font-semibold text-gray-900 tabular-nums">
          {batch.batchCode}
        </span>
      </nav>

      <section
        aria-label="Thông tin lô hàng"
        className="flex flex-col gap-6 border-b border-border-subtle pb-6"
      >
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-start gap-4">
            {productImage ? (
              <Image
                src={productImage}
                alt={`${product.name} — ảnh sản phẩm`}
                width={80}
                height={80}
                className="size-20 shrink-0 rounded-md object-cover"
              />
            ) : (
              <span className="flex size-20 shrink-0 items-center justify-center rounded-md bg-green-50 text-brand-forest">
                <Sprout className="size-10" aria-hidden="true" />
              </span>
            )}
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-0 bg-green-100 font-semibold text-brand-dark">
                  {BATCH_STATUS_LABELS[batch.status]}
                </Badge>
                <Badge className="inline-flex items-center gap-1 border-0 bg-green-50 font-semibold text-brand-dark">
                  <Lock className="size-3.5" aria-hidden="true" />
                  Nhật ký bất biến
                </Badge>
              </div>
              <h1 className="text-xl font-extrabold text-gray-900 md:text-2xl">
                {product.name} ({product.unit})
              </h1>
              <p className="text-xs text-gray-500">
                {farm.name} — Dữ liệu ghi nhận trực tiếp từ vườn và không thể
                chỉnh sửa xóa bỏ.
              </p>
            </div>
          </div>

          <div className="shrink-0 self-start lg:self-center">
            <TraceCertificateDialog
              farmName={farm.name}
              legalName={farm.legalName}
              address={farm.address}
              certificationUrl={farm.certificationUrl}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-4 border-t border-border-subtle pt-4 lg:grid-cols-4 lg:gap-y-0 lg:divide-x lg:divide-border-subtle">
          <div className="flex flex-col gap-1 lg:pr-4">
            <span className="text-[11px] font-semibold text-gray-500">
              Mã lô thu hoạch
            </span>
            <span className="text-sm font-bold text-gray-900 tabular-nums">
              {batch.batchCode}
            </span>
          </div>
          <div className="flex flex-col gap-1 lg:px-4">
            <span className="text-[11px] font-semibold text-gray-500">
              Ngày thu hoạch
            </span>
            <span className="text-sm font-bold text-gray-900 tabular-nums">
              {formatViDate(batch.harvestDate)}
            </span>
          </div>
          <div className="flex flex-col gap-1 lg:px-4">
            <span className="text-[11px] font-semibold text-gray-500">
              Hạn sử dụng tốt nhất
            </span>
            <span className="text-sm font-bold text-status-spoiled tabular-nums">
              {formatViDate(batch.expirationDate)}
            </span>
          </div>
          <div className="flex flex-col gap-1 lg:pl-4">
            <span className="text-[11px] font-semibold text-gray-500">
              Lô đất &amp; Mùa vụ
            </span>
            <span className="text-sm font-bold text-gray-900">
              {plot.plotCode} ({season.seasonName})
            </span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 border-b border-border-subtle pb-6 lg:grid-cols-12">
        <section
          aria-label="Danh tính nông trại"
          className="flex flex-col gap-4 lg:col-span-5"
        >
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Sprout className="size-5 text-brand-forest" aria-hidden="true" />
            Nông trại canh tác
          </h2>
          <div className="flex flex-col divide-y divide-border-subtle border-t border-border-subtle">
            <div className="flex items-center gap-4 py-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-green-50 text-brand-dark">
                <Sprout className="size-5" aria-hidden="true" />
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-900">
                  {farm.name}
                </span>
                <span className="text-xs text-gray-500">{farm.legalName}</span>
              </div>
            </div>
            {farm.tagline ? (
              <p className="py-3 text-xs text-gray-600">{farm.tagline}</p>
            ) : null}
            <p className="flex items-start gap-2 py-3 text-xs text-gray-500">
              <MapPin
                className="mt-0.5 size-4 shrink-0 text-brand-forest"
                aria-hidden="true"
              />
              {farm.address}
            </p>
          </div>
        </section>

        <section
          aria-label="Kết quả kiểm nghiệm đất và nước"
          className="flex flex-col gap-4 lg:col-span-7 lg:border-l lg:border-border-subtle lg:pl-6"
        >
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <ShieldCheck
              className="size-5 text-brand-forest"
              aria-hidden="true"
            />
            Kết quả kiểm nghiệm đất &amp; nước
          </h2>

          {hasLabResults ? (
            <div className="flex flex-col divide-y divide-border-subtle border-t border-border-subtle">
              {soil ? (
                <div className="py-2">
                  <p className="flex items-center gap-1.5 py-1 text-xs font-bold text-brand-dark">
                    <FlaskConical
                      className="size-4 text-brand-forest"
                      aria-hidden="true"
                    />
                    Kiểm định đất
                  </p>
                  <div className="flex flex-col">
                    <LabMetric
                      label="Độ pH giá thể đất"
                      value={`${soil.ph} pH`}
                    />
                    <LabMetric
                      label="Đạm (N)"
                      value={`${soil.nitrogen_ppm} ppm`}
                    />
                    <LabMetric
                      label="Lân (P)"
                      value={`${soil.phosphorus_ppm} ppm`}
                    />
                    <LabMetric
                      label="Kali (K)"
                      value={`${soil.potassium_ppm} ppm`}
                    />
                    <div className="flex items-center justify-between gap-3 py-2.5">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-900">
                          Kim loại nặng (Pb/Cd)
                        </span>
                        <span className="text-[11px] text-gray-500 tabular-nums">
                          {soil.heavy_metals.lead_ppm} /{" "}
                          {soil.heavy_metals.cadmium_ppm} ppm
                        </span>
                      </div>
                      <LabPassBadge pass={soil.heavy_metals.pass} />
                    </div>
                    <p className="py-1 text-[11px] text-gray-400 tabular-nums">
                      Kiểm định {formatViDate(soil.tested_at)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="py-3 text-xs text-gray-500">
                  Chưa có kết quả kiểm định đất.
                </p>
              )}

              {water ? (
                <div className="py-2">
                  <p className="flex items-center gap-1.5 py-1 text-xs font-bold text-brand-dark">
                    <Droplets
                      className="size-4 text-brand-forest"
                      aria-hidden="true"
                    />
                    Kiểm định nước tưới
                  </p>
                  <div className="flex flex-col">
                    <LabMetric label="Độ pH nước tưới" value={`${water.ph}`} />
                    <LabMetric
                      label="Độ dẫn điện (EC)"
                      value={`${water.ec_ms_cm} mS/cm`}
                    />
                    <LabMetric
                      label="Oxy hòa tan (DO)"
                      value={`${water.dissolved_oxygen_ppm} ppm`}
                    />
                    <LabMetric
                      label="E. coli"
                      value={`${water.e_coli_cfu_100ml} CFU/100ml`}
                    />
                    <div className="flex items-center justify-between gap-3 py-2.5">
                      <span className="text-xs font-semibold text-gray-900">
                        Kim loại nặng
                      </span>
                      <LabPassBadge pass={water.heavy_metals_pass} />
                    </div>
                    <p className="py-1 text-[11px] text-gray-400 tabular-nums">
                      Kiểm định {formatViDate(water.tested_at)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="py-3 text-xs text-gray-500">
                  Chưa có kết quả kiểm định nước tưới.
                </p>
              )}
            </div>
          ) : (
            <p className="border-t border-border-subtle pt-3 text-xs text-gray-500">
              Chưa có kết quả kiểm định đất và nước tưới cho thửa này.
            </p>
          )}
        </section>
      </div>

      <section
        aria-label="Timeline nhật ký canh tác bất biến"
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <ShieldCheck
              className="size-5 text-brand-forest"
              aria-hidden="true"
            />
            Timeline nhật ký canh tác bất biến
          </h2>
          <span className="text-xs text-gray-500">
            {totalLogCount} mốc · Mọi bản ghi chỉ được thêm mới (append-only)
          </span>
        </div>

        {logsTruncated ? (
          <p className="rounded-lg border border-border-subtle bg-surface-warm p-2.5 text-[11px] text-gray-600">
            Nhật ký quá dài, chỉ hiển thị 200 mốc canh tác gần nhất.
          </p>
        ) : null}

        {farmingLogs.length === 0 ? (
          <p className="text-xs text-gray-500">
            Chưa có mốc canh tác nào được ghi nhận cho mùa vụ này.
          </p>
        ) : (
          <ol className="relative space-y-4 border-l-2 border-border-subtle pl-6">
            {farmingLogs.map((entry) => {
              const isCorrection = entry.correctsLogId !== null;
              const isSuperseded = entry.correctedBy.length > 0;
              return (
                <li
                  key={entry.id}
                  className={`relative flex flex-col gap-1 ${
                    isCorrection ? "rounded-md bg-surface-warm p-4" : ""
                  }`}
                >
                  <span
                    className={`absolute -left-7.25 h-3 w-3 rounded-full border-2 border-white ${
                      isCorrection || isSuperseded
                        ? "top-4 bg-gray-300"
                        : "top-1.5 bg-brand-forest"
                    }`}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-brand-dark tabular-nums">
                      {formatViDate(entry.loggedAt)}
                    </span>
                    {isCorrection ? (
                      <Badge className="inline-flex items-center gap-1 border border-border-subtle bg-surface-card font-semibold text-gray-700">
                        Bản ghi đính chính
                      </Badge>
                    ) : isSuperseded ? (
                      <Badge className="border-0 bg-surface-warm font-semibold text-gray-500">
                        Đã được đính chính
                      </Badge>
                    ) : (
                      <Badge className="border-0 bg-green-50 font-semibold text-brand-dark">
                        {FARMING_ACTION_LABELS[entry.actionType]}
                      </Badge>
                    )}
                    <span className="text-[11px] text-gray-400 tabular-nums">
                      {shortLogId(entry.id)}
                    </span>
                  </div>
                  <p
                    className={`text-xs leading-relaxed ${
                      isSuperseded
                        ? "text-gray-400 line-through"
                        : "text-gray-700"
                    }`}
                  >
                    {entry.description}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Xác nhận: {entry.recordedByName}
                  </p>
                  {entry.correctsLog ? (
                    <p className="text-[11px] font-semibold text-brand-forest">
                      Đính chính cho: {entry.correctsLog.description}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
