import type {
  RequiredEvidence,
} from "@/types/verification";

export interface IdentityFormConfig {
  required_evidence: RequiredEvidence;
  retention_days: number | null;
}