import type {
  VerificationStatus,
  VerificationStep,
} from "@/types/verification";

interface StatusPresentation {
  label: string;
  description: string;
  step: VerificationStep;
}

export const verificationStatusPresentation:
  Record<
    VerificationStatus,
    StatusPresentation
  > = {
    pending: {
      label: "Ready to verify",
      description:
        "Authenticate with the Discord account assigned to this private request.",
      step: "account",
    },

    queued: {
      label: "Waiting for an administrator",
      description:
        "Your verification has been submitted and is waiting in the review queue.",
      step: "queue",
    },

    in_review: {
      label: "Under review",
      description:
        "An administrator is actively reviewing your verification.",
      step: "review",
    },

    more_info: {
      label: "More information required",
      description:
        "An administrator needs corrected or additional information before continuing.",
      step: "identity",
    },

    approved: {
      label: "Approved",
      description:
        "Your verification has been approved. Controlled Discord access may now be available.",
      step: "access",
    },

    rejected: {
      label: "Verification not approved",
      description:
        "Your verification was not accepted. Discord server access has not been released.",
      step: "review",
    },

    expired: {
      label: "Request expired",
      description:
        "This verification request is no longer active.",
      step: "account",
    },

    revoked: {
      label: "Request revoked",
      description:
        "This verification request has been withdrawn and can no longer be used.",
      step: "account",
    },
  };