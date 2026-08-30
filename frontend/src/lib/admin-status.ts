import type {
  VerificationStatus,
} from "@/types/verification";


export const adminStatusConfig: Record<
  VerificationStatus,
  {
    label: string;
    className: string;
  }
> = {
  pending: {
    label: "Pending",
    className:
      "border-slate-600/50 bg-slate-700/30 text-slate-300",
  },

  queued: {
    label: "Queued",
    className:
      "border-violet-500/30 bg-violet-500/10 text-violet-300",
  },

  in_review: {
    label: "In Review",
    className:
      "border-blue-500/30 bg-blue-500/10 text-blue-300",
  },

  more_info: {
    label: "More Info",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-300",
  },

  approved: {
    label: "Approved",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  },

  rejected: {
    label: "Rejected",
    className:
      "border-red-500/30 bg-red-500/10 text-red-300",
  },

  expired: {
    label: "Expired",
    className:
      "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
  },

  revoked: {
    label: "Revoked",
    className:
      "border-rose-500/30 bg-rose-500/10 text-rose-300",
  },
};