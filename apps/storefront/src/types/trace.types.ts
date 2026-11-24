import type {
  BatchStatus,
  FarmingActionType,
  SeasonStatus,
} from "@greenroots/shared";
import type { components } from "@/types/api-schema";

/** Alias for the generated OpenAPI public QR traceability DTO. */
export type TraceRecordDto = components["schemas"]["TraceRecordDto"];

/**
 * Injectable transport dependency for `fetchLiveTraceByBatchCode` so unit specs
 * remain isolated without mutating Bun's global module registry.
 */
export interface TraceDetailDeps {
  readonly fetchTraceByBatchCode: (batchCode: string) => Promise<{
    data?: { data: TraceRecordDto };
    error?: unknown;
    response?: { readonly status: number };
  }>;
}

/**
 * Discriminated live trace lookup outcome distinguishing unknown batch codes (`404`)
 * from transient upstream failures (`5xx` or offline network).
 */
export type TraceDetailResult =
  | { readonly status: "ok"; readonly dto: TraceRecordDto }
  | { readonly status: "not_found" }
  | { readonly status: "error" };

/** Single append-only farming log entry rendered in batch traceability timelines. */
export interface FarmingLogEntry {
  readonly id: string;
  readonly actionType: FarmingActionType;
  readonly description: string;
  readonly mediaUrls: readonly string[];
  readonly loggedAt: string;
  readonly engineerName: string;
}

/** Public QR traceability projection for a harvested batch. */
export interface BatchTraceRecord {
  readonly batchCode: string;
  readonly productName: string;
  readonly unitLabel: string;
  readonly harvestDate: string;
  readonly expirationDate: string;
  readonly status: BatchStatus;
  readonly plotCode: string;
  readonly plotName: string;
  readonly areaSqm: number;
  readonly seasonName: string;
  readonly seasonStatus: SeasonStatus;
  readonly soilPh: number;
  readonly waterPh: number;
  readonly heavyMetalsPass: boolean;
  readonly certificationUrl: string;
  readonly farmingLogs: readonly FarmingLogEntry[];
}
