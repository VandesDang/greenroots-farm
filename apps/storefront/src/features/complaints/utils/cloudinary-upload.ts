import type { SignedUploadResponseDto } from "../schemas/complaint.schema";

/** Raised when a direct Cloudinary upload fails or returns an untrusted payload. */
export class ComplaintUploadError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ComplaintUploadError";
  }
}

/** Cloudinary unsigned-request response fields we rely on after a direct upload. */
interface CloudinaryUploadResult {
  readonly secure_url?: unknown;
  readonly error?: { readonly message?: unknown };
}

/**
 * Uploads a proof asset directly to Cloudinary using server-issued signed parameters,
 * streaming the file from the browser without passing it through API memory (`ADR-0009`).
 *
 * @param file Source `File` to upload.
 * @param signature Signed parameters returned by `POST /api/v1/media/upload-signature`.
 * @returns The Cloudinary `secure_url` of the uploaded asset.
 */
export async function uploadToCloudinary(
  file: File,
  signature: SignedUploadResponseDto,
): Promise<string> {
  const uploadUrl = `https://api.cloudinary.com/v1_1/${signature.cloudName}/${signature.resourceType}/upload`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signature.apiKey);
  formData.append("timestamp", String(signature.timestamp));
  formData.append("signature", signature.signature);
  formData.append("folder", signature.folder);

  let response: Response;
  try {
    response = await fetch(uploadUrl, { method: "POST", body: formData });
  } catch {
    throw new ComplaintUploadError(
      "Không thể kết nối tới dịch vụ tải lên. Vui lòng thử lại.",
    );
  }

  let result: CloudinaryUploadResult;
  try {
    result = (await response.json()) as CloudinaryUploadResult;
  } catch {
    throw new ComplaintUploadError(
      "Dịch vụ tải lên trả về phản hồi không hợp lệ.",
    );
  }

  if (!response.ok) {
    const message =
      typeof result.error?.message === "string" && result.error.message
        ? result.error.message
        : "Tải lên thất bại. Vui lòng thử lại.";
    throw new ComplaintUploadError(message);
  }

  if (
    typeof result.secure_url !== "string" ||
    !result.secure_url.startsWith("https://res.cloudinary.com/")
  ) {
    throw new ComplaintUploadError(
      "Dịch vụ tải lên không trả về đường dẫn hợp lệ.",
    );
  }

  return result.secure_url;
}

/**
 * Reads a video file's duration in seconds from its metadata (browser-only).
 *
 * @returns Duration in seconds, or `NaN` when metadata cannot be parsed.
 */
export function readVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";

    video.addEventListener(
      "loadedmetadata",
      () => {
        URL.revokeObjectURL(objectUrl);
        resolve(video.duration);
      },
      { once: true },
    );
    video.addEventListener(
      "error",
      () => {
        URL.revokeObjectURL(objectUrl);
        resolve(Number.NaN);
      },
      { once: true },
    );
    video.src = objectUrl;
  });
}
