import type {
  ReactNode,
} from "react";

export function MetaPill({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className="
        rounded-[15px]
        border
        border-white/[0.07]
        bg-white/[0.025]
        px-4 py-3
      "
    >
      <div
        className="
          flex items-center
          gap-2
          text-[9px]
          font-bold
          uppercase
          tracking-[0.1em]
          text-slate-600
        "
      >
        {icon}
        {label}
      </div>

      <div
        className="
          mt-2
          truncate
          text-xs
          font-semibold
          text-slate-300
        "
      >
        {value}
      </div>
    </div>
  );
}