import type {
  InputHTMLAttributes,
} from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export function Field({
  label,
  hint,
  ...props
}: FieldProps) {
  return (
    <label className="block">
      <div
        className="
          mb-2 flex items-center
          justify-between gap-3
        "
      >
        <span
          className="
            text-[12px]
            font-bold
            tracking-[-0.01em]
            text-[#302d39]
          "
        >
          {label}
        </span>

        {hint && (
          <span
            className="
              text-[10px]
              font-medium
              text-[#9b97a6]
            "
          >
            {hint}
          </span>
        )}
      </div>

      <input
        {...props}
        className="
          focus-ring
          h-12 w-full
          rounded-[14px]
          border
          border-[#e6e2eb]
          bg-white/85
          px-4
          text-sm
          text-[#272430]
          outline-none
          transition
          placeholder:text-[#aaa6b4]
          focus:border-[#7869ef]
          focus:bg-white
        "
      />
    </label>
  );
}