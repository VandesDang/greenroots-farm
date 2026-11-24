import { OrderStatus } from "@greenroots/shared";

/**
 * Default number of orders returned per `/account/orders` page.
 */
export const ORDER_HISTORY_PAGE_SIZE = 20;

/**
 * Upper bound mirroring the backend `ListMyOrdersQueryDto` `limit` ceiling.
 */
export const ORDER_HISTORY_MAX_PAGE_SIZE = 100;

/**
 * Statuses selectable from the `/account/orders` filter tabs. Every other
 * `OrderStatus` value remains visible under the unfiltered "Tất cả" tab.
 */
export const ORDER_HISTORY_STATUS_FILTERS = [
  OrderStatus.PENDING_CONFIRMATION,
  OrderStatus.SHIPPING,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
] as const;

/**
 * A single status value accepted as a `/account/orders` filter tab.
 */
export type OrderHistoryStatusFilter =
  (typeof ORDER_HISTORY_STATUS_FILTERS)[number];

/**
 * Normalized server-side query consumed by `GET /api/v1/orders/me`.
 */
export interface OrdersQuery {
  readonly status?: OrderHistoryStatusFilter;
  readonly page: number;
  readonly limit: number;
}

function firstSearchParamValue(
  raw: string | string[] | undefined,
): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

/**
 * Parses a `?status=` search param into a known filter status, ignoring unknown values.
 *
 * @param raw Raw Next.js search param value.
 * @returns Recognized filter status, or `undefined` for the unfiltered view.
 */
export function parseOrderStatusFilter(
  raw: string | string[] | undefined,
): OrderHistoryStatusFilter | undefined {
  const value = firstSearchParamValue(raw);
  if (!value) {
    return undefined;
  }
  return (ORDER_HISTORY_STATUS_FILTERS as readonly string[]).includes(value)
    ? (value as OrderHistoryStatusFilter)
    : undefined;
}

/**
 * Parses a positive integer search param, clamping numeric values into `[min, max]`
 * and falling back to `fallback` for missing or non-numeric values.
 *
 * @param raw Raw Next.js search param value.
 * @param options Inclusive bounds and fallback value.
 * @returns Clamped integer or the fallback.
 */
export function parsePositiveIntParam(
  raw: string | string[] | undefined,
  options: {
    readonly min: number;
    readonly max: number;
    readonly fallback: number;
  },
): number {
  const value = firstSearchParamValue(raw);
  if (!value) {
    return options.fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return options.fallback;
  }
  return Math.min(options.max, Math.max(options.min, parsed));
}

/**
 * Builds a validated {@link OrdersQuery} from raw Next.js `searchParams`.
 *
 * @param searchParams Next.js route search params object.
 * @returns Normalized query with sanitized status, page, and limit.
 */
export function buildOrdersQuery(
  searchParams: Record<string, string | string[] | undefined>,
): OrdersQuery {
  return {
    status: parseOrderStatusFilter(searchParams.status),
    page: parsePositiveIntParam(searchParams.page, {
      min: 1,
      max: Number.MAX_SAFE_INTEGER,
      fallback: 1,
    }),
    limit: parsePositiveIntParam(searchParams.limit, {
      min: 1,
      max: ORDER_HISTORY_MAX_PAGE_SIZE,
      fallback: ORDER_HISTORY_PAGE_SIZE,
    }),
  };
}

/**
 * Builds an `/account/orders` href preserving the active status while targeting a page.
 *
 * @param target Optional status filter and 1-based page number.
 * @returns Canonical `/account/orders` href with only meaningful query params.
 */
export function buildOrdersHref(target: {
  readonly status?: OrderHistoryStatusFilter | null;
  readonly page?: number;
}): string {
  const params = new URLSearchParams();
  if (target.status) {
    params.set("status", target.status);
  }
  if (target.page !== undefined && target.page > 1) {
    params.set("page", String(target.page));
  }
  const query = params.toString();
  return query ? `/account/orders?${query}` : "/account/orders";
}
