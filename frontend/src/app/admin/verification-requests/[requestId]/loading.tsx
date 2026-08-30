import {
  LoaderCircle,
} from "lucide-react";

import {
  AdminShell,
} from "@/components/admin/admin-shell";

export default function LoadingReview() {
  return (
    <AdminShell>
      <div
        className="
          flex min-h-[520px]
          items-center
          justify-center
        "
      >
        <LoaderCircle
          className="
            size-6
            animate-spin
            text-violet-400
          "
        />
      </div>
    </AdminShell>
  );
}