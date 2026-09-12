import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";

import {
  VerificationShell,
} from "@/components/verification/verification-shell";


export default function HomePage() {
  return (
    <VerificationShell currentStep="account">
      <section
        className="
          relative
          mx-auto
          w-full
          max-w-[960px]
          overflow-hidden
          rounded-[32px]
          border
          border-[#e8e5f2]
          bg-white/90
          shadow-[0_28px_90px_rgba(37,29,76,0.08)]
          backdrop-blur-xl
        "
      >
        {/* Decorative background */}

        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            -right-28
            -top-36
            size-[380px]
            rounded-full
            bg-[#7868ff]/[0.09]
            blur-[90px]
          "
        />

        <div
          aria-hidden="true"
          className="
            pointer-events-none
            -bottom-36
            -left-28
            absolute
            size-[340px]
            rounded-full
            bg-sky-400/[0.06]
            blur-[90px]
          "
        />

        <div
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            inset-0
            bg-[linear-gradient(to_right,rgba(103,87,245,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(103,87,245,0.025)_1px,transparent_1px)]
            bg-[size:42px_42px]
            [mask-image:linear-gradient(to_bottom,black,transparent_80%)]
          "
        />

        <div
          className="
            relative
            z-10
            grid
            min-h-[600px]
            lg:grid-cols-[1.08fr_0.92fr]
          "
        >
          {/* =====================================================
              MAIN CONTENT
          ====================================================== */}

          <div
            className="
              flex
              items-center
              px-6
              py-10
              sm:px-10
              sm:py-14
              lg:px-12
              xl:px-14
            "
          >
            <div className="w-full max-w-[510px]">
              {/* Brand / trust badge */}

              <div
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-[#ded9ff]
                  bg-[#f7f5ff]
                  px-3
                  py-1.5
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.12em]
                  text-[#6959df]
                "
              >
                <Sparkles
                  className="size-3"
                  aria-hidden="true"
                />

                SCANLY Verification
              </div>

              {/* Icon */}

              <div
                className="
                  mt-7
                  flex
                  size-[58px]
                  items-center
                  justify-center
                  rounded-[18px]
                  bg-[#efedff]
                  text-[#6657f5]
                  shadow-[inset_0_0_0_1px_rgba(102,87,245,0.08),0_12px_35px_rgba(102,87,245,0.08)]
                "
              >
                <Fingerprint
                  className="size-7"
                  strokeWidth={1.9}
                  aria-hidden="true"
                />
              </div>

              {/* Heading */}

              <h1
                className="
                  mt-7
                  max-w-[500px]
                  text-[38px]
                  font-extrabold
                  leading-[1.04]
                  tracking-[-0.055em]
                  text-[#171522]
                  sm:text-[48px]
                "
              >
                Identity verification,
                <br />

                <span className="text-[#777486]">
                  built around trust.
                </span>
              </h1>

              <p
                className="
                  mt-5
                  max-w-[480px]
                  text-[13px]
                  leading-[1.85]
                  text-[#777486]
                  sm:text-[14px]
                "
              >
                SCANLY uses private verification requests
                to securely confirm your Discord account and
                collect the information required for manual
                administrator review.
              </p>

              {/* Status */}

              <div
                className="
                  mt-7
                  inline-flex
                  items-center
                  gap-2.5
                  rounded-[12px]
                  border
                  border-[#e8e5ee]
                  bg-[#fbfaff]
                  px-3.5
                  py-2.5
                "
              >
                <span
                  className="
                    relative
                    flex
                    size-2
                  "
                >
                  <span
                    className="
                      absolute
                      inline-flex
                      size-full
                      animate-ping
                      rounded-full
                      bg-emerald-400
                      opacity-40
                    "
                  />

                  <span
                    className="
                      relative
                      inline-flex
                      size-2
                      rounded-full
                      bg-emerald-500
                    "
                  />
                </span>

                <span
                  className="
                    text-[10px]
                    font-semibold
                    text-[#5e5a69]
                  "
                >
                  Private verification portal
                </span>
              </div>

              {/* Important information */}

              <div
                className="
                  mt-8
                  rounded-[19px]
                  border
                  border-[#e7e3ff]
                  bg-[#faf9ff]
                  p-5
                "
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className="
                      flex
                      size-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-[12px]
                      border
                      border-[#ebe8ff]
                      bg-white
                      text-[#6657f5]
                      shadow-sm
                    "
                  >
                    <KeyRound
                      className="size-[17px]"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  </div>

                  <div>
                    <div
                      className="
                        text-[12px]
                        font-bold
                        text-[#282531]
                      "
                    >
                      Have a verification request?
                    </div>

                    <p
                      className="
                        mt-1.5
                        text-[11px]
                        leading-[1.75]
                        text-[#858191]
                      "
                    >
                      Open the private verification link
                      provided to you. Each request is
                      securely associated with the Discord
                      account selected by the administrator.
                    </p>
                  </div>
                </div>
              </div>

              {/* Admin link — ONLY ACTION */}

              <div
                className="
                  mt-7
                  flex
                  items-center
                  border-t
                  border-[#eeecf2]
                  pt-6
                "
              >
                <Link
                  href="/admin/login"
                  className="
                    group
                    inline-flex
                    min-h-[42px]
                    items-center
                    gap-2.5
                    rounded-[12px]
                    border
                    border-[#e4e0ef]
                    bg-white
                    px-4
                    text-[11px]
                    font-bold
                    text-[#5e596b]
                    shadow-[0_5px_18px_rgba(32,25,65,0.04)]
                    transition-all
                    duration-200
                    hover:-translate-y-0.5
                    hover:border-[#d7d0ff]
                    hover:bg-[#faf9ff]
                    hover:text-[#6657f5]
                    hover:shadow-[0_9px_25px_rgba(102,87,245,0.08)]
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[#7868ff]/40
                    focus-visible:ring-offset-2
                  "
                >
                  <LockKeyhole
                    className="size-3.5"
                    strokeWidth={2}
                    aria-hidden="true"
                  />

                  Administrator sign in

                  <ArrowRight
                    className="
                      size-3.5
                      transition-transform
                      duration-200
                      group-hover:translate-x-0.5
                    "
                    aria-hidden="true"
                  />
                </Link>
              </div>
            </div>
          </div>

          {/* =====================================================
              SECURITY / PROCESS PANEL
          ====================================================== */}

          <aside
            className="
              relative
              border-t
              border-[#ece9f2]
              bg-[#faf9fd]/75
              px-6
              py-9
              sm:px-10
              lg:border-l
              lg:border-t-0
              lg:px-9
              lg:py-12
              xl:px-10
            "
          >
            <div
              className="
                flex
                h-full
                flex-col
                justify-center
              "
            >
              {/* Top */}

              <div className="flex items-center justify-between">
                <div
                  className="
                    flex
                    size-11
                    items-center
                    justify-center
                    rounded-[14px]
                    border
                    border-[#e5e1f2]
                    bg-white
                    text-[#6657f5]
                    shadow-[0_8px_25px_rgba(45,35,90,0.05)]
                  "
                >
                  <ShieldCheck
                    className="size-5"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </div>

                <div
                  className="
                    inline-flex
                    items-center
                    gap-1.5
                    rounded-full
                    border
                    border-emerald-200
                    bg-emerald-50
                    px-2.5
                    py-1.5
                    text-[9px]
                    font-bold
                    text-emerald-700
                  "
                >
                  <BadgeCheck
                    className="size-3"
                    aria-hidden="true"
                  />

                  Secure workflow
                </div>
              </div>

              <div
                className="
                  mt-7
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-[0.15em]
                  text-[#9b96a8]
                "
              >
                How verification works
              </div>

              <h2
                className="
                  mt-2
                  text-[23px]
                  font-bold
                  tracking-[-0.04em]
                  text-[#282531]
                "
              >
                Access is earned after
                verification.
              </h2>

              <p
                className="
                  mt-3
                  text-[11px]
                  leading-[1.8]
                  text-[#898594]
                "
              >
                A private request begins the process.
                Approval is only granted after identity
                binding, evidence submission and
                administrator review.
              </p>

              {/* Process */}

              <div className="mt-7 space-y-2.5">
                <ProcessItem
                  number="01"
                  icon={
                    <KeyRound
                      className="size-4"
                      aria-hidden="true"
                    />
                  }
                  title="Private request"
                  description="Open the secure link issued specifically for your verification."
                />

                <ProcessItem
                  number="02"
                  icon={
                    <Fingerprint
                      className="size-4"
                      aria-hidden="true"
                    />
                  }
                  title="Account binding"
                  description="Authenticate the Discord account assigned to the request."
                />

                <ProcessItem
                  number="03"
                  icon={
                    <UserCheck
                      className="size-4"
                      aria-hidden="true"
                    />
                  }
                  title="Administrator review"
                  description="Submitted information is reviewed before an access decision."
                />
              </div>

              {/* Security note */}

              <div
                className="
                  mt-7
                  rounded-[17px]
                  border
                  border-[#e8e5ee]
                  bg-white/80
                  p-4
                "
              >
                <div className="flex items-start gap-3">
                  <div
                    className="
                      flex
                      size-8
                      shrink-0
                      items-center
                      justify-center
                      rounded-[10px]
                      bg-[#f1efff]
                      text-[#6657f5]
                    "
                  >
                    <LockKeyhole
                      className="size-4"
                      aria-hidden="true"
                    />
                  </div>

                  <div>
                    <div
                      className="
                        text-[10px]
                        font-bold
                        text-[#393542]
                      "
                    >
                      Approval-gated access
                    </div>

                    <p
                      className="
                        mt-1
                        text-[9px]
                        leading-[1.7]
                        text-[#918c9c]
                      "
                    >
                      Receiving a verification link does
                      not grant server access. Access
                      remains unavailable until the
                      verification request is approved.
                    </p>
                  </div>
                </div>
              </div>

              {/* Trust line */}

              <div
                className="
                  mt-6
                  flex
                  items-center
                  gap-2
                  text-[9px]
                  font-semibold
                  text-[#aaa5b3]
                "
              >
                <Check
                  className="
                    size-3
                    text-emerald-500
                  "
                  strokeWidth={2.5}
                  aria-hidden="true"
                />

                Discord account binding

                <span className="text-[#d7d3dc]">
                  •
                </span>

                Manual review

                <span className="text-[#d7d3dc]">
                  •
                </span>

                Controlled access
              </div>
            </div>
          </aside>
        </div>
      </section>
    </VerificationShell>
  );
}


function ProcessItem({
  number,
  icon,
  title,
  description,
}: {
  number: string;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      className="
        group
        flex
        items-start
        gap-3
        rounded-[15px]
        border
        border-transparent
        p-2.5
        transition
        hover:border-[#e8e4f4]
        hover:bg-white/70
      "
    >
      <div
        className="
          flex
          size-9
          shrink-0
          items-center
          justify-center
          rounded-[11px]
          border
          border-[#e9e5f5]
          bg-white
          text-[#6657f5]
          shadow-sm
        "
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className="
              text-[8px]
              font-black
              tracking-[0.1em]
              text-[#b4afbf]
            "
          >
            {number}
          </span>

          <div
            className="
              text-[10px]
              font-bold
              text-[#393542]
            "
          >
            {title}
          </div>
        </div>

        <p
          className="
            mt-1
            text-[9px]
            leading-[1.65]
            text-[#96919f]
          "
        >
          {description}
        </p>
      </div>
    </div>
  );
}