"use client";

import {
  CheckCircle2,
  X,
  XCircle,
} from "lucide-react";

import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

type ToastType =
  | "success"
  | "error";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  success: (
    message: string,
  ) => void;

  error: (
    message: string,
  ) => void;
}

const ToastContext =
  createContext<ToastContextValue | null>(
    null,
  );

export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [
    toasts,
    setToasts,
  ] =
    useState<ToastItem[]>(
      [],
    );

  const show = useCallback(
    (
      type: ToastType,
      message: string,
    ) => {
      const id = Date.now();

      setToasts(
        (current) => [
          ...current,
          {
            id,
            type,
            message,
          },
        ],
      );

      window.setTimeout(
        () => {
          setToasts(
            (current) =>
              current.filter(
                (toast) =>
                  toast.id !== id,
              ),
          );
        },
        4500,
      );
    },
    [],
  );

  const dismiss =
    useCallback(
      (id: number) => {
        setToasts(
          (current) =>
            current.filter(
              (toast) =>
                toast.id !== id,
            ),
        );
      },
      [],
    );

  return (
    <ToastContext.Provider
      value={{
        success: (message) =>
          show(
            "success",
            message,
          ),

        error: (message) =>
          show(
            "error",
            message,
          ),
      }}
    >
      {children}

      <div
        className="
          pointer-events-none
          fixed bottom-5
          right-5
          z-[200]
          flex w-[calc(100%-2.5rem)]
          max-w-[390px]
          flex-col gap-3
        "
      >
        {toasts.map(
          (toast) => {
            const success =
              toast.type ===
              "success";

            const Icon =
              success
                ? CheckCircle2
                : XCircle;

            return (
              <div
                key={toast.id}
                className="
                  pointer-events-auto
                  rounded-[16px]
                  border
                  border-white/[0.08]
                  bg-[#101927]/95
                  p-4
                  text-white
                  shadow-[0_24px_80px_rgba(0,0,0,0.42)]
                  backdrop-blur-xl
                "
              >
                <div
                  className="
                    flex
                    items-start
                    gap-3
                  "
                >
                  <Icon
                    className={`
                      mt-0.5
                      size-4
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
                      flex-1
                      text-[11px]
                      leading-5
                      text-slate-300
                    "
                  >
                    {toast.message}
                  </p>

                  <button
                    type="button"
                    aria-label="Dismiss notification"
                    onClick={() =>
                      dismiss(
                        toast.id,
                      )
                    }
                    className="
                      flex size-6
                      items-center
                      justify-center
                      rounded-lg
                      text-slate-600
                      hover:bg-white/[0.05]
                      hover:text-white
                    "
                  >
                    <X
                      className="size-3"
                    />
                  </button>
                </div>
              </div>
            );
          },
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context =
    useContext(
      ToastContext,
    );

  if (!context) {
    throw new Error(
      "useToast must be used inside ToastProvider.",
    );
  }

  return context;
}