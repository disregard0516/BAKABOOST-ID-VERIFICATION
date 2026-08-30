import type {
  VerificationStatus,
} from "@/types/verification";

export function getVerificationStatusPath(
  status: VerificationStatus,
): string {
  switch (status) {
    case "pending":
      return "/verification/account-confirmed";

    case "more_info":
      return "/verification/more-info";

    case "queued":
    case "in_review":
      return "/verification/waiting";

    case "approved":
      return "/verification/access";

    case "rejected":
      return "/verification/rejected";

    case "expired":
      return "/verification/expired";

    case "revoked":
      return "/verification/revoked";
  }
}