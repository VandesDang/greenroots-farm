import { cache } from "react";
import { api } from "@/lib/api-client";
import {
  getAccountProfileSession,
  type AccountProfileSessionResolution,
} from "@/lib/auth/session.server";
import type { StorefrontSessionUser } from "@/types/auth.types";
import type { OrderListMeta, StorefrontOrder } from "@/types/order.types";
import type { OrdersQuery } from "./orders-query";

/**
 * Discriminated server-side resolution for the `/account/orders` route.
 */
export type AccountOrdersResolution =
  | {
      readonly status: "authenticated";
      readonly user: StorefrontSessionUser;
      readonly orders: readonly StorefrontOrder[];
      readonly meta: OrderListMeta;
    }
  | { readonly status: "unauthenticated" }
  | { readonly status: "degraded" };

/**
 * Optional dependency overrides for isolated unit testing of `resolveAccountOrders`.
 */
export interface AccountOrdersDeps {
  readonly resolveSession?: () => Promise<AccountProfileSessionResolution>;
  readonly fetchOrders?: () => Promise<{
    response?: { readonly status: number };
    data?: { data: StorefrontOrder[]; meta: OrderListMeta };
    error?: unknown;
  }>;
}

/**
 * Resolves the authenticated customer's paginated order list via `GET /api/v1/orders/me`,
 * distinguishing terminal `401` redirects from transient degraded states (`INV-ORD-9`).
 *
 * @param query Validated page, limit, and optional status filter.
 * @param deps Optional session and order fetcher overrides for unit testing.
 * @returns Authenticated orders + pagination meta, `unauthenticated`, or `degraded`.
 */
export async function resolveAccountOrders(
  query: OrdersQuery,
  deps?: AccountOrdersDeps,
): Promise<AccountOrdersResolution> {
  try {
    const resolveSession = deps?.resolveSession ?? getAccountProfileSession;
    const session = await resolveSession();
    if (session.status !== "authenticated") {
      return {
        status:
          session.status === "unauthenticated" ? "unauthenticated" : "degraded",
      };
    }

    const fetchOrders =
      deps?.fetchOrders ??
      (() =>
        api.GET("/api/v1/orders/me", {
          params: {
            query: {
              ...(query.status ? { status: query.status } : {}),
              page: query.page,
              limit: query.limit,
            },
          },
        }));

    const result = await fetchOrders();
    if (result.error || !result.data) {
      return {
        status:
          result.response?.status === 401 ? "unauthenticated" : "degraded",
      };
    }

    return {
      status: "authenticated",
      user: session.user,
      orders: result.data.data,
      meta: result.data.meta,
    };
  } catch {
    return { status: "degraded" };
  }
}

/**
 * Per-request memoized `/account/orders` resolver.
 */
export const getAccountOrders = cache(
  (query: OrdersQuery): Promise<AccountOrdersResolution> =>
    resolveAccountOrders(query),
);

/**
 * Discriminated server-side resolution for the `/orders/[id]` route.
 */
export type OrderDetailResolution =
  | {
      readonly status: "authenticated";
      readonly user: StorefrontSessionUser;
      readonly order: StorefrontOrder;
    }
  | { readonly status: "unauthenticated" }
  | { readonly status: "not_found" }
  | { readonly status: "degraded" };

/**
 * Optional dependency overrides for isolated unit testing of `resolveOrderDetail`.
 */
export interface OrderDetailDeps {
  readonly resolveSession?: () => Promise<AccountProfileSessionResolution>;
  readonly fetchOrder?: () => Promise<{
    response?: { readonly status: number };
    data?: { data: StorefrontOrder };
    error?: unknown;
  }>;
}

/**
 * Resolves a single owned customer order via `GET /api/v1/orders/:id`, mapping
 * missing or foreign orders to `not_found` without revealing existence (`INV-ORD-7`).
 *
 * @param id Order UUIDv7 identifier.
 * @param deps Optional session and order fetcher overrides for unit testing.
 * @returns Authenticated order, `unauthenticated`, `not_found`, or `degraded`.
 */
export async function resolveOrderDetail(
  id: string,
  deps?: OrderDetailDeps,
): Promise<OrderDetailResolution> {
  try {
    const resolveSession = deps?.resolveSession ?? getAccountProfileSession;
    const session = await resolveSession();
    if (session.status !== "authenticated") {
      return {
        status:
          session.status === "unauthenticated" ? "unauthenticated" : "degraded",
      };
    }

    const fetchOrder =
      deps?.fetchOrder ??
      (() =>
        api.GET("/api/v1/orders/{id}", {
          params: { path: { id } },
        }));

    const result = await fetchOrder();
    // The backend returns 400 for malformed UUIDs and 404 for missing/foreign orders;
    // both surface as a clean "not found" page rather than a retry loop.
    if (result.response?.status === 404 || result.response?.status === 400) {
      return { status: "not_found" };
    }
    if (result.response?.status === 401) {
      return { status: "unauthenticated" };
    }
    if (result.error || !result.data) {
      return { status: "degraded" };
    }

    return {
      status: "authenticated",
      user: session.user,
      order: result.data.data,
    };
  } catch {
    return { status: "degraded" };
  }
}

/**
 * Per-request memoized `/orders/[id]` resolver.
 */
export const getOrderDetail = cache(
  (id: string): Promise<OrderDetailResolution> => resolveOrderDetail(id),
);
