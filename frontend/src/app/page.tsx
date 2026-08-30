import Link from "next/link";

import {
  ArrowRight,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import {
  VerificationShell,
} from "@/components/verification/verification-shell";

export default function HomePage() {
  return (
    <VerificationShell currentStep="account">
      <section
        className="
          glass-card
          mx-auto
          max-w-[780px]
          overflow-hidden
          rounded-[30px]
        "
      >
        <div
          className="
            relative
            px-6 py-9
            sm:px-10 sm:py-12
          "
        >
          <div
            aria-hidden="true"
            className="
              absolute
              right-[-50px]
              top-[-70px]
              size-[210px]
              rounded-full
              bg-[#7868ff]/10
              blur-3xl
            "
          />

          <div
            className="
              relative
              mx-auto
              max-w-[570px]
              text-center
            "
          >
            <div
              className="
                mx-auto mb-6
                flex size-14
                items-center
                justify-center
                rounded-[18px]
                bg-[#efedff]
                text-[#6657f5]
                shadow-[inset_0_0_0_1px_rgba(102,87,245,0.08)]
              "
            >
              <ShieldCheck
                className="size-7"
                strokeWidth={2}
              />
            </div>

            <div
              className="
                mb-3
                inline-flex
                items-center gap-2
                rounded-full
                border border-[#ded9ff]
                bg-[#f5f3ff]
                px-3 py-1.5
                text-[11px]
                font-bold uppercase
                tracking-[0.08em]
                text-[#6959df]
              "
            >
              <Sparkles className="size-3" />

              Private verification
            </div>

            <h1
              className="
                text-[32px]
                font-bold
                tracking-[-0.045em]
                text-[#171522]
                sm:text-[42px]
              "
            >
              Verify your account
              before entering.
            </h1>

            <p
              className="
                mx-auto mt-4
                max-w-[510px]
                text-[14px]
                leading-6
                text-[#777486]
                sm:text-[15px]
              "
            >
              Verification begins from a
              private link issued specifically
              for your Discord account.
            </p>

            <div
              className="
                mx-auto mt-8
                max-w-[440px]
                rounded-[18px]
                border border-[#e6e2ff]
                bg-[#f8f7ff]
                p-5
                text-left
              "
            >
              <div className="flex items-start gap-3">
                <div
                  className="
                    flex size-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-[11px]
                    bg-white
                    text-[#6657f5]
                    shadow-sm
                  "
                >
                  <KeyRound className="size-4" />
                </div>

                <div>
                  <div
                    className="
                      text-sm
                      font-bold
                      text-[#282531]
                    "
                  >
                    Open your private link
                  </div>

                  <p
                    className="
                      mt-1
                      text-xs
                      leading-5
                      text-[#858191]
                    "
                  >
                    Use the verification URL
                    sent to you by the
                    administrator. The link
                    contains the secure request
                    token needed before Discord
                    authentication can begin.
                  </p>
                </div>
              </div>
            </div>

            <div
              className="
                mx-auto mt-6
                flex max-w-[460px]
                items-start gap-3
                rounded-[16px]
                border border-[#ebe9f0]
                bg-white/70
                p-4
                text-left
              "
            >
              <LockKeyhole
                className="
                  mt-0.5 size-4
                  shrink-0
                  text-[#7770b8]
                "
              />

              <p
                className="
                  text-[11px]
                  leading-5
                  text-[#858191]
                "
              >
                A verification link only gives
                permission to attempt
                verification. Your authenticated
                Discord User ID must match the
                assigned account, and server
                access remains blocked until an
                administrator approves the case.
              </p>
            </div>

            <Link
              href="/admin/login"
              className="
                focus-ring
                group mt-7
                inline-flex
                items-center gap-2
                rounded-[12px]
                px-3 py-2
                text-xs font-semibold
                text-[#746f85]
                transition
                hover:bg-white/70
                hover:text-[#6252ed]
              "
            >
              Administrator sign in

              <ArrowRight
                className="
                  size-3.5
                  transition-transform
                  group-hover:translate-x-0.5
                "
              />
            </Link>
          </div>
        </div>
      </section>
    </VerificationShell>
  );
}