import {
  VerificationStatusGuard,
} from "@/components/verification/status-guard";

import {
  WaitingRoom,
} from "@/components/verification/waiting-room";


export default function WaitingPage() {
  return (
    <VerificationStatusGuard
      allowed={[
        "queued",
        "in_review",
      ]}
    >
      <WaitingRoom />
    </VerificationStatusGuard>
  );
}