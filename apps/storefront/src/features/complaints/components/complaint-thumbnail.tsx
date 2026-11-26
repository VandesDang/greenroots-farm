"use client";

import Image from "next/image";
import { useState } from "react";
import { Leaf } from "lucide-react";
import { isApprovedStorefrontImageUrl } from "@/lib/image-url";

interface ComplaintImageProps {
  readonly src: string | null;
  readonly alt: string;
  readonly className?: string;
}

/**
 * Bounded image thumbnail with a brand fallback icon, honoring the storefront
 * `next/image` host allowlist for remote assets.
 */
export function ComplaintImage({ src, alt, className }: ComplaintImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const approvedSrc =
    src !== null && isApprovedStorefrontImageUrl(src) ? src : null;
  const showFallback = !approvedSrc || failedSrc === approvedSrc;

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-green-50 text-brand-forest ${
        className ?? "size-12"
      }`}
    >
      {showFallback ? (
        <Leaf className="size-5" aria-hidden="true" />
      ) : (
        <Image
          src={approvedSrc}
          alt={alt}
          fill
          sizes="96px"
          onError={() => setFailedSrc(approvedSrc)}
          className="object-cover"
        />
      )}
    </div>
  );
}
