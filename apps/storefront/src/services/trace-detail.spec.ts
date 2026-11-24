import { describe, expect, it } from "bun:test";
import { fetchLiveTraceByBatchCode } from "./trace.service";
import type { TraceDetailDeps, TraceRecordDto } from "@/types/trace.types";

const MOCK_TRACE_RECORD: TraceRecordDto = {
  batch: {
    id: "batch-id-1",
    batchCode: "BATCH-2026-TOM-01",
    harvestDate: "2026-11-20T04:00:00.000Z",
    expirationDate: "2026-11-29T04:00:00.000Z",
    status: "in_stock",
  },
  product: {
    id: "product-id-1",
    name: "Cà chua bi hữu cơ",
    slug: "ca-chua-bi-huu-co",
    unit: "500g",
    imageUrls: [],
  },
  farm: {
    name: "GreenRoots Farm Củ Chi",
    legalName: "Công ty TNHH GreenRoots",
    tagline: "Từ nông trại hữu cơ đến bàn ăn",
    address: "Củ Chi, TP.HCM",
    certificationUrl: "https://greenroots.farm/cert/vietgap.pdf",
  },
  plot: {
    plotCode: "PLOT-B2",
    name: "Lô B2",
    areaSqm: 1200,
    soilTestResult: {
      ph: 6.4,
      nitrogen_ppm: 30,
      phosphorus_ppm: 15,
      potassium_ppm: 120,
      heavy_metals: { lead_ppm: 0.01, cadmium_ppm: 0, pass: true },
      tested_at: "2026-09-01T00:00:00.000Z",
    },
    waterTestResult: {
      ph: 7.1,
      ec_ms_cm: 0.8,
      dissolved_oxygen_ppm: 6.5,
      e_coli_cfu_100ml: 0,
      heavy_metals_pass: true,
      tested_at: "2026-09-01T00:00:00.000Z",
    },
  },
  season: {
    id: "season-id-1",
    seasonName: "Vụ Đông Xuân 2026",
    startDate: "2026-09-01",
    expectedHarvestDate: "2026-11-20",
    status: "active",
  },
  farmingLogs: [],
  totalLogCount: 0,
  logsTruncated: false,
};

type TraceFetchOutcome = {
  data?: { data: TraceRecordDto };
  error?: unknown;
  response?: { readonly status: number };
};

function depsReturning(
  outcome: TraceFetchOutcome | (() => Promise<TraceFetchOutcome>),
): TraceDetailDeps {
  return {
    fetchTraceByBatchCode: () =>
      typeof outcome === "function" ? outcome() : Promise.resolve(outcome),
  };
}

describe("fetchLiveTraceByBatchCode", () => {
  it("returns the trace record when the endpoint succeeds", async () => {
    const result = await fetchLiveTraceByBatchCode(
      "batch-2026-tom-01",
      depsReturning({ data: { data: MOCK_TRACE_RECORD } }),
    );

    expect(result).toEqual({ status: "ok", dto: MOCK_TRACE_RECORD });
  });

  it("normalizes the batch code to trimmed uppercase before fetching", async () => {
    let capturedCode = "";
    const deps: TraceDetailDeps = {
      fetchTraceByBatchCode: (batchCode) => {
        capturedCode = batchCode;
        return Promise.resolve({ data: { data: MOCK_TRACE_RECORD } });
      },
    };

    await fetchLiveTraceByBatchCode("  batch-2026-tom-01  ", deps);

    expect(capturedCode).toBe("BATCH-2026-TOM-01");
  });

  it("resolves not_found for an unknown or malformed batch code", async () => {
    const notFound = depsReturning({
      error: { status: 404 },
      response: { status: 404 },
    });
    const malformed = depsReturning({
      error: { status: 400 },
      response: { status: 400 },
    });

    expect(
      await fetchLiveTraceByBatchCode("BATCH-UNKNOWN-999", notFound),
    ).toEqual({ status: "not_found" });
    expect(await fetchLiveTraceByBatchCode("ab", malformed)).toEqual({
      status: "not_found",
    });
  });

  it("resolves not_found for a blank batch code without calling the transport", async () => {
    let called = false;
    const deps: TraceDetailDeps = {
      fetchTraceByBatchCode: () => {
        called = true;
        return Promise.resolve({ data: { data: MOCK_TRACE_RECORD } });
      },
    };

    expect(await fetchLiveTraceByBatchCode("   ", deps)).toEqual({
      status: "not_found",
    });
    expect(called).toBe(false);
  });

  it("resolves error for a transient upstream failure", async () => {
    const serverError = depsReturning({
      error: { status: 500 },
      response: { status: 500 },
    });
    const offline = depsReturning(() =>
      Promise.reject(new Error("network down")),
    );

    expect(
      await fetchLiveTraceByBatchCode("BATCH-2026-TOM-01", serverError),
    ).toEqual({ status: "error" });
    expect(
      await fetchLiveTraceByBatchCode("BATCH-2026-TOM-01", offline),
    ).toEqual({
      status: "error",
    });
  });
});
