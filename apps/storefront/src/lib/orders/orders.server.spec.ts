import { describe, expect, it } from "bun:test";
import type { StorefrontSessionUser } from "@/types/auth.types";
import type { OrderListMeta, StorefrontOrder } from "@/types/order.types";
import { resolveAccountOrders, resolveOrderDetail } from "./orders.server";

const sampleUser: StorefrontSessionUser = {
  id: "0195a8f0-0001-7000-8000-000000000099",
  email: "khach@greenroots.vn",
  fullName: "Nguyễn Văn An",
  phone: "0901234567",
  role: "customer",
  status: "active",
  rewardPoints: 12500,
  emailVerified: true,
  createdAt: "2026-11-20T00:00:00.000Z",
  updatedAt: "2026-11-20T00:00:00.000Z",
};

const sampleOrder: StorefrontOrder = {
  id: "0195a8f0-0001-7000-8000-000000000001",
  orderCode: "ORD-0001",
  orderStatus: "pending_confirmation",
  paymentMethod: "cod",
  paymentStatus: "pending",
  receiverName: "Nguyễn Văn An",
  receiverPhone: "0901234567",
  shippingAddress: "142 Lê Đức Thọ, Quận Gò Vấp, TP. Hồ Chí Minh",
  shippingDistanceKm: 8.5,
  shippingFeeVnd: 25000,
  subtotalVnd: 180000,
  discountAmountVnd: 0,
  loyaltyPointsUsed: 0,
  totalAmountVnd: 205000,
  items: [
    {
      id: "0195a8f0-0001-7000-8000-000000000002",
      productId: "0195a8f0-0001-7000-8000-000000000003",
      productName: "Cải bó xôi",
      productSlug: "cai-bo-xoi",
      productImageUrl: null,
      unit: "kg",
      quantity: 1,
      unitPriceVnd: 90000,
      lineTotalVnd: 90000,
    },
  ],
  createdAt: "2026-11-20T00:00:00.000Z",
  updatedAt: "2026-11-20T00:00:00.000Z",
};

const sampleMeta: OrderListMeta = {
  page: 1,
  limit: 20,
  total: 1,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
};

const authenticatedSession = {
  status: "authenticated",
  user: sampleUser,
} as const;

describe("Orders Server Resolvers", () => {
  describe("resolveAccountOrders", () => {
    it("forwards unauthenticated and degraded session states without fetching orders", async () => {
      // Invariant: INV-ORD-9
      let fetchCalled = false;
      const fetchOrders = () => {
        fetchCalled = true;
        return Promise.resolve({
          response: { status: 200 },
          data: { data: [], meta: sampleMeta },
        });
      };

      const unauthenticated = await resolveAccountOrders(
        { page: 1, limit: 20 },
        {
          resolveSession: () => Promise.resolve({ status: "unauthenticated" }),
          fetchOrders,
        },
      );
      const degraded = await resolveAccountOrders(
        { page: 1, limit: 20 },
        {
          resolveSession: () => Promise.resolve({ status: "degraded" }),
          fetchOrders,
        },
      );

      expect(fetchCalled).toBe(false);
      expect(unauthenticated).toEqual({ status: "unauthenticated" });
      expect(degraded).toEqual({ status: "degraded" });
    });

    it("returns authenticated orders and meta when the endpoint succeeds", async () => {
      const resolution = await resolveAccountOrders(
        { status: "shipping", page: 1, limit: 20 },
        {
          resolveSession: () => Promise.resolve(authenticatedSession),
          fetchOrders: () =>
            Promise.resolve({
              response: { status: 200 },
              data: { data: [sampleOrder], meta: sampleMeta },
            }),
        },
      );

      expect(resolution).toEqual({
        status: "authenticated",
        user: sampleUser,
        orders: [sampleOrder],
        meta: sampleMeta,
      });
    });

    it("classifies a 401 response as unauthenticated", async () => {
      const resolution = await resolveAccountOrders(
        { page: 1, limit: 20 },
        {
          resolveSession: () => Promise.resolve(authenticatedSession),
          fetchOrders: () =>
            Promise.resolve({
              response: { status: 401 },
              error: { status: 401 },
            }),
        },
      );

      expect(resolution).toEqual({ status: "unauthenticated" });
    });

    it("classifies a server error or missing payload as degraded", async () => {
      const serverError = await resolveAccountOrders(
        { page: 1, limit: 20 },
        {
          resolveSession: () => Promise.resolve(authenticatedSession),
          fetchOrders: () =>
            Promise.resolve({
              response: { status: 503 },
              error: { status: 503 },
            }),
        },
      );
      const empty = await resolveAccountOrders(
        { page: 1, limit: 20 },
        {
          resolveSession: () => Promise.resolve(authenticatedSession),
          fetchOrders: () => Promise.resolve({ response: { status: 200 } }),
        },
      );

      expect(serverError).toEqual({ status: "degraded" });
      expect(empty).toEqual({ status: "degraded" });
    });
  });

  describe("resolveOrderDetail", () => {
    it("maps a missing or foreign order to not_found", async () => {
      // Invariant: INV-ORD-7
      const missing = await resolveOrderDetail(sampleOrder.id, {
        resolveSession: () => Promise.resolve(authenticatedSession),
        fetchOrder: () =>
          Promise.resolve({
            response: { status: 404 },
            error: { status: 404 },
          }),
      });
      const malformed = await resolveOrderDetail("not-a-uuid", {
        resolveSession: () => Promise.resolve(authenticatedSession),
        fetchOrder: () =>
          Promise.resolve({
            response: { status: 400 },
            error: { status: 400 },
          }),
      });

      expect(missing).toEqual({ status: "not_found" });
      expect(malformed).toEqual({ status: "not_found" });
    });

    it("returns the owned order when the endpoint succeeds", async () => {
      const resolution = await resolveOrderDetail(sampleOrder.id, {
        resolveSession: () => Promise.resolve(authenticatedSession),
        fetchOrder: () =>
          Promise.resolve({
            response: { status: 200 },
            data: { data: sampleOrder },
          }),
      });

      expect(resolution).toEqual({
        status: "authenticated",
        user: sampleUser,
        order: sampleOrder,
      });
    });

    it("classifies a server error as degraded", async () => {
      const resolution = await resolveOrderDetail(sampleOrder.id, {
        resolveSession: () => Promise.resolve(authenticatedSession),
        fetchOrder: () =>
          Promise.resolve({
            response: { status: 500 },
            error: { status: 500 },
          }),
      });

      expect(resolution).toEqual({ status: "degraded" });
    });
  });
});
