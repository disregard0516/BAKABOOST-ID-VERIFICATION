"use client";

import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  Database,
  FileLock2,
  RefreshCw,
  ServerCog,
  ShieldCheck,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  AdminShell,
} from "@/components/admin/admin-shell";

import {
  getAdminSettings,
} from "@/lib/admin-api";

import type {
  AdminSettingsResponse,
} from "@/types/admin-settings";


function formatDuration(
  seconds: number,
): string {
  if (
    seconds > 0
    && seconds % 3600 === 0
  ) {
    const hours =
      seconds / 3600;

    return `${hours} ${
      hours === 1
        ? "hour"
        : "hours"
    }`;
  }

  if (
    seconds > 0
    && seconds % 60 === 0
  ) {
    const minutes =
      seconds / 60;

    return `${minutes} ${
      minutes === 1
        ? "minute"
        : "minutes"
    }`;
  }

  return `${seconds} seconds`;
}


function formatBytes(
  bytes: number,
): string {
  const mb =
    bytes / (1024 * 1024);

  if (mb >= 1) {
    return `${mb.toLocaleString()} MB`;
  }

  const kb =
    bytes / 1024;

  if (kb >= 1) {
    return `${kb.toLocaleString()} KB`;
  }

  return `${bytes.toLocaleString()} bytes`;
}


function StatusPill({
  ready,
}: {
  ready: boolean;
}) {
  return (
    <span
      className={`
        inline-flex
        shrink-0
        items-center
        gap-1.5
        rounded-full
        border
        px-2.5
        py-1
        text-[10px]
        font-semibold
        uppercase
        tracking-[0.12em]
        ${
          ready
            ? [
                "border-emerald-400/15",
                "bg-emerald-400/[0.06]",
                "text-emerald-300",
              ].join(" ")
            : [
                "border-amber-400/15",
                "bg-amber-400/[0.06]",
                "text-amber-200",
              ].join(" ")
        }
      `}
    >
      {ready ? (
        <CheckCircle2 size={12} />
      ) : (
        <CircleAlert size={12} />
      )}

      {ready
        ? "Ready"
        : "Pending"}
    </span>
  );
}


function SettingRow({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <div
      className="
        flex
        flex-col
        gap-2
        border-b
        border-white/[0.055]
        px-5
        py-4
        last:border-b-0
        sm:flex-row
        sm:items-center
        sm:justify-between
        sm:gap-6
      "
    >
      <div>
        <div
          className="
            text-[13px]
            font-medium
            text-white/80
          "
        >
          {label}
        </div>

        {description ? (
          <div
            className="
              mt-1
              text-[11px]
              leading-5
              text-white/30
            "
          >
            {description}
          </div>
        ) : null}
      </div>

      <div
        className="
          shrink-0
          text-[12px]
          font-semibold
          text-white/60
        "
      >
        {value}
      </div>
    </div>
  );
}


function IntegrationRow({
  label,
  description,
  ready,
}: {
  label: string;
  description: string;
  ready: boolean;
}) {
  return (
    <div
      className="
        flex
        items-center
        justify-between
        gap-5
        border-b
        border-white/[0.055]
        px-5
        py-4
        last:border-b-0
      "
    >
      <div>
        <div
          className="
            text-[13px]
            font-medium
            text-white/80
          "
        >
          {label}
        </div>

        <div
          className="
            mt-1
            text-[11px]
            leading-5
            text-white/30
          "
        >
          {description}
        </div>
      </div>

      <StatusPill
        ready={ready}
      />
    </div>
  );
}


function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="
        overflow-hidden
        rounded-[22px]
        border
        border-white/[0.065]
        bg-white/[0.022]
        shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]
      "
    >
      <div
        className="
          flex
          items-start
          gap-3
          border-b
          border-white/[0.06]
          px-5
          py-4
        "
      >
        <div
          className="
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-xl
            border
            border-violet-400/10
            bg-violet-400/[0.06]
            text-violet-200
          "
        >
          <Icon size={16} />
        </div>

        <div>
          <div
            className="
              text-sm
              font-semibold
              text-white/85
            "
          >
            {title}
          </div>

          <div
            className="
              mt-1
              text-[11px]
              leading-5
              text-white/30
            "
          >
            {description}
          </div>
        </div>
      </div>

      {children}
    </section>
  );
}


