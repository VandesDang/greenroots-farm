import { describe, expect, it } from "bun:test";
import type { OrderDto } from "@/features/orders/schemas/order.schema";
import type { ComplaintDto } from "../schemas/complaint.schema";
import { resolveCustomerComplaintSession } from "./complaints.server";

const sampleOrder: OrderDto = {
  id: "019fa8bc-8f4d-7000-b366-e691f45cfb91",
  orderCode: "ORD-20261125-0001",
  orderStatus: "delivered",
  paymentMethod: "cod",
  paymentStatus: "paid",
  receiverName: "Nguyễn Minh Anh",
  receiverPhone: "0908412679",
  shippingAddress: "142 Lê Đức Thọ, Q. Gò Vấp, TP.HCM",
  shippingDistanceKm: 10,
  shippingFeeVnd: 15_000,
  subtotalVnd: 150_000,
  discountAmountVnd: 0,
  loyaltyPointsUsed: 0,
  totalAmountVnd: 165_000,
  paymentUrl: null,
  reservationExpiresAt: null,
  deliveredAt: "2026-11-25T08:00:00.000Z",
  items: [],
  createdAt: "2026-11-25T01:00:00.000Z",
  updatedAt: "2026-11-25T08:00:00.000Z",
};

const sampleComplaint: ComplaintDto = {
  id: "019fa8bc-8f4d-7000-b366-e691f45cfb92",
  orderId: sampleOrder.id,
  customerId: "019fa8bc-8f4d-7000-b366-e691f45cfb93",
  reason: "Rau bị dập nát khi giao hàng",
  proofImageUrls: [
    "https://res.cloudinary.com/demo/image/upload/v1/complaints/a.webp",
  ],
  proofVideoUrl: null,
  status: "pending",
  resolution: null,
  createdAt: "2026-11-25T09:00:00.000Z",
  updatedAt: "2026-11-25T09:00:00.000Z",
};

const passthroughRefresh = async <T>(
  operation: () => Promise<T>,
): Promise<T & { refreshOutcome: "not-needed" }> => ({
  ...(await operation()),
  refreshOutcome: "not-needed",
});

describe("Complaints Server Resolver", () => {
  it("returns the owned order and complaint list when authenticated", async () => {
    const res = await resolveCustomerComplaintSession(sampleOrder.id, {
      isDegraded: () => Promise.resolve(false),
      readToken: () => Promise.resolve("valid-token"),
      runWithRefresh: passthroughRefresh as never,
      fetchMyOrderById: () =>
        Promise.resolve({
          response: new Response(null, { status: 200 }),
          data: { data: sampleOrder },
        }),
      fetchComplaints: () =>
        Promise.resolve({
          response: new Response(null, { status: 200 }),
          data: { data: [sampleComplaint] },
        }),
    });

    expect(res).toEqual({
      status: "authenticated",
      order: sampleOrder,
      complaints: [sampleComplaint],
    });
  });

  it("treats an empty complaint list as authenticated with no complaints", async () => {
    const res = await resolveCustomerComplaintSession(sampleOrder.id, {
      isDegraded: () => Promise.resolve(false),
      readToken: () => Promise.resolve("valid-token"),
      runWithRefresh: passthroughRefresh as never,
      fetchMyOrderById: () =>
        Promise.resolve({
          response: new Response(null, { status: 200 }),
          data: { data: sampleOrder },
        }),
      fetchComplaints: () =>
        Promise.resolve({
          response: new Response(null, { status: 200 }),
          data: { data: [] },
        }),
    });

    expect(res).toEqual({
      status: "authenticated",
      order: sampleOrder,
      complaints: [],
    });
  });

  it("returns not_found when the order is missing or foreign", async () => {
    const res = await resolveCustomerComplaintSession(sampleOrder.id, {
      isDegraded: () => Promise.resolve(false),
      readToken: () => Promise.resolve("valid-token"),
      runWithRefresh: passthroughRefresh as never,
      fetchMyOrderById: () =>
        Promise.resolve({
          response: new Response(null, { status: 404 }),
          error: { status: 404 },
        }),
    });

    expect(res).toEqual({ status: "not_found" });
  });

  it("returns unauthenticated when the complaint read is rejected with 401", async () => {
    const res = await resolveCustomerComplaintSession(sampleOrder.id, {
      isDegraded: () => Promise.resolve(false),
      readToken: () => Promise.resolve("valid-token"),
      runWithRefresh: passthroughRefresh as never,
      fetchMyOrderById: () =>
        Promise.resolve({
          response: new Response(null, { status: 200 }),
          data: { data: sampleOrder },
        }),
      fetchComplaints: () =>
        Promise.resolve({
          response: new Response(null, { status: 401 }),
          error: { status: 401 },
        }),
    });

    expect(res).toEqual({ status: "unauthenticated" });
  });
});
