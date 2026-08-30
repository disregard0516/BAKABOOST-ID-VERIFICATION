"use client";

import {
  AlertTriangle,
  LoaderCircle,
  X,
} from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;

  title: string;
  description: string;

  confirmLabel: string;
  cancelLabel?: string;

  danger?: boolean;
  loading?: boolean;

  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="
        fixed inset-0 z-[150]
        flex items-center
        justify-center
        bg-black/70
        p-4
        backdrop-blur-sm
      "
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onCancel}
        className="absolute inset-0"
      />

      <section
        className="
          relative z-10
          w-full max-w-[470px]
          rounded-[24px]
          border
          border-white/[0.08]
          bg-[#0d1622]
          p-6
          text-white
          shadow-[0_35px_120px_rgba(0,0,0,0.55)]
        "
      >
        <div
          className="
            flex items-start
            justify-between
            gap-5
          "
        >
          <div
            className="
              flex items-start
              gap-4
            "
          >
            <div
              className={`
                flex size-11
                shrink-0
                items-center
                justify-center
                rounded-[14px]
                ${
                  danger
                    ? "bg-red-500/10 text-red-300"
                    : "bg-violet-500/10 text-violet-300"
                }
              `}
            >
              <AlertTriangle
                className="size-5"
              />
            </div>

            <div>
              <h2
                id="confirm-title"
                className="
                  text-base
                  font-bold
                  tracking-[-0.02em]
                "
              >
                {title}
              </h2>

              <p
                className="
                  mt-2
                  text-[11px]
                  leading-5
                  text-slate-500
                "
              >
                {description}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="
              flex size-8
              shrink-0
              items-center
              justify-center
              rounded-xl
              text-slate-600
              transition
              hover:bg-white/[0.05]
              hover:text-white
              disabled:opacity-40
            "
          >
            <X className="size-4" />
          </button>
        </div>

        <div
          className="
            mt-7 grid
            grid-cols-2
            gap-3
          "
        >
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="
              h-11
              rounded-[13px]
              border
              border-white/[0.07]
              bg-white/[0.025]
              text-[10px]
              font-bold
              text-slate-400
              transition
              hover:bg-white/[0.06]
              hover:text-white
              disabled:opacity-40
            "
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`
              inline-flex h-11
              items-center
              justify-center
              gap-2
              rounded-[13px]
              text-[10px]
              font-bold
              text-white
              transition
              disabled:opacity-50
              ${
                danger
                  ? "bg-red-500 hover:bg-red-400"
                  : "bg-violet-500 hover:bg-violet-400"
              }
            `}
          >
            {loading && (
              <LoaderCircle
                className="
                  size-3.5
                  animate-spin
                "
              />
            )}

            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}