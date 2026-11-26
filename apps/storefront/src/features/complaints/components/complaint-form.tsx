"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  Alert,
  Button,
  Checkbox,
  RadioGroup,
  RadioGroupItem,
  Textarea,
  toast,
} from "@greenroots/ui";
import { ImagePlus, Loader2, Send, Trash2, Video } from "lucide-react";
import { BUSINESS_RULES } from "@greenroots/shared";
import type { OrderDto } from "@/features/orders/schemas/order.schema";
import type { ComplaintDto } from "../schemas/complaint.schema";
import { submitComplaintAction } from "../actions/complaint-actions";
import {
  COMPLAINT_DESCRIPTION_MAX_LENGTH,
  COMPLAINT_REASON_OPTIONS,
  resolveComplaintReasonLabel,
  type ComplaintReasonType,
} from "../constants/complaint-constants";
import {
  buildComplaintReason,
  isComplaintVideoDurationValid,
  validateComplaintImage,
  validateComplaintVideo,
} from "../utils/complaint.utils";
import {
  readVideoDurationSeconds,
  uploadToCloudinary,
} from "../utils/cloudinary-upload";
import { requestComplaintUploadSignatureAction } from "../actions/complaint-actions";

interface ComplaintFormProps {
  readonly order: OrderDto;
  readonly expired: boolean;
  readonly onSubmitted: (complaint: ComplaintDto) => void;
  readonly onSessionInvalidated: () => void;
}

interface ImageUpload {
  readonly id: string;
  readonly file: File;
  readonly previewUrl: string;
  readonly status: "uploading" | "ready" | "error";
  readonly url: string | null;
  readonly error: string | null;
}

interface VideoUpload {
  readonly file: File;
  readonly status: "uploading" | "ready" | "error";
  readonly url: string | null;
  readonly error: string | null;
}

function isComplaintReasonType(value: string): value is ComplaintReasonType {
  return COMPLAINT_REASON_OPTIONS.some((option) => option.value === value);
}

/**
 * SF-05 complaint form (`khi_u_n_i_n_h_ng.html`) with direct-to-Cloudinary proof
 * uploads and a single `reason` submission mapped to the real complaint API.
 */
