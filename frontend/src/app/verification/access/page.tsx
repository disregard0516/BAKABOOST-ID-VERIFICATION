import {
  ApprovedAccess,
} from "@/components/verification/approved-access";

import {
  VerificationStatusGuard,
} from "@/components/verification/status-guard";


export default function AccessPage() {
  return (
    <VerificationStatusGuard
      allowed={[
        "approved",
      ]}
    >
      <ApprovedAccess />
    </VerificationStatusGuard>
  );
}