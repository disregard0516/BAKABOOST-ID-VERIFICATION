import {
  VerificationResultState,
} from "@/components/verification/verification-result-state";

export default function RevokedPage() {
  return (
    <VerificationResultState
      type="revoked"
      title="This request was revoked"
      description="
        An administrator invalidated this
        verification request. It can no longer
        be used to submit evidence or obtain
        Discord server access.
      "
    />
  );
}