export function ComplaintForm({
  order,
  expired,
  onSubmitted,
  onSessionInvalidated,
}: ComplaintFormProps) {
  const [reasonType, setReasonType] = useState<ComplaintReasonType>("damaged");
  const [customReason, setCustomReason] = useState("");
  const [affectedIds, setAffectedIds] = useState<readonly string[]>(
    order.items.map((item) => item.id),
  );
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<readonly ImageUpload[]>([]);
  const [video, setVideo] = useState<VideoUpload | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const isUploading =
    images.some((image) => image.status === "uploading") ||
    video?.status === "uploading";
  const readyImageUrls = images
    .filter((image) => image.status === "ready" && image.url !== null)
    .map((image) => image.url!);

  const customReasonError =
    reasonType === "other" && customReason.trim().length === 0
      ? "Vui lòng nhập lý do khiếu nại khác."
      : null;

  const canSubmit =
    !expired &&
    !isUploading &&
    !submitting &&
    readyImageUrls.length > 0 &&
    video?.status !== "error" &&
    customReasonError === null;

  async function addImages(files: readonly File[]) {
    const remaining = BUSINESS_RULES.COMPLAINT_MAX_IMAGES - images.length;
    if (remaining <= 0) {
      return;
    }

    const accepted: ImageUpload[] = [];
    for (const file of files.slice(0, remaining)) {
      const error = validateComplaintImage(file);
      if (error) {
        setSubmitError(error);
        continue;
      }
      accepted.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "uploading",
        url: null,
        error: null,
      });
    }
    if (accepted.length === 0) {
      return;
    }

    setImages((current) => [...current, ...accepted]);
    setSubmitError(null);

    await Promise.all(
      accepted.map(async (upload) => {
        const signatureResult = await requestComplaintUploadSignatureAction({
          resourceType: "image",
          fileSizeBytes: upload.file.size,
        });
        if (!signatureResult.ok) {
          if (signatureResult.sessionInvalidated) {
            onSessionInvalidated();
            return;
          }
          updateImage(upload.id, {
            status: "error",
            error: signatureResult.message,
          });
          return;
        }

        try {
          const url = await uploadToCloudinary(
            upload.file,
            signatureResult.signature,
          );
          updateImage(upload.id, { status: "ready", url, error: null });
        } catch (uploadError) {
          updateImage(upload.id, {
            status: "error",
            error:
              uploadError instanceof Error
                ? uploadError.message
                : "Tải ảnh lên thất bại.",
          });
        }
      }),
    );
  }

  function updateImage(
    id: string,
    patch: Partial<Pick<ImageUpload, "status" | "url" | "error">>,
  ) {
    setImages((current) =>
      current.map((image) =>
        image.id === id ? { ...image, ...patch } : image,
      ),
    );
  }

  function removeImage(id: string) {
    setImages((current) => {
      const target = current.find((image) => image.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((image) => image.id !== id);
    });
  }

  async function handleVideo(file: File) {
    const error = validateComplaintVideo(file);
    if (error) {
      setSubmitError(error);
      return;
    }

    const duration = await readVideoDurationSeconds(file);
    if (!isComplaintVideoDurationValid(duration)) {
      setSubmitError("Video vượt quá thời lượng 15 giây.");
      return;
    }

    setVideo({ file, status: "uploading", url: null, error: null });
    setSubmitError(null);

    const signatureResult = await requestComplaintUploadSignatureAction({
      resourceType: "video",
      fileSizeBytes: file.size,
    });
    if (!signatureResult.ok) {
      if (signatureResult.sessionInvalidated) {
        onSessionInvalidated();
        return;
      }
      setVideo({
        file,
        status: "error",
        url: null,
        error: signatureResult.message,
      });
      return;
    }

    try {
      const url = await uploadToCloudinary(file, signatureResult.signature);
      setVideo({ file, status: "ready", url, error: null });
    } catch (uploadError) {
      setVideo({
        file,
        status: "error",
        url: null,
        error:
          uploadError instanceof Error
            ? uploadError.message
            : "Tải video lên thất bại.",
      });
    }
  }

  async function handleSubmit() {
    setSubmitError(null);

    if (readyImageUrls.length === 0) {
      setSubmitError("Vui lòng tải ít nhất 1 ảnh bằng chứng.");
      return;
    }
    if (description.trim().length === 0) {
      setSubmitError("Vui lòng mô tả chi tiết tình trạng sản phẩm.");
      return;
    }

    const reasonText =
      reasonType === "other"
        ? customReason.trim()
        : resolveComplaintReasonLabel(reasonType);
    const affectedNames = order.items
      .filter((item) => affectedIds.includes(item.id))
      .map((item) => item.productName);
    const reason = buildComplaintReason({
      reasonText,
      affectedItemNames: affectedNames,
      description,
    });

    setSubmitting(true);
    const result = await submitComplaintAction({
      orderId: order.id,
      reason,
      proofImageUrls: readyImageUrls,
      ...(video?.status === "ready" && video.url !== null
        ? { proofVideoUrl: video.url }
        : {}),
    });
    setSubmitting(false);

    if (!result.ok) {
      if (result.sessionInvalidated) {
        onSessionInvalidated();
        return;
      }
      setSubmitError(result.message);
      return;
    }

    toast.success("Đã gửi khiếu nại thành công!");
    onSubmitted(result.complaint);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
      className="flex flex-col gap-6"
      noValidate
    >
      {/* Reason selection */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-bold text-gray-900">Lý do khiếu nại</span>
        <RadioGroup
          value={reasonType}
          onValueChange={(value) => {
            if (typeof value === "string" && isComplaintReasonType(value)) {
              setReasonType(value);
            }
          }}
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {COMPLAINT_REASON_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm font-semibold text-gray-900 transition-colors ${
                reasonType === option.value
                  ? "border-brand-forest bg-green-50"
                  : "border-border-subtle bg-surface-warm hover:border-brand-forest"
              }`}
            >
              <RadioGroupItem value={option.value} />
              <span>{option.label}</span>
            </label>
          ))}
        </RadioGroup>

        {reasonType === "other" ? (
          <div className="flex flex-col gap-1 pt-1">
            <Textarea
              value={customReason}
              onChange={(event) => setCustomReason(event.target.value)}
              maxLength={150}
              placeholder="Nhập lý do khiếu nại khác..."
              rows={2}
              className="bg-surface-warm"
            />
            <span className="text-xs text-brand-dark">
              Vui lòng nhập lý do cụ thể và mô tả chi tiết tình trạng ở mục bên
              dưới.
            </span>
          </div>
        ) : null}
      </div>

      {/* Affected items */}
      <div className="flex flex-col gap-2 border-t border-border-subtle pt-6">
        <span className="text-sm font-bold text-gray-900">
          Sản phẩm gặp sự cố
        </span>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {order.items.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-center gap-2 rounded-md bg-surface-warm p-3"
            >
              <Checkbox
                checked={affectedIds.includes(item.id)}
                onCheckedChange={(checked) => {
                  setAffectedIds((current) =>
                    checked
                      ? [...current, item.id]
                      : current.filter((id) => id !== item.id),
                  );
                }}
              />
              <span className="text-sm text-gray-900">
                {item.productName}
                <span className="ml-1 text-xs text-gray-500 tabular-nums">
                  {item.unit} × {item.quantity}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Description */}
      <label className="flex flex-col gap-1 border-t border-border-subtle pt-6">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-gray-900">
            Mô tả chi tiết tình trạng
          </span>
          <span className="text-xs text-gray-500 tabular-nums">
            {description.length} / {COMPLAINT_DESCRIPTION_MAX_LENGTH} ký tự
          </span>
        </div>
        <Textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          maxLength={COMPLAINT_DESCRIPTION_MAX_LENGTH}
          placeholder="Mô tả rõ tình trạng sản phẩm khi nhận hàng để bộ phận hỗ trợ xử lý nhanh nhất..."
          className="bg-surface-warm"
        />
      </label>

      {/* Photo upload */}
      <div className="flex flex-col gap-2 border-t border-border-subtle pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-gray-900">
              Hình ảnh thực tế
            </span>
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-800">
              Bắt buộc 1–{BUSINESS_RULES.COMPLAINT_MAX_IMAGES} ảnh
            </span>
          </div>
          <span className="text-xs font-semibold text-brand-dark tabular-nums">
            {readyImageUrls.length} / {BUSINESS_RULES.COMPLAINT_MAX_IMAGES} ảnh
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative aspect-square overflow-hidden rounded-md bg-surface-warm"
            >
              <Image
                src={image.previewUrl}
                alt="Ảnh sản phẩm khiếu nại"
                fill
                unoptimized
                sizes="96px"
                className="object-cover"
              />
              {image.status === "uploading" ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2
                    className="size-5 animate-spin text-white"
                    aria-hidden="true"
                  />
                </div>
              ) : null}
              {image.status === "error" ? (
                <div className="absolute inset-x-0 bottom-0 bg-red-600/90 px-1 py-0.5 text-center text-[10px] text-white">
                  Lỗi tải lên
                </div>
              ) : null}
              <button
                type="button"
                aria-label="Xóa ảnh"
                onClick={() => removeImage(image.id)}
                className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-gray-900 text-white hover:bg-red-600"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          ))}

          {images.length < BUSINESS_RULES.COMPLAINT_MAX_IMAGES ? (
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed border-brand-forest bg-green-50 p-2 text-center text-brand-dark transition-colors hover:bg-green-100"
            >
              <ImagePlus className="size-5" aria-hidden="true" />
              <span className="text-xs font-semibold">Thêm ảnh</span>
            </button>
          ) : null}
        </div>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            void addImages(files);
          }}
        />
      </div>

      {/* Optional video */}
      <div className="flex flex-col gap-2 border-t border-border-subtle pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-bold text-gray-900">
            Video mở hộp (tùy chọn)
          </span>
          <span className="text-xs text-gray-500 tabular-nums">
            Tối đa 1 video, ≤ 15s, ≤ 15MB
          </span>
        </div>

        {video ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-surface-warm p-3">
            <div className="flex items-center gap-2">
              <Video className="size-5 text-brand-forest" aria-hidden="true" />
              <span className="text-sm text-gray-900">{video.file.name}</span>
            </div>
            <div className="flex items-center gap-2">
              {video.status === "uploading" ? (
                <Loader2
                  className="size-4 animate-spin text-brand-forest"
                  aria-hidden="true"
                />
              ) : (
                <span className="text-xs font-semibold text-brand-dark">
                  Đã tải lên
                </span>
              )}
              <button
                type="button"
                aria-label="Xóa video"
                onClick={() => setVideo(null)}
                className="flex size-6 items-center justify-center rounded-full bg-gray-900 text-white hover:bg-red-600"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border-subtle bg-surface-warm p-3 hover:border-brand-forest"
          >
            <div className="flex items-center gap-2">
              <Video className="size-5 text-brand-forest" aria-hidden="true" />
              <div className="flex flex-col text-left">
                <span className="text-sm font-semibold text-gray-900">
                  Chọn video quay cận cảnh sản phẩm
                </span>
                <span className="text-xs text-gray-500">
                  Định dạng MP4, MOV (thời lượng ≤ 15 giây, dung lượng ≤ 15MB)
                </span>
              </div>
            </div>
            <span className="rounded border border-border-subtle bg-white px-3 py-1.5 text-xs font-semibold text-brand-dark">
              Tải video
            </span>
          </button>
        )}
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) {
              void handleVideo(file);
            }
          }}
        />

        {video?.status === "error" && video.error ? (
          <Alert variant="destructive">
            <span>{video.error}</span>
          </Alert>
        ) : null}
      </div>

      {/* Submit action */}
      <div className="flex flex-col gap-3 border-t border-border-subtle pt-6 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-gray-500">
          Bộ phận chăm sóc khách hàng phản hồi trong vòng 2 giờ.
        </span>
        <Button
          type="submit"
          disabled={!canSubmit}
          className="gap-1.5 px-6 py-3"
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="size-4" aria-hidden="true" />
          )}
          Gửi khiếu nại
        </Button>
      </div>

      {submitError ? (
        <Alert variant="destructive">
          <span>{submitError}</span>
        </Alert>
      ) : null}
    </form>
  );
}
