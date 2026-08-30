"use client";

import {
  Check,
} from "lucide-react";

import {
  appConfig,
} from "@/lib/config";
import {
  cn,
} from "@/lib/utils";
import type {
  VerificationStep,
} from "@/types/verification";

interface VerificationProgressProps {
  currentStep: VerificationStep;
}

export function VerificationProgress({
  currentStep,
}: VerificationProgressProps) {
  const steps =
    appConfig.verificationSteps;

  const currentIndex =
    steps.findIndex(
      (step) =>
        step.key === currentStep,
    );

  return (
    <div className="w-full">
      <div
        className="
          relative grid
          grid-cols-5
          items-start
        "
      >
        <div
          className="
            absolute left-[10%]
            right-[10%]
            top-[17px]
            h-px
            bg-[#e6e3ee]
          "
        />

        <div
          className="
            absolute left-[10%]
            top-[17px]
            h-px
            bg-[linear-gradient(90deg,#7363ff,#9d8cff)]
            transition-all
            duration-700
          "
          style={{
            width:
              currentIndex <= 0
                ? "0%"
                : `${Math.min(
                    currentIndex * 20,
                    80,
                  )}%`,
          }}
        />

        {steps.map(
          (step, index) => {
            const complete =
              index < currentIndex;

            const active =
              index === currentIndex;

            return (
              <div
                key={step.key}
                className="
                  relative z-10
                  flex flex-col
                  items-center
                "
              >
                <div
                  className={cn(
                    `
                      flex size-[35px]
                      items-center
                      justify-center
                      rounded-full
                      border text-xs
                      font-bold
                      transition-all
                      duration-500
                    `,
                    complete &&
                      `
                        border-[#6f5ff7]
                        bg-[#6f5ff7]
                        text-white
                        shadow-[0_7px_18px_rgba(105,87,237,0.25)]
                      `,
                    active &&
                      `
                        border-[#6b5cf2]
                        bg-white
                        text-[#6152e5]
                        shadow-[0_0_0_6px_rgba(104,87,242,0.08)]
                      `,
                    !complete &&
                      !active &&
                      `
                        border-[#e2dfe9]
                        bg-[#f9f8fc]
                        text-[#aaa7b5]
                      `,
                  )}
                >
                  {complete ? (
                    <Check
                      className="size-4"
                      strokeWidth={2.5}
                    />
                  ) : (
                    index + 1
                  )}
                </div>

                <span
                  className={cn(
                    `
                      mt-3 text-center
                      text-[11px]
                      font-semibold
                      tracking-[-0.01em]
                    `,
                    active
                      ? "text-[#4f43c9]"
                      : complete
                        ? "text-[#444052]"
                        : "text-[#aaa7b5]",
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}