import {
  VerificationShell,
} from "@/components/verification/verification-shell";

export default function Loading() {
  return (
    <VerificationShell
      currentStep="account"
    >
      <div
        className="
          glass-card
          mx-auto
          max-w-[780px]
          animate-pulse
          rounded-[30px]
          px-8 py-12
        "
      >
        <div
          className="
            mx-auto h-14
            w-14 rounded-[18px]
            bg-[#eceaf4]
          "
        />

        <div
          className="
            mx-auto mt-7
            h-8 w-[60%]
            rounded-lg
            bg-[#eceaf4]
          "
        />

        <div
          className="
            mx-auto mt-4
            h-4 w-[78%]
            rounded-lg
            bg-[#f0eef5]
          "
        />

        <div
          className="
            mx-auto mt-2
            h-4 w-[62%]
            rounded-lg
            bg-[#f0eef5]
          "
        />

        <div
          className="
            mx-auto mt-8
            h-13 w-[360px]
            max-w-full
            rounded-[16px]
            bg-[#e9e6f7]
          "
        />
      </div>
    </VerificationShell>
  );
}