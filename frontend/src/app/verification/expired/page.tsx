import {
  VerificationResultState,
} from "@/components/verification/verification-result-state";

export default function ExpiredPage() {
  return (
    <VerificationResultState
      type="expired"
      title="This request has expired"
      description="
        The verification window ended before
        approval. This private request can no
        longer be used unless an administrator
        extends it or creates a replacement.
      "
    />
  );
}