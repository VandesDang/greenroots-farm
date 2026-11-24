import { describe, expect, it } from "bun:test";
import { OrderStatus } from "@greenroots/shared";
import { buildOrderTimeline, getOrderStatusTone } from "./order-status";

describe("Order Status", () => {
  describe("getOrderStatusTone", () => {
    it("maps pending payment and confirmation to the pending tone", () => {
      expect(getOrderStatusTone(OrderStatus.PENDING_PAYMENT)).toBe("pending");
      expect(getOrderStatusTone(OrderStatus.PENDING_CONFIRMATION)).toBe(
        "pending",
      );
    });

    it("maps in-progress fulfillment statuses to the active tone", () => {
      expect(getOrderStatusTone(OrderStatus.CONFIRMED)).toBe("active");
      expect(getOrderStatusTone(OrderStatus.PACKING)).toBe("active");
      expect(getOrderStatusTone(OrderStatus.SHIPPING)).toBe("active");
    });

    it("maps terminal statuses to distinct tones", () => {
      expect(getOrderStatusTone(OrderStatus.DELIVERED)).toBe("success");
      expect(getOrderStatusTone(OrderStatus.COMPLETED)).toBe("completed");
      expect(getOrderStatusTone(OrderStatus.CANCELLED)).toBe("cancelled");
    });
  });

  describe("buildOrderTimeline", () => {
    it("marks completed steps done, the current step current, and later steps upcoming", () => {
      const steps = buildOrderTimeline(OrderStatus.SHIPPING);
      expect(steps.map((step) => step.state)).toEqual([
        "done",
        "done",
        "done",
        "done",
        "current",
        "upcoming",
        "upcoming",
      ]);
    });

    it("returns an empty timeline for cancelled orders", () => {
      expect(buildOrderTimeline(OrderStatus.CANCELLED)).toEqual([]);
    });

    it("marks the first step current for a pending payment order", () => {
      const steps = buildOrderTimeline(OrderStatus.PENDING_PAYMENT);
      expect(steps[0]).toEqual({
        status: OrderStatus.PENDING_PAYMENT,
        state: "current",
      });
      expect(steps.at(-1)).toEqual({
        status: OrderStatus.COMPLETED,
        state: "upcoming",
      });
    });
  });
});
