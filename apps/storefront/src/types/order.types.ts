import type { components } from "@/types/api-schema";

/**
 * Closed customer order projection returned by `GET /api/v1/orders/me` and `GET /api/v1/orders/:id`.
 */
export type StorefrontOrder = components["schemas"]["OrderDto"];

/**
 * Line-item projection embedded in a {@link StorefrontOrder} (`products.imageUrls[0]` thumbnail).
 */
export type StorefrontOrderItem = StorefrontOrder["items"][number];

/**
 * Pagination metadata returned alongside the paginated order list.
 */
export type OrderListMeta = components["schemas"]["PaginationMetaDto"];
