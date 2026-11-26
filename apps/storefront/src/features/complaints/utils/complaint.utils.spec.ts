import { describe, expect, it } from "bun:test";
import { ComplaintStatus, OrderStatus } from "@greenroots/shared";
import type { ComplaintDto } from "../schemas/complaint.schema";
import {
  buildComplaintReason,
  buildComplaintTimeline,
  formatComplaintCountdown,
  isComplaintVideoDurationValid,
  resolveComplaintDeadline,
  resolveComplaintWindowState,
  validateComplaintImage,
  validateComplaintVideo,
} from "./complaint.utils";

describe("buildComplaintReason", () => {
  it("folds preset reason, affected items, and description into a single reason", () => {
    const reason = buildComplaintReason({
      reasonText: "Sản phẩm dập nát / héo úa",
      affectedItemNames: ["Cải xoăn Kale", "Cà rốt Đà Lạt"],
      description: "Lá bị dập nhẹ ở góc túi.",
    });

    expect(reason).toBe(
      "Sản phẩm dập nát / héo úa. Sản phẩm gặp sự cố: Cải xoăn Kale, Cà rốt Đà Lạt. Mô tả chi tiết: Lá bị dập nhẹ ở góc túi.",
    );
  });

  it("omits affected items and description when empty", () => {
    expect(
      buildComplaintReason({
        reasonText: "Khác",
        affectedItemNames: [],
        description: "",
      }),
    ).toBe("Khác");
  });

  it("caps the composed reason at 2000 characters", () => {
    const longDescription = "x".repeat(3000);
    const reason = buildComplaintReason({
      reasonText: "Khác",
      affectedItemNames: [],
      description: longDescription,
    });
    expect(reason.length).toBeLessThanOrEqual(2000);
  });
});

describe("resolveComplaintDeadline", () => {
  it("computes the deadline 24 hours after delivery", () => {
    const deliveredAt = "2026-11-25T08:00:00.000Z";
    const deliveredMs = new Date(deliveredAt).getTime();
    expect(resolveComplaintDeadline(deliveredAt)).toBe(
      deliveredMs + 24 * 60 * 60 * 1000,
    );
  });

  it("returns null for a missing or invalid timestamp", () => {
    expect(resolveComplaintDeadline(null)).toBeNull();
    expect(resolveComplaintDeadline("not-a-date")).toBeNull();
  });
});

describe("resolveComplaintWindowState", () => {
  const deliveredAt = "2026-11-25T08:00:00.000Z";
  const deadline = new Date(deliveredAt).getTime() + 24 * 60 * 60 * 1000;

  it("returns open inside the window", () => {
    expect(
      resolveComplaintWindowState(
        OrderStatus.DELIVERED,
        deliveredAt,
        deadline - 1,
      ),
    ).toBe("open");
  });

  it("returns expired once the deadline passes", () => {
    expect(
      resolveComplaintWindowState(
        OrderStatus.DELIVERED,
        deliveredAt,
        deadline + 1,
      ),
    ).toBe("expired");
  });

  it("returns not_eligible for non-delivered/completed orders", () => {
    expect(
      resolveComplaintWindowState(
        OrderStatus.SHIPPING,
        deliveredAt,
        deadline - 1,
      ),
    ).toBe("not_eligible");
  });

  it("returns not_eligible when deliveredAt is missing", () => {
    expect(
      resolveComplaintWindowState(OrderStatus.DELIVERED, null, deadline - 1),
    ).toBe("not_eligible");
  });
});

describe("formatComplaintCountdown", () => {
  it("formats a remaining duration as HH:MM:SS", () => {
    expect(formatComplaintCountdown(3_661_000)).toBe("01:01:01");
  });

  it("clamps negative durations to zero", () => {
    expect(formatComplaintCountdown(-1000)).toBe("00:00:00");
  });
});

describe("complaint media validation", () => {
  it("accepts JPEG, PNG, and WebP images within 5MB", () => {
    const jpeg = new File([new Uint8Array(10)], "a.jpg", {
      type: "image/jpeg",
    });
    expect(validateComplaintImage(jpeg)).toBeNull();
  });

  it("rejects disallowed image types and oversized images", () => {
    const gif = new File([new Uint8Array(10)], "a.gif", { type: "image/gif" });
    expect(validateComplaintImage(gif)).not.toBeNull();

    const large = new File([new Uint8Array(6 * 1024 * 1024)], "b.png", {
      type: "image/png",
    });
    expect(validateComplaintImage(large)).not.toBeNull();
  });

  it("accepts MP4 within 15MB and rejects disallowed types", () => {
    const mp4 = new File([new Uint8Array(10)], "a.mp4", { type: "video/mp4" });
    expect(validateComplaintVideo(mp4)).toBeNull();

    const mov = new File([new Uint8Array(10)], "a.mov", { type: "video/avi" });
    expect(validateComplaintVideo(mov)).not.toBeNull();
  });

  it("validates video duration against the 15s ceiling", () => {
    expect(isComplaintVideoDurationValid(15)).toBe(true);
    expect(isComplaintVideoDurationValid(15.1)).toBe(false);
    expect(isComplaintVideoDurationValid(Number.NaN)).toBe(false);
  });
});

describe("buildComplaintTimeline", () => {
  const complaint: ComplaintDto = {
    id: "019fa8bc-8f4d-7000-b366-e691f45cfb92",
    orderId: "019fa8bc-8f4d-7000-b366-e691f45cfb91",
    customerId: "019fa8bc-8f4d-7000-b366-e691f45cfb93",
    reason: "Rau bị dập nát",
    proofImageUrls: [],
    proofVideoUrl: null,
    status: ComplaintStatus.PENDING,
    resolution: null,
    createdAt: "2026-11-25T09:00:00.000Z",
    updatedAt: "2026-11-25T09:00:00.000Z",
  };

  it("marks the reviewing step as current for pending complaints", () => {
    const steps = buildComplaintTimeline(complaint);
    expect(steps[0]).toMatchObject({ key: "received", state: "completed" });
    expect(steps[1]).toMatchObject({ key: "reviewing", state: "current" });
    expect(steps[2]).toMatchObject({ key: "result", state: "upcoming" });
  });

  it("marks all steps completed once resolved", () => {
    const steps = buildComplaintTimeline({
      ...complaint,
      status: ComplaintStatus.APPROVED,
      resolution: "refund",
    });
    expect(steps.every((step) => step.state === "completed")).toBe(true);
  });
});
