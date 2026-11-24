import Image from "next/image";
import { Leaf } from "lucide-react";
import { isApprovedStorefrontImageUrl } from "@/lib/image-url";

interface OrderItemThumbnailProps {
  readonly imageUrl: string | null;
  readonly alt: string;
  readonly size?: "sm" | "md";
}

/**
 * Line-item product thumbnail with an organic leaf placeholder for missing or
 * non-approved image URLs (`products.imageUrls[0] ?? null`, `EDGE-12`).
 *
 * @param props Product thumbnail URL, accessible alt text, and optional size.
 * @returns Fixed-size thumbnail square with a centered fallback glyph.
 */
export function OrderItemThumbnail({
  imageUrl,
  alt,
  size = "sm",
}: OrderItemThumbnailProps) {
  const boxClass = size === "md" ? "size-16" : "size-11";
  const safeUrl =
    imageUrl && isApprovedStorefrontImageUrl(imageUrl) ? imageUrl : null;

  return (
    <span
      className={`relative ${boxClass} flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-warm`}
    >
      {safeUrl ? (
        <Image
          src={safeUrl}
          alt={alt}
          fill
          sizes={size === "md" ? "64px" : "44px"}
          className="object-cover"
        />
      ) : (
        <Leaf className="size-5 text-brand-forest/70" aria-hidden="true" />
      )}
    </span>
  );
}
