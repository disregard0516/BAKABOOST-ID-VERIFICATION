import {
  ClockAlert,
} from "lucide-react";

import {
  VerificationShell,
} from "@/components/verification/verification-shell";

export default function SessionExpiredPage() {
  return (
    <VerificationShell
      currentStep="account"
    >
      <section
        className="
          glass-card
          mx-auto
          max-w-[720px]
          rounded-[30px]
          px-8 py-12
          text-center
        "
      >
        <div
          className="
            mx-auto flex
            size-14
            items-center
            justify-center
            rounded-[18px]
            bg-[#fff7e8]
            text-[#ad7a16]
          "
        >
          <ClockAlert
            className="size-6"
          />
        </div>

        <h1
          className="
            mt-6
            text-[30px]
            font-bold
            tracking-[-0.045em]
            text-[#171522]
          "
        >
          Verification session expired
        </h1>

        <p
          className="
            mx-auto mt-4
            max-w-[480px]
            text-sm
            leading-6
            text-[#777486]
          "
        >
          For security, verification sessions
          are short-lived. Reopen your original
          private verification link and
          authenticate with Discord again.
        </p>
      </section>
    </VerificationShell>
  );
}