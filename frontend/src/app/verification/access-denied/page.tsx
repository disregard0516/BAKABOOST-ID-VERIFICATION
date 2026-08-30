import {
  VerificationResultState,
} from "@/components/verification/verification-result-state";

export default function AccessDeniedPage() {
  return (
    <VerificationResultState
      type="denied"
      title="We couldn't authorize this request"
      description="
        Make sure you signed in with the Discord
        account associated with this private
        verification request.
      "
    />
  );
}