import type {
  ReactNode,
} from "react";

import {
  AlertTriangle,
  Ban,
  Clock3,
  LockKeyhole,
  MessageSquareText,
  ShieldX,
  XCircle,
} from "lucide-react";

import {
  VerificationShell,
} from "@/components/verification/verification-shell";


interface VerificationResultStateProps {
  type:
    | "rejected"
    | "expired"
    | "revoked"
    | "denied";

  title: string;

  description: string;

  message?: string | null;

  children?: ReactNode;
}


const resultConfig = {
  rejected: {
    icon: XCircle,
    label: "Verification not approved",
    background:
      "bg-[#fff0f2]",
    foreground:
      "text-[#c44151]",
    border:
      "border-[#f3dce0]",
    noticeBackground:
      "bg-[#fff8f9]",
    step:
      "review" as const,
    accessTitle:
      "Server access was not approved",
    accessDescription:
      "This verification did not receive administrator approval, so no Discord server-entry grant has been released.",
  },

  expired: {
    icon: Clock3,
    label: "Request expired",
    background:
      "bg-[#fff7e8]",
    foreground:
      "text-[#ad7a16]",
    border:
      "border-[#eee4cc]",
    noticeBackground:
      "bg-[#fffdf8]",
    step:
      "account" as const,
    accessTitle:
      "This request is no longer active",
    accessDescription:
      "The verification request reached its expiration time. It cannot release Discord access in this state.",
  },

  revoked: {
    icon: Ban,
    label: "Request revoked",
    background:
      "bg-[#f5f3f7]",
    foreground:
      "text-[#706c77]",
    border:
      "border-[#e7e3ea]",
    noticeBackground:
      "bg-[#faf9fb]",
    step:
      "account" as const,
    accessTitle:
      "This request has been disabled",
    accessDescription:
      "The verification request was revoked and can no longer be used to continue verification or obtain Discord access.",
  },

  denied: {
    icon: AlertTriangle,
    label: "Access denied",
    background:
      "bg-[#fff0f2]",
    foreground:
      "text-[#c44151]",
    border:
      "border-[#f3dce0]",
    noticeBackground:
      "bg-[#fff8f9]",
    step:
      "account" as const,
    accessTitle:
      "This verification cannot continue",
    accessDescription:
      "Access to this verification attempt was denied. No protected Discord server access has been released.",
  },
};


export function VerificationResultState({
  type,
  title,
  description,
  message,
  children,
}: VerificationResultStateProps) {
  const config =
    resultConfig[type];

  const Icon =
    config.icon;


  return (
    <VerificationShell
      currentStep={
        config.step
      }
    >
      <section
        className="
          glass-card
          mx-auto
          max-w-[780px]
          overflow-hidden
          rounded-[30px]
        "
      >
        <header
          className="
            px-6
            py-10
            text-center
            sm:px-12
            sm:py-12
          "
        >
          <div
            className={`
              mx-auto
              flex
              size-[68px]
              items-center
              justify-center
              rounded-[22px]
              ${config.background}
              ${config.foreground}
            `}
          >
            <Icon
              className="size-7"
              aria-hidden="true"
            />
          </div>


          <div
            className="
              mt-5
              text-[10px]
              font-bold
              uppercase
              tracking-[0.11em]
              text-[#96919f]
            "
          >
            {config.label}
          </div>


          <h1
            className="
              mt-2
              text-[31px]
              font-bold
              tracking-[-0.045em]
              text-[#171522]
              sm:text-[37px]
            "
          >
            {title}
          </h1>


          <p
            className="
              mx-auto
              mt-4
              max-w-[540px]
              text-[12px]
              leading-6
              text-[#777486]
              sm:text-sm
            "
          >
            {description}
          </p>
        </header>


        <div
          className="
            border-t
            border-[#ece9ef]
            px-6
            py-7
            sm:px-10
            sm:py-8
          "
        >
          <div
            className="
              mx-auto
              max-w-[560px]
              space-y-4
            "
          >
            {message && (
              <div
                className={`
                  rounded-[19px]
                  border
                  p-5
                  ${config.border}
                  ${config.noticeBackground}
                `}
              >
                <div
                  className="
                    flex
                    items-start
                    gap-3.5
                  "
                >
                  <div
                    className={`
                      flex
                      size-9
                      shrink-0
                      items-center
                      justify-center
                      rounded-[12px]
                      bg-white
                      ${config.foreground}
                    `}
                  >
                    <MessageSquareText
                      className="size-4"
                      aria-hidden="true"
                    />
                  </div>

                  <div>
                    <div
                      className="
                        text-[9px]
                        font-bold
                        uppercase
                        tracking-[0.09em]
                        text-[#9994a1]
                      "
                    >
                      Verification message
                    </div>

                    <p
                      className="
                        mt-2
                        whitespace-pre-wrap
                        text-[11px]
                        leading-5
                        text-[#716d7d]
                      "
                    >
                      {message}
                    </p>
                  </div>
                </div>
              </div>
            )}


            <div
              className="
                rounded-[19px]
                border
                border-[#ebe8ef]
                bg-[#faf9fd]
                p-5
              "
            >
              <div
                className="
                  flex
                  items-start
                  gap-3.5
                "
              >
                <div
                  className="
                    flex
                    size-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-[13px]
                    bg-white
                    text-[#6861a2]
                  "
                >
                  <LockKeyhole
                    className="size-4"
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <h2
                    className="
                      text-[11px]
                      font-bold
                      text-[#45404d]
                    "
                  >
                    {config.accessTitle}
                  </h2>

                  <p
                    className="
                      mt-1
                      text-[10px]
                      leading-5
                      text-[#827e8d]
                    "
                  >
                    {config.accessDescription}
                  </p>
                </div>
              </div>
            </div>


            <div
              className="
                flex
                items-start
                gap-3
                rounded-[17px]
                border
                border-[#ebe8ef]
                bg-white/65
                p-4
              "
            >
              <ShieldX
                className="
                  mt-0.5
                  size-4
                  shrink-0
                  text-[#817b8a]
                "
                aria-hidden="true"
              />

              <p
                className="
                  text-[10px]
                  leading-5
                  text-[#8a8694]
                "
              >
                No Discord invite or server-entry credential is exposed from this state.
              </p>
            </div>


            {children && (
              <div
                className="
                  pt-2
                "
              >
                {children}
              </div>
            )}
          </div>
        </div>
      </section>
    </VerificationShell>
  );
}