export function AdminSettings() {
  const [
    settings,
    setSettings,
  ] = useState<
    AdminSettingsResponse | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );


  const loadSettings =
    useCallback(
      async (): Promise<void> => {
        setLoading(true);
        setError(null);

        try {
          const response =
            await getAdminSettings();

          setSettings(response);
        } catch (caught) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load settings.",
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );


  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          void loadSettings();
        },
        0,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [loadSettings]);


  return (
    <AdminShell>
      <main
        className="
          min-h-screen
          px-5
          pb-12
          pt-7
          sm:px-7
          lg:px-10
        "
      >
        <div
          className="
            mx-auto
            w-full
            max-w-[1400px]
          "
        >
          <header
            className="
              mb-7
              flex
              flex-col
              gap-5
              lg:flex-row
              lg:items-end
              lg:justify-between
            "
          >
            <div>
              <div
                className="
                  mb-3
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-violet-400/10
                  bg-violet-400/[0.055]
                  px-3
                  py-1.5
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.16em]
                  text-violet-200/80
                "
              >
                <ServerCog size={13} />
                Workspace configuration
              </div>

              <h1
                className="
                  text-3xl
                  font-semibold
                  tracking-[-0.035em]
                  text-white
                  sm:text-[38px]
                "
              >
                Settings
              </h1>

              <p
                className="
                  mt-2
                  max-w-2xl
                  text-sm
                  leading-6
                  text-white/45
                "
              >
                Review the active security,
                evidence and verification policy
                for this deployment.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                void loadSettings();
              }}
              disabled={loading}
              className="
                inline-flex
                h-10
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-white/[0.08]
                bg-white/[0.045]
                px-4
                text-xs
                font-semibold
                text-white/75
                transition
                hover:bg-white/[0.075]
                disabled:cursor-not-allowed
                disabled:opacity-45
              "
            >
              <RefreshCw
                size={14}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />
              Refresh
            </button>
          </header>


          <div
            className="
              mb-5
              rounded-[18px]
              border
              border-white/[0.06]
              bg-white/[0.02]
              px-4
              py-3
              text-[11px]
              leading-5
              text-white/35
            "
          >
            This page is intentionally read-only.
            Deployment credentials, API keys,
            secrets, tokens and private connection
            values are never returned to the
            browser.
          </div>


          {error ? (
            <div
              className="
                mb-5
                flex
                items-start
                gap-3
                rounded-[18px]
                border
                border-red-400/10
                bg-red-400/[0.035]
                px-4
                py-4
                text-sm
                text-red-200/80
              "
            >
              <CircleAlert
                size={17}
                className="
                  mt-0.5
                  shrink-0
                "
              />

              {error}
            </div>
          ) : null}


          {loading && !settings ? (
            <div
              className="
                flex
                min-h-[360px]
                items-center
                justify-center
                rounded-[22px]
                border
                border-white/[0.06]
                bg-white/[0.02]
              "
            >
              <div
                className="
                  text-center
                  text-sm
                  text-white/35
                "
              >
                <RefreshCw
                  size={20}
                  className="
                    mx-auto
                    mb-3
                    animate-spin
                    text-violet-300/70
                  "
                />

                Loading settings…
              </div>
            </div>
          ) : settings ? (
            <div
              className="
                grid
                gap-5
                xl:grid-cols-2
              "
            >
              <SettingsCard
                icon={ShieldCheck}
                title="Security posture"
                description="Server-enforced administrator security controls."
              >
                <SettingRow
                  label="Environment"
                  value={
                    settings.environment
                      .toUpperCase()
                  }
                />

                <SettingRow
                  label="Production mode"
                  value={
                    settings.security
                      .production_mode
                      ? "Enabled"
                      : "Disabled"
                  }
                />

                <SettingRow
                  label="Secure cookies"
                  value={
                    settings.security
                      .secure_cookies
                      ? "Required"
                      : "Disabled"
                  }
                />

                <SettingRow
                  label="Rate limiting"
                  value={
                    settings.security
                      .rate_limiting_enabled
                      ? "Enabled"
                      : "Disabled"
                  }
                />

                <SettingRow
                  label="Sensitive reauthentication"
                  value={formatDuration(
                    settings.security
                      .sensitive_reauth_max_age_seconds,
                  )}
                />

                <SettingRow
                  label="Session IP context"
                  value={
                    settings.security
                      .session_ip_tracking_enabled
                      ? "Tracked"
                      : "Disabled"
                  }
                />

                <SettingRow
                  label="Session user-agent context"
                  value={
                    settings.security
                      .session_user_agent_tracking_enabled
                      ? "Tracked"
                      : "Disabled"
                  }
                />
              </SettingsCard>


              <SettingsCard
                icon={Clock3}
                title="Administrator sessions"
                description="Active session lifetime and credential rotation policy."
              >
                <SettingRow
                  label="Idle timeout"
                  value={formatDuration(
                    settings.security
                      .admin_session_idle_timeout_seconds,
                  )}
                />

                <SettingRow
                  label="Absolute lifetime"
                  value={formatDuration(
                    settings.security
                      .admin_session_absolute_lifetime_seconds,
                  )}
                />

                <SettingRow
                  label="Session rotation"
                  value={formatDuration(
                    settings.security
                      .admin_session_rotation_interval_seconds,
                  )}
                />

                <SettingRow
                  label="Maximum active sessions"
                  value={String(
                    settings.security
                      .admin_max_active_sessions,
                  )}
                />
              </SettingsCard>


              <SettingsCard
                icon={FileLock2}
                title="Evidence protection"
                description="Upload security, signed access and evidence retention policy."
              >
                <SettingRow
                  label="Maximum upload size"
                  value={formatBytes(
                    settings.evidence
                      .max_file_size_bytes,
                  )}
                />

                <SettingRow
                  label="Allowed content types"
                  value={
                    settings.evidence
                      .allowed_content_types
                      .join(", ")
                  }
                />

                <SettingRow
                  label="Temporary upload lifetime"
                  value={`${
                    settings.evidence
                      .temporary_upload_ttl_minutes
                  } minutes`}
                />

                <SettingRow
                  label="Signed evidence URL lifetime"
                  value={formatDuration(
                    settings.evidence
                      .signed_url_ttl_seconds,
                  )}
                />

                <SettingRow
                  label="Submitted evidence retention"
                  value={
                    settings.evidence
                      .retain_submitted_evidence_indefinitely
                      ? "Indefinite"
                      : settings.evidence
                            .raw_evidence_retention_days
                          !== null
                        ? `${
                            settings.evidence
                              .raw_evidence_retention_days
                          } days`
                        : "Not configured"
                  }
                />

                <SettingRow
                  label="Automatic evidence deletion"
                  value={
                    settings.evidence
                      .automatic_evidence_deletion_enabled
                      ? "Enabled"
                      : "Disabled"
                  }
                />

                <SettingRow
                  label="Manual evidence deletion"
                  value={
                    settings.evidence
                      .manual_evidence_deletion_enabled
                      ? "Enabled"
                      : "Disabled"
                  }
                />
              </SettingsCard>


              <SettingsCard
                icon={ServerCog}
                title="Verification policy"
                description="Default request, session and Discord access limits."
              >
                <SettingRow
                  label="Request expiry"
                  value={`${
                    settings.verification
                      .default_request_expiry_hours
                  } hours`}
                />

                <SettingRow
                  label="Maximum submissions"
                  value={String(
                    settings.verification
                      .max_submissions,
                  )}
                />

                <SettingRow
                  label="Verification session"
                  value={`${
                    settings.verification
                      .verification_session_ttl_minutes
                  } minutes`}
                />

                <SettingRow
                  label="Discord invite expiry"
                  value={formatDuration(
                    settings.verification
                      .discord_invite_max_age_seconds,
                  )}
                />

                <SettingRow
                  label="Discord invite uses"
                  value={String(
                    settings.verification
                      .discord_invite_max_uses,
                  )}
                />
              </SettingsCard>


              <section
                className="
                  overflow-hidden
                  rounded-[22px]
                  border
                  border-white/[0.065]
                  bg-white/[0.022]
                  shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]
                  xl:col-span-2
                "
              >
                <div
                  className="
                    flex
                    items-start
                    gap-3
                    border-b
                    border-white/[0.06]
                    px-5
                    py-4
                  "
                >
                  <div
                    className="
                      flex
                      h-9
                      w-9
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      border
                      border-violet-400/10
                      bg-violet-400/[0.06]
                      text-violet-200
                    "
                  >
                    <Database size={16} />
                  </div>

                  <div>
                    <div
                      className="
                        text-sm
                        font-semibold
                        text-white/85
                      "
                    >
                      Integration readiness
                    </div>

                    <div
                      className="
                        mt-1
                        text-[11px]
                        leading-5
                        text-white/30
                      "
                    >
                      Readiness indicates whether the
                      required server configuration is
                      present. Credentials are never
                      exposed.
                    </div>
                  </div>
                </div>

                <div
                  className="
                    grid
                    lg:grid-cols-2
                  "
                >
                  <div
                    className="
                      lg:border-r
                      lg:border-white/[0.055]
                    "
                  >
                    <IntegrationRow
                      label="Private evidence storage"
                      description="S3-compatible / R2 storage configuration."
                      ready={
                        settings.integrations
                          .storage_configured
                      }
                    />

                    <IntegrationRow
                      label="Discord OAuth"
                      description="Discord immutable identity authentication."
                      ready={
                        settings.integrations
                          .discord_oauth_configured
                      }
                    />

                    <IntegrationRow
                      label="Discord access enforcement"
                      description="Bot and controlled invite configuration."
                      ready={
                        settings.integrations
                          .discord_bot_configured
                      }
                    />
                  </div>

                  <div>
                    <IntegrationRow
                      label="Cloudflare Access"
                      description="Administrator identity boundary."
                      ready={
                        settings.integrations
                          .cloudflare_access_configured
                      }
                    />

                    <IntegrationRow
                      label="Cloudflare MFA step-up"
                      description="Dedicated sensitive-action authentication boundary."
                      ready={
                        settings.integrations
                          .cloudflare_step_up_configured
                      }
                    />

                    <IntegrationRow
                      label="Invitation email delivery"
                      description="Administrator invitation mail provider."
                      ready={
                        settings.integrations
                          .email_delivery_configured
                      }
                    />
                  </div>
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </main>
    </AdminShell>
  );
}
