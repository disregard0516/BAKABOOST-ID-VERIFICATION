export type AdminRole =
  | "reviewer"
  | "admin"
  | "super_admin";


export interface AdminTeamMember {
  id: string;
  email: string;
  display_name: string;
  role: AdminRole;
  is_active: boolean;
  mfa_enabled: boolean;
  last_login_at: string | null;
  invited_at: string | null;
  activated_at: string | null;
  disabled_at: string | null;
  security_updated_at: string | null;
  created_at: string;
  updated_at: string;
}


export interface AdminTeamListResponse {
  items: AdminTeamMember[];
}


export interface AdminInvitation {
  id: string;
  email: string;
  role: AdminRole;
  invited_by_admin_id: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  accepted_admin_id: string | null;
  revoked_at: string | null;
  revoked_by_admin_id: string | null;
  revoke_reason: string | null;
}


export interface AdminInvitationListResponse {
  items: AdminInvitation[];
}


export interface CreateAdminInvitationPayload {
  email: string;
  role: AdminRole;
  expires_at: string;
}


export interface CreatedAdminInvitationResponse {
  invitation: AdminInvitation;
}


export interface RevokeAdminInvitationPayload {
  reason: string | null;
}


export interface AcceptedAdminInvitationResponse {
  admin_id: string;
  role: AdminRole;
  activated_at: string;
}


export interface ChangeAdminRolePayload {
  role: AdminRole;
}


export interface AdminRoleChangeResponse {
  admin_id: string;
  role: AdminRole;
  security_version: number;
}


export interface AdminAccountStateResponse {
  admin_id: string;
  is_active: boolean;
  disabled_at: string | null;
  security_version: number;
}


export interface AdminSessionRevocationResponse {
  admin_id: string;
  security_version: number;
  sessions_invalidated: boolean;
}
