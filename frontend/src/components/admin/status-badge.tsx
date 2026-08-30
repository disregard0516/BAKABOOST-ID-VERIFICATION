import {
  adminStatusConfig,
} from "@/lib/admin-status";

import type {
  VerificationStatus,
} from "@/types/verification";


export function AdminStatusBadge({
  status,
}: {
  status: VerificationStatus;
}) {
  const config =
    adminStatusConfig[
      status
    ];

  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-full
        border
        px-2.5 py-1
        text-[10px]
        font-bold
        uppercase
        tracking-[0.06em]
        ${config.className}
      `}
    >
      {config.label}
    </span>
  );
}