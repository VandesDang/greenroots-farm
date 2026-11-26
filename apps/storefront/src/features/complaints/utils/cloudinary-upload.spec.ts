import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import type { SignedUploadResponseDto } from "../schemas/complaint.schema";
import { ComplaintUploadError, uploadToCloudinary } from "./cloudinary-upload";

const signature: SignedUploadResponseDto = {
  signature: "abc123",
  timestamp: 1731744000,
  apiKey: "1234567890",
  cloudName: "greenroots-dev",
  folder: "complaints",
  resourceType: "image",
  maxBytes: 5 * 1024 * 1024,
};

afterEach(() => {
  mock.restore();
});

function buildFile(type = "image/jpeg"): File {
  return new File([new Uint8Array(64)], "proof.jpg", { type });
}

describe("uploadToCloudinary", () => {
  it("posts multipart form data and resolves the secure_url", async () => {
    const fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          secure_url:
            "https://res.cloudinary.com/greenroots-dev/image/upload/v1/complaints/proof.jpg",
        }),
        { status: 200 },
      ),
    );

    const url = await uploadToCloudinary(buildFile(), signature);

    expect(url).toContain("https://res.cloudinary.com/");
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [requestUrl, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(requestUrl).toBe(
      "https://api.cloudinary.com/v1_1/greenroots-dev/image/upload",
    );
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
  });

  it("throws a ComplaintUploadError when Cloudinary rejects the upload", async () => {
    spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: "Invalid signature" } }),
        { status: 400 },
      ),
    );

    let caught: unknown;
    try {
      await uploadToCloudinary(buildFile(), signature);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ComplaintUploadError);
  });

  it("throws a ComplaintUploadError when the response lacks a trusted secure_url", async () => {
    spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ secure_url: "https://evil.example/x.jpg" }),
        {
          status: 200,
        },
      ),
    );

    let caught: unknown;
    try {
      await uploadToCloudinary(buildFile(), signature);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ComplaintUploadError);
  });
});
