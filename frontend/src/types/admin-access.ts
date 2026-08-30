export interface AccessGrantResponse {
  grant_id: string;
  discord_user_id: string;

  status:
    | "not_issued"
    | "issued"
    | "consumed"
    | "expired"
    | "revoked";

  issued_at: string | null;
  expires_at: string | null;
}