import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense, cache } from "react";
import { AlertCircle, ArrowLeft } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Skeleton,
  buttonVariants,
} from "@greenroots/ui";
import { TraceView } from "@/features/traceability/components/trace-view";
import { fetchLiveTraceByBatchCode } from "@/services/trace.service";

const getTraceByBatchCodeCached = cache((batchCode: string) =>
  fetchLiveTraceByBatchCode(batchCode),
);

/**
 * Resolves a concise dynamic `<title>` for the public trace detail page.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ batchCode: string }>;
}): Promise<Metadata> {
  await connection();
  const { batchCode } = await params;
  return { title: `Truy xuất lô ${decodeURIComponent(batchCode)}` };
}

async function TraceDetailContent({
  batchCode,
}: {
  readonly batchCode: string;
}) {
  await connection();
  const result = await getTraceByBatchCodeCached(batchCode);
  const displayCode = batchCode.trim().toUpperCase();

  if (result.status === "error") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8 lg:px-6">
        <Alert
          variant="destructive"
          className="rounded-2xl border-red-200 bg-white p-5"
        >
          <AlertCircle className="size-4" aria-hidden="true" />
          <AlertTitle className="font-bold text-gray-900">
            Không thể tải hồ sơ truy xuất
          </AlertTitle>
          <AlertDescription className="text-gray-600">
            Hệ thống tạm thời chưa kết nối được tới hồ sơ truy xuất nguồn gốc.
            Vui lòng tải lại trang hoặc quay về trang chủ.
          </AlertDescription>
        </Alert>
        <div>
          <Link
            href="/"
            className={buttonVariants({
              variant: "outline",
              className:
                "border-border-subtle bg-surface-card font-semibold text-gray-900 hover:border-brand-forest",
            })}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <TraceView
      record={result.status === "ok" ? result.dto : undefined}
      batchCode={displayCode}
    />
  );
}

async function TraceParamsLoader({
  params,
}: {
  readonly params: Promise<{ batchCode: string }>;
}) {
  const { batchCode } = await params;
  return <TraceDetailContent batchCode={decodeURIComponent(batchCode)} />;
}

/**
 * SF-03 public QR traceability detail page (`/trace/[batchCode]`).
 */
export default function TracePage({
  params,
}: {
  params: Promise<{ batchCode: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div
          aria-hidden="true"
          className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 lg:px-6"
        >
          <Skeleton className="h-4 w-64 bg-gray-200" />
          <Skeleton className="h-28 w-full bg-gray-100" />
          <Skeleton className="h-36 w-full bg-gray-100" />
          <Skeleton className="h-48 w-full bg-gray-100" />
        </div>
      }
    >
      <TraceParamsLoader params={params} />
    </Suspense>
  );
}
