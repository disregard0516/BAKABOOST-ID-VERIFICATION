export interface AdminSettingsSecurity {
  production_mode: boolean;
  secure_cookies: boolean;
  rate_limiting_enabled: boolean;

  admin_session_idle_timeout_seconds: number;
  admin_session_absolute_lifetime_seconds: number;
  admin_session_rotation_interval_seconds: number;
  admin_max_active_sessions: number;

  sensitive_reauth_max_age_seconds: number;

  session_ip_tracking_enabled: boolean;
  session_user_agent_tracking_enabled: boolean;
}


export interface AdminSettingsVerification {
  default_request_expiry_hours: number;
  max_submissions: number;
  verification_session_ttl_minutes: number;

  discord_invite_max_age_seconds: number;
  discord_invite_max_uses: number;
}


export interface AdminSettingsEvidence {
  max_file_size_bytes: number;
  allowed_content_types: string[];

  temporary_upload_ttl_minutes: number;
  signed_url_ttl_seconds: number;

  automatic_evidence_deletion_enabled: boolean;
  retain_submitted_evidence_indefinitely: boolean;
  manual_evidence_deletion_enabled: boolean;
  raw_evidence_retention_days: number | null;
}


export interface AdminSettingsIntegrations {
  storage_configured: boolean;

  discord_oauth_configured: boolean;
  discord_bot_configured: boolean;

  cloudflare_access_configured: boolean;
  cloudflare_step_up_configured: boolean;

  email_delivery_configured: boolean;
}


export interface AdminSettingsResponse {
  environment: string;

  security: AdminSettingsSecurity;
  verification: AdminSettingsVerification;
  evidence: AdminSettingsEvidence;
  integrations: AdminSettingsIntegrations;
}
