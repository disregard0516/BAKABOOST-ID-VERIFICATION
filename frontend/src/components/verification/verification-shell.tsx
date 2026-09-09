import type {
  ReactNode,
} from "react";

import {
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import {
  VerificationHeader,
} from "@/components/verification/verification-header";

import {
  VerificationProgress,
} from "@/components/verification/verification-progress";

import type {
  VerificationStep,
} from "@/types/verification";

interface VerificationShellProps {
  currentStep: VerificationStep;
  currentStepComplete?: boolean;
  children: ReactNode;
}

export function VerificationShell({
  currentStep,
  currentStepComplete = false,
  children,
}: VerificationShellProps) {
  const currentYear =
    new Date().getFullYear();

  return (
    <div
      className="
        relative
        min-h-screen
        overflow-hidden
        bg-white
        text-slate-950
      "
    >
      {/* Background */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute inset-0
          bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)]
          bg-[size:42px_42px]
          opacity-[0.18]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          left-1/2
          top-[-360px]
          h-[650px]
          w-[1000px]
          -translate-x-1/2
          rounded-full
          bg-blue-500/[0.08]
          blur-[130px]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          right-[-180px]
          top-[280px]
          h-[420px]
          w-[420px]
          rounded-full
          bg-sky-400/[0.05]
          blur-[110px]
        "
      />

      <VerificationHeader />

      {/* Verification status / progress */}
      <div
        className="
          relative
          z-20
          border-b
          border-slate-100
          bg-white/60
          backdrop-blur-sm
        "
      >
        <div
          className="
            mx-auto
            w-full
            max-w-[1180px]
            px-4
            py-5
            sm:px-6
            sm:py-6
            lg:px-8
          "
        >
          <div
            className="
              mx-auto
              max-w-[820px]
            "
          >
            <VerificationProgress
              currentStep={
                currentStep
              }
              currentStepComplete={
                currentStepComplete
              }
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <main
        className="
          relative
          z-10
          mx-auto
          w-full
          max-w-[1180px]
          px-4
          pb-16
          pt-8
          sm:px-6
          sm:pb-20
          sm:pt-10
          lg:px-8
          lg:pt-12
        "
      >
        {children}
      </main>

      {/* SaaS footer */}
      <footer
        className="
          relative
          z-20
          mt-auto
          border-t
          border-slate-200
          bg-slate-50/80
        "
      >
        <div
          className="
            mx-auto
            w-full
            max-w-[1280px]
            px-4
            py-8
            sm:px-6
            lg:px-8
          "
        >
          <div
            className="
              flex
              flex-col
              gap-7
              md:flex-row
              md:items-center
              md:justify-between
            "
          >
            {/* Footer brand */}
            <div
              className="
                max-w-[440px]
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-2.5
                "
              >
                <div
                  className="
                    flex
                    size-8
                    items-center
                    justify-center
                    rounded-lg
                    bg-slate-950
                  "
                  aria-hidden="true"
                >
                  <ShieldCheck
                    className="
                      size-4
                      text-white
                    "
                  />
                </div>

                <span
                  className="
                    text-base
                    font-black
                    tracking-[-0.035em]
                    text-black
                  "
                >
                  BAKABOOST
                </span>
              </div>

              <p
                className="
                  mt-3
                  text-xs
                  leading-5
                  text-slate-500
                "
              >
                Secure identity verification
                designed to protect access while
                keeping your verification process
                simple and private.
              </p>
            </div>

            {/* Security information */}
            <div
              className="
                flex
                flex-col
                gap-3
                sm:flex-row
                sm:items-center
                sm:gap-6
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-2
                  text-xs
                  font-medium
                  text-slate-500
                "
              >
                <LockKeyhole
                  className="
                    size-3.5
                    text-blue-600
                  "
                  aria-hidden="true"
                />

                Secure verification session
              </div>

              <div
                className="
                  flex
                  items-center
                  gap-2
                  text-xs
                  font-medium
                  text-slate-500
                "
              >
                <ShieldCheck
                  className="
                    size-3.5
                    text-blue-600
                  "
                  aria-hidden="true"
                />

                Privacy-first handling
              </div>
            </div>
          </div>

          <div
            className="
              mt-7
              flex
              flex-col
              gap-3
              border-t
              border-slate-200
              pt-5
              text-[11px]
              text-slate-400
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <span>
              © {currentYear} BAKABOOST.
              All rights reserved.
            </span>

            <span
              className="
                max-w-[520px]
                leading-5
                sm:text-right
              "
            >
              Submitted evidence is retained
              according to the stated privacy
              and manual deletion policy.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}