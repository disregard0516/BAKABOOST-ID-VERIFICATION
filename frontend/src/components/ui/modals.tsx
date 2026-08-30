"use client";

import type {
  ReactNode,
} from "react";

import {
  X,
} from "lucide-react";

interface ModalProps {
  open: boolean;
  title: string;

  description?: string;

  children: ReactNode;

  onClose: () => void;
}

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
}: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="
        fixed inset-0 z-[100]
        flex items-center
        justify-center
        bg-black/65
        p-4
        backdrop-blur-sm
      "
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="
          absolute inset-0
          cursor-default
        "
      />

      <section
        className="
          relative z-10
          w-full max-w-[520px]
          rounded-[22px]
          border
          border-white/[0.08]
          bg-[#0d1622]
          p-5
          text-white
          shadow-[0_30px_120px_rgba(0,0,0,0.5)]
        "
      >
        <div
          className="
            flex items-start
            justify-between gap-4
          "
        >
          <div>
            <h2
              className="
                text-base
                font-bold
              "
            >
              {title}
            </h2>

            {description && (
              <p
                className="
                  mt-2 text-[10px]
                  leading-5
                  text-slate-500
                "
              >
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              flex size-8
              shrink-0
              items-center
              justify-center
              rounded-xl
              text-slate-600
              transition
              hover:bg-white/[0.06]
              hover:text-white
            "
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5">
          {children}
        </div>
      </section>
    </div>
  );
}