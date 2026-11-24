import { describe, expect, it } from "bun:test";
import { OrderStatus } from "@greenroots/shared";
import {
  ORDER_HISTORY_MAX_PAGE_SIZE,
  ORDER_HISTORY_PAGE_SIZE,
  buildOrdersHref,
  buildOrdersQuery,
  parseOrderStatusFilter,
  parsePositiveIntParam,
} from "./orders-query";

describe("Orders Query", () => {
  describe("parseOrderStatusFilter", () => {
    it("returns the recognized status value", () => {
      expect(parseOrderStatusFilter("shipping")).toBe(OrderStatus.SHIPPING);
    });

    it("ignores unknown status values", () => {
      expect(parseOrderStatusFilter("confirmed")).toBeUndefined();
      expect(parseOrderStatusFilter("bogus")).toBeUndefined();
    });

    it("uses the first value for repeated params and falls back for empty values", () => {
      expect(parseOrderStatusFilter(["delivered", "cancelled"])).toBe(
        OrderStatus.DELIVERED,
      );
      expect(parseOrderStatusFilter(undefined)).toBeUndefined();
      expect(parseOrderStatusFilter("")).toBeUndefined();
    });
  });

  describe("parsePositiveIntParam", () => {
    const options = { min: 1, max: 100, fallback: 20 };

    it("parses valid integers within bounds", () => {
      expect(parsePositiveIntParam("3", options)).toBe(3);
      expect(parsePositiveIntParam("100", options)).toBe(100);
    });

    it("clamps out-of-bounds numeric values into range", () => {
      expect(parsePositiveIntParam("0", options)).toBe(1);
      expect(parsePositiveIntParam("101", options)).toBe(100);
    });

    it("falls back on non-numeric and missing values", () => {
      expect(parsePositiveIntParam("abc", options)).toBe(20);
      expect(parsePositiveIntParam("1.5", options)).toBe(20);
      expect(parsePositiveIntParam(undefined, options)).toBe(20);
    });
  });

  describe("buildOrdersQuery", () => {
    it("applies defaults when no search params are present", () => {
      expect(buildOrdersQuery({})).toEqual({
        status: undefined,
        page: 1,
        limit: ORDER_HISTORY_PAGE_SIZE,
      });
    });

    it("parses status, page, and limit while ignoring unknown status values", () => {
      expect(
        buildOrdersQuery({ status: "shipping", page: "2", limit: "50" }),
      ).toEqual({
        status: OrderStatus.SHIPPING,
        page: 2,
        limit: 50,
      });

      expect(buildOrdersQuery({ status: "confirmed" })).toEqual({
        status: undefined,
        page: 1,
        limit: ORDER_HISTORY_PAGE_SIZE,
      });
    });

    it("clamps limit to the backend ceiling", () => {
      expect(buildOrdersQuery({ limit: "500" })).toEqual({
        status: undefined,
        page: 1,
        limit: ORDER_HISTORY_MAX_PAGE_SIZE,
      });
    });
  });

  describe("buildOrdersHref", () => {
    it("returns the base path when no status or page is set", () => {
      expect(buildOrdersHref({})).toBe("/account/orders");
      expect(buildOrdersHref({ status: null })).toBe("/account/orders");
    });

    it("preserves status and omits page 1", () => {
      expect(buildOrdersHref({ status: OrderStatus.SHIPPING })).toBe(
        "/account/orders?status=shipping",
      );
      expect(buildOrdersHref({ status: OrderStatus.SHIPPING, page: 1 })).toBe(
        "/account/orders?status=shipping",
      );
    });

    it("appends page when greater than one", () => {
      expect(buildOrdersHref({ status: OrderStatus.SHIPPING, page: 2 })).toBe(
        "/account/orders?status=shipping&page=2",
      );
      expect(buildOrdersHref({ page: 3 })).toBe("/account/orders?page=3");
    });
  });
});
