"use client";

import {
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

export default function GlobalError({
  reset,
}: {
  error: Error & {
    digest?: string;
  };

  reset: () => void;
}) {
  return (
    <main
      className="
        flex min-h-screen
        items-center
        justify-center
        bg-[#f7f7fb]
        px-5
      "
    >
      <section
        className="
          w-full max-w-[600px]
          rounded-[28px]
          border
          border-black/[0.06]
          bg-white
          p-8
          text-center
          shadow-[0_24px_80px_rgba(30,25,55,0.08)]
        "
      >
        <div
          className="
            mx-auto flex
            size-14
            items-center
            justify-center
            rounded-[18px]
            bg-[#fff0f2]
            text-[#c44151]
          "
        >
          <AlertTriangle
            className="size-6"
          />
        </div>

        <h1
          className="
            mt-6
            text-2xl
            font-bold
            tracking-[-0.04em]
            text-[#171522]
          "
        >
          Something went wrong
        </h1>

        <p
          className="
            mx-auto mt-3
            max-w-[420px]
            text-sm
            leading-6
            text-[#777486]
          "
        >
          The page could not be completed
          safely. You can retry the request
          without resubmitting identity
          information automatically.
        </p>

        <button
          type="button"
          onClick={reset}
          className="
            mt-7
            inline-flex h-12
            items-center
            justify-center
            gap-2
            rounded-[14px]
            bg-[#6252ed]
            px-5
            text-xs
            font-bold
            text-white
          "
        >
          <RefreshCw
            className="size-4"
          />

          Try again
        </button>
      </section>
    </main>
  );
}