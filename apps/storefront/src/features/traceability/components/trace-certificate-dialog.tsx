"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  buttonVariants,
} from "@greenroots/ui";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { FARM_METADATA } from "@/constants/farm-metadata.constant";

interface TraceCertificateDialogProps {
  readonly farmName: string;
  readonly legalName: string;
  readonly address: string;
  readonly certificationUrl: string | null;
}

/**
 * Client-side VietGAP certificate modal for the public trace detail view.
 * Renders a disabled "chưa cập nhật" notice when `certificationUrl` is missing
 * instead of linking to a fabricated certificate document.
 *
 * @param props Farm identity and nullable VietGAP certificate URL.
 * @returns Certificate trigger button plus dialog, or an unavailable notice.
 */
export function TraceCertificateDialog({
  farmName,
  legalName,
  address,
  certificationUrl,
}: TraceCertificateDialogProps) {
  const [open, setOpen] = useState(false);

  if (!certificationUrl) {
    return (
      <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500">
        <ShieldCheck className="size-4" aria-hidden="true" />
        Chưa cập nhật chứng chỉ VietGAP
      </p>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-9 cursor-pointer rounded-full border-brand-forest bg-surface-warm px-5 font-semibold text-brand-dark hover:bg-green-50"
      >
        <ShieldCheck className="size-4" aria-hidden="true" />
        Chứng nhận VietGAP
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-surface-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold text-brand-dark">
              <ShieldCheck
                className="size-5 text-brand-forest"
                aria-hidden="true"
              />
              Chứng nhận VietGAP
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {farmName}
            </DialogDescription>
          </DialogHeader>

          <div className="divide-y divide-border-subtle border-y border-border-subtle text-xs">
            <div className="flex justify-between gap-3 py-2.5">
              <span className="text-gray-500">Đơn vị được cấp</span>
              <span className="text-right font-semibold text-gray-900">
                {farmName}
              </span>
            </div>
            <div className="flex justify-between gap-3 py-2.5">
              <span className="text-gray-500">Pháp nhân</span>
              <span className="text-right font-semibold text-gray-900">
                {legalName}
              </span>
            </div>
            <div className="flex justify-between gap-3 py-2.5">
              <span className="text-gray-500">Địa chỉ</span>
              <span className="text-right font-semibold text-gray-900">
                {address}
              </span>
            </div>
            <div className="flex justify-between gap-3 py-2.5">
              <span className="text-gray-500">Mã chứng nhận</span>
              <span className="font-semibold text-brand-dark tabular-nums">
                {FARM_METADATA.certificationCode}
              </span>
            </div>
          </div>

          <a
            href={certificationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({
              className:
                "w-full bg-brand-forest font-semibold text-white hover:bg-brand-dark",
            })}
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            Mở chứng chỉ gốc
          </a>
        </DialogContent>
      </Dialog>
    </>
  );
}
