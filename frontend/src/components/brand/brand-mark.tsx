import {
  ShieldCheck,
} from "lucide-react";

export function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div
        className="
          relative flex size-10
          items-center justify-center
          rounded-[14px]
          bg-[linear-gradient(145deg,#7668ff,#5948e8)]
          shadow-[0_10px_28px_rgba(91,73,230,0.28)]
        "
      >
        <ShieldCheck
          className="size-5 text-white"
          strokeWidth={2.2}
        />

        <span
          className="
            absolute -right-0.5
            -top-0.5 size-2.5
            rounded-full
            border-2 border-white
            bg-emerald-400
          "
        />
      </div>

      <div>
        <div
          className="
            text-[15px]
            font-bold
            tracking-[-0.02em]
            text-[#171522]
          "
        >
          SCANLY VERIFY
        </div>

        <div
          className="
            mt-0.5 text-[10px]
            font-medium
            uppercase
            tracking-[0.15em]
            text-[#9895a8]
          "
        >
          Secure · Private · Manual
        </div>
      </div>
    </div>
  );
}