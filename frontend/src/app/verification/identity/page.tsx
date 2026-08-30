import {
  IdentityVerificationForm,
} from "@/components/verification/identity-verification-form";

import {
  VerificationStatusGuard,
} from "@/components/verification/status-guard";


export default function IdentityVerificationPage() {
  return (
    <VerificationStatusGuard
      allowed={[
        "pending",
        "more_info",
      ]}
    >
      <IdentityVerificationForm />
    </VerificationStatusGuard>
  );
}