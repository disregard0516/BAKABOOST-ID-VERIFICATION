"use client";

import {
  CheckCircle2,
  XCircle,
} from "lucide-react";

export type ToastType =
  | "success"
  | "error";

export interface ToastState {
  type: ToastType;
  message: string;
}

export function Toast({
  toast,
}: {
  toast: ToastState | null;
}) {
  if (!toast) {
    return null;
  }

  const success =
    toast.type === "success";

  const Icon = success
    ? CheckCircle2
    : XCircle;

  return (
    <div
      className="
        fixed bottom-5
        right-5 z-[120]
        max-w-[380px]
        rounded-[16px]
        border
        border-white/[0.08]
        bg-[#101927]/95
        p-4
        shadow-[0_24px_80px_rgba(0,0,0,0.4)]
        backdrop-blur-xl
      "
    >
      <div
        className="
          flex items-start gap-3
        "
      >
        <Icon
          className={`
            mt-0.5 size-4
            shrink-0
            ${
              success
                ? "text-emerald-400"
                : "text-red-400"
            }
          `}
        />

        <p
          className="
            text-[11px]
            leading-5
            text-slate-300
          "
        >
          {toast.message}
        </p>
      </div>
    </div>
  );
}