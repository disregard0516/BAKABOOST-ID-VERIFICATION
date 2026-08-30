"use client";

import {
  ExternalLink,
  Eye,
  FileImage,
  FileText,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";

import {
  useState,
} from "react";

import {
  getEvidencePreview,
} from "@/lib/admin-api";

import {
  formatDateTime,
} from "@/lib/date";

import type {
  EvidenceReviewItem,
} from "@/types/admin-review";


export function EvidenceReviewCard({
  evidence,
}: {
  evidence: EvidenceReviewItem;
}) {
  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );


  async function preview(): Promise<void> {
    setLoading(
      true,
    );

    setError(
      null,
    );

    try {
      const result =
        await getEvidencePreview(
          evidence.evidence_id,
        );

      const previewWindow =
        window.open(
          result.signed_url,
          "_blank",
          "noopener,noreferrer",
        );

      if (!previewWindow) {
        setError(
          "Your browser blocked the preview window. Allow pop-ups for this site and try again.",
        );
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to preview evidence.",
      );
    } finally {
      setLoading(
        false,
      );
    }
  }


  const readableType =
    evidence.evidence_type.replaceAll(
      "_",
      " ",
    );

  const isPdf =
    evidence.content_type
      .toLowerCase()
      .includes(
        "pdf",
      );

  const EvidenceIcon =
    isPdf
      ? FileText
      : FileImage;


  return (
    <article
      className="
        overflow-hidden
        rounded-[17px]
        border
        border-white/[0.07]
        bg-[#0c1420]
      "
    >
      <div
        className="
          flex
          items-start
          gap-3
          p-4
        "
      >
        <div
          className="
            flex
            size-11
            shrink-0
            items-center
            justify-center
            rounded-[13px]
            bg-violet-500/10
            text-violet-300
          "
        >
          <EvidenceIcon
            className="size-5"
            aria-hidden="true"
          />
        </div>


        <div
          className="
            min-w-0
            flex-1
          "
        >
          <div
            className="
              text-xs
              font-bold
              capitalize
              text-slate-200
            "
          >
            {readableType}
          </div>

          <div
            className="
              mt-1
              truncate
              text-[10px]
              text-slate-600
            "
            title={
              evidence.content_type
            }
          >
            {evidence.content_type}
          </div>

          <div
            className="
              mt-1
              text-[9px]
              text-slate-700
            "
          >
            Uploaded{" "}
            {formatDateTime(
              evidence.uploaded_at,
            )}
          </div>
        </div>
      </div>


      <div
        className="
          flex
          flex-col
          gap-3
          border-t
          border-white/[0.055]
          bg-black/10
          px-4
          py-3
          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >
        <div
          className="
            flex
            items-center
            gap-1.5
            text-[8px]
            text-slate-700
          "
        >
          <ShieldCheck
            className="size-3"
            aria-hidden="true"
          />

          Private evidence · temporary preview
        </div>


        <button
          type="button"
          onClick={() => {
            void preview();
          }}
          disabled={
            loading
          }
          className="
            inline-flex
            min-h-9
            items-center
            justify-center
            gap-2
            rounded-xl
            border
            border-white/[0.07]
            bg-white/[0.03]
            px-3
            text-[10px]
            font-semibold
            text-slate-400
            transition
            hover:bg-white/[0.07]
            hover:text-white
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          {loading ? (
            <LoaderCircle
              className="
                size-3.5
                animate-spin
              "
              aria-hidden="true"
            />
          ) : (
            <Eye
              className="size-3.5"
              aria-hidden="true"
            />
          )}

          {loading
            ? "Opening"
            : "Preview"}

          <ExternalLink
            className="size-3"
            aria-hidden="true"
          />
        </button>
      </div>


      {error && (
        <div
          role="alert"
          className="
            border-t
            border-red-500/15
            bg-red-500/[0.05]
            px-4
            py-3
            text-[9px]
            leading-4
            text-red-300
          "
        >
          {error}
        </div>
      )}
    </article>
  );
}