import type {
  SelectHTMLAttributes,
} from "react";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: React.ReactNode;
}

export function SelectField({
  label,
  children,
  ...props
}: SelectFieldProps) {
  return (
    <label className="block">
      <span
        className="
          mb-2 block
          text-[12px]
          font-bold
          text-[#302d39]
        "
      >
        {label}
      </span>

      <select
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
          focus:border-[#7869ef]
        "
      >
        {children}
      </select>
    </label>
  );
}