"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Check,
  Clock3,
  KeyRound,
  LoaderCircle,
  MailPlus,
  RefreshCw,
  RotateCcwKey,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  UserCog,
  UserRoundX,
  Users,
  X,
} from "lucide-react";

import {
  AdminShell,
} from "@/components/admin/admin-shell";

import {
  AdminApiError,
  changeAdminRole,
  createAdminInvitation,
  disableTeamAdmin,
  enableTeamAdmin,
  getAdminInvitations,
  getAdminTeam,
  getCurrentAdminSession,
  resendAdminInvitation,
  revokeAdminInvitation,
  revokeTeamAdminSessions,
  stepUpAdminSession,
} from "@/lib/admin-api";

import type {
  CurrentAdmin,
} from "@/lib/admin-api";

import type {
  AdminInvitation,
  AdminRole,
  AdminTeamMember,
  CreateAdminInvitationPayload,
} from "@/types/admin-team";


const ROLE_OPTIONS: {
  value: AdminRole;
  label: string;
  description: string;
}[] = [
  {
    value: "reviewer",
    label: "Reviewer",
    description:
      "Review verification cases with limited administrative authority.",
  },
  {
    value: "admin",
    label: "Admin",
    description:
      "Manage verification operations and standard administration.",
  },
  {
    value: "super_admin",
    label: "Super Admin",
    description:
      "Owner-level authority including Team & Access security controls.",
  },
];


type Notice =
  | {
      type: "success";
      message: string;
    }
  | {
      type: "error";
      message: string;
    }
  | null;


function formatDateTime(
  value: string | null,
): string {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}


function roleLabel(
  role: AdminRole,
): string {
  switch (role) {
    case "super_admin":
      return "Super Admin";

    case "admin":
      return "Admin";

    case "reviewer":
      return "Reviewer";
  }
}


function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (
    error instanceof AdminApiError &&
    error.message.trim()
  ) {
    return error.message;
  }

  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
}


export function AdminTeamAccess() {
  const [currentAdmin, setCurrentAdmin] =
    useState<CurrentAdmin | null>(
      null,
    );

  const [members, setMembers] =
    useState<AdminTeamMember[]>([]);

  const [invitations, setInvitations] =
    useState<AdminInvitation[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [notice, setNotice] =
    useState<Notice>(null);

  const [inviteOpen, setInviteOpen] =
    useState(false);

  const [inviteEmail, setInviteEmail] =
    useState("");

  const [inviteRole, setInviteRole] =
    useState<AdminRole>("reviewer");

  const [inviteSubmitting, setInviteSubmitting] =
    useState(false);

  const [busyAction, setBusyAction] =
    useState<string | null>(null);

  const [currentTime, setCurrentTime] =
    useState<number>(() =>
      Date.now(),
    );


  const isSuperAdmin =
    currentAdmin?.role ===
    "super_admin";


  const activeMembers =
    useMemo(
      () =>
        members.filter(
          (member) =>
            member.is_active,
        ).length,
      [members],
    );


  const pendingInvitations =
    useMemo(
      () =>
        invitations.filter(
          (invitation) =>
            !invitation.accepted_at &&
            !invitation.revoked_at &&
            new Date(
              invitation.expires_at,
            ).getTime() >
              currentTime,
        ),
      [
        invitations,
        currentTime,
      ],
    );


  const loadTeam = useCallback(
    async (
      refresh = false,
    ): Promise<void> => {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setNotice(null);

      try {
        const [
          session,
          team,
          invitationList,
        ] = await Promise.all([
          getCurrentAdminSession(),
          getAdminTeam(),
          getAdminInvitations(),
        ]);

        setCurrentAdmin(
          session.admin,
        );

        setMembers(
          team.items,
        );

        setInvitations(
          invitationList.items,
        );

        setCurrentTime(
          Date.now(),
        );
      } catch (error) {
        setNotice({
          type: "error",
          message: getErrorMessage(
            error,
            "Unable to load Team & Access.",
          ),
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );


  useEffect(() => {
    const timeoutId =
      window.setTimeout(() => {
        void loadTeam();
      }, 0);

    return () => {
      window.clearTimeout(
        timeoutId,
      );
    };
  }, [loadTeam]);


  return (
    <AdminShell>
      <div
        className="
          flex
          flex-col
          gap-6
          xl:gap-7
        "
      >
        <header
          className="
            flex
            flex-col
            gap-5
            xl:flex-row
            xl:items-end
            xl:justify-between
          "
        >
          <div>
            <div
              className="
                flex
                items-center
                gap-2
                text-[10px]
                font-bold
                uppercase
                tracking-[0.12em]
                text-violet-400
              "
            >
              <ShieldCheck
                className="size-3.5"
                aria-hidden="true"
              />

              Administration security
            </div>

            <h1
              className="
                mt-2
                text-[30px]
                font-bold
                tracking-[-0.04em]
                text-white
                sm:text-[34px]
              "
            >
              Team & Access
            </h1>

            <p
              className="
                mt-2
                max-w-2xl
                text-sm
                leading-6
                text-slate-400
              "
            >
              Manage administrator access,
              security roles, invitations and
              active sessions.
            </p>
          </div>

          <div
            className="
              flex
              flex-wrap
              items-center
              gap-2
            "
          >
            <button
              type="button"
              onClick={() => {
                void loadTeam(true);
              }}
              disabled={
                refreshing ||
                loading
              }
              className="
                inline-flex
                h-10
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-white/[0.08]
                bg-white/[0.025]
                px-4
                text-xs
                font-semibold
                text-slate-300
                transition
                hover:border-white/[0.13]
                hover:bg-white/[0.045]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              <RefreshCw
                className={`size-3.5 ${
                  refreshing
                    ? "animate-spin"
                    : ""
                }`}
                aria-hidden="true"
              />

              Refresh
            </button>

            {isSuperAdmin ? (
              <button
                type="button"
                onClick={() => {
                  setInviteOpen(true);
                }}
                className="
                  inline-flex
                  h-10
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-violet-500
                  px-4
                  text-xs
                  font-bold
                  text-white
                  shadow-lg
                  shadow-violet-950/30
                  transition
                  hover:bg-violet-400
                "
              >
                <MailPlus
                  className="size-3.5"
                  aria-hidden="true"
                />

                Invite administrator
              </button>
            ) : null}
          </div>
        </header>


        {notice ? (
          <div
            className={`
              flex
              items-start
              gap-3
              rounded-2xl
              border
              px-4
              py-3
              text-sm
              ${
                notice.type ===
                "success"
                  ? `
                      border-emerald-500/20
                      bg-emerald-500/[0.06]
                      text-emerald-200
                    `
                  : `
                      border-rose-500/20
                      bg-rose-500/[0.06]
                      text-rose-200
                    `
              }
            `}
          >
            {notice.type ===
            "success" ? (
              <Check
                className="
                  mt-0.5
                  size-4
                  shrink-0
                "
                aria-hidden="true"
              />
            ) : (
              <AlertTriangle
                className="
                  mt-0.5
                  size-4
                  shrink-0
                "
                aria-hidden="true"
              />
            )}

            <span>
              {notice.message}
            </span>
          </div>
        ) : null}


        <section
          className="
            grid
            gap-3
            md:grid-cols-3
          "
        >
          <MetricCard
            icon={Users}
            label="Team members"
            value={
              loading
                ? "—"
                : String(
                    members.length,
                  )
            }
          />

          <MetricCard
            icon={UserCheck}
            label="Active access"
            value={
              loading
                ? "—"
                : String(
                    activeMembers,
                  )
            }
          />

          <MetricCard
            icon={Clock3}
            label="Pending invitations"
            value={
              loading
                ? "—"
                : String(
                    pendingInvitations.length,
                  )
            }
          />
        </section>


        {loading ? (
          <div
            className="
              flex
              min-h-72
              items-center
              justify-center
              rounded-2xl
              border
              border-white/[0.06]
              bg-white/[0.015]
            "
          >
            <div
              className="
                flex
                items-center
                gap-3
                text-sm
                text-slate-400
              "
            >
              <LoaderCircle
                className="
                  size-4
                  animate-spin
                "
                aria-hidden="true"
              />

              Loading secure team data…
            </div>
          </div>
        ) : (
          <>
            <TeamMembersSection
              members={members}
              currentAdmin={currentAdmin}
              isSuperAdmin={
                isSuperAdmin
              }
              busyAction={
                busyAction
              }
              onActionBusy={
                setBusyAction
              }
              onNotice={
                setNotice
              }
              onReload={() =>
                loadTeam(true)
              }
            />

            <InvitationsSection
              invitations={
                invitations
              }
              currentTime={
                currentTime
              }
              isSuperAdmin={
                isSuperAdmin
              }
              busyAction={
                busyAction
              }
              onActionBusy={
                setBusyAction
              }
              onNotice={
                setNotice
              }
              onReload={() =>
                loadTeam(true)
              }
            />
          </>
        )}
      </div>


      {inviteOpen ? (
        <InviteAdminDialog
          email={inviteEmail}
          role={inviteRole}
          submitting={
            inviteSubmitting
          }
          onEmailChange={
            setInviteEmail
          }
          onRoleChange={
            setInviteRole
          }
          onClose={() => {
            if (
              inviteSubmitting
            ) {
              return;
            }

            setInviteOpen(false);
            setInviteEmail("");
            setInviteRole(
              "reviewer",
            );
          }}
          onSubmit={async () => {
            const normalizedEmail =
              inviteEmail
                .trim()
                .toLowerCase();

            if (
              !normalizedEmail
            ) {
              setNotice({
                type: "error",
                message:
                  "Enter the administrator email address.",
              });

              return;
            }

            setInviteSubmitting(
              true,
            );
            setNotice(null);

            try {
              await stepUpAdminSession();

              const expiresAt =
                new Date(
                  Date.now() +
                    24 *
                      60 *
                      60 *
                      1000,
                ).toISOString();

              const payload:
                CreateAdminInvitationPayload =
                {
                  email:
                    normalizedEmail,
                  role:
                    inviteRole,
                  expires_at:
                    expiresAt,
                };

              await createAdminInvitation(
                  payload,
                );



              setInviteOpen(false);
              setInviteEmail("");
              setInviteRole(
                "reviewer",
              );

              setNotice({
                type: "success",
                message:
                  `Invitation sent to ${normalizedEmail}.`,
              });

              await loadTeam(
                true,
              );
            } catch (error) {
              setInviteOpen(false);

              setNotice({
                type: "error",
                message:
                  getErrorMessage(
                    error,
                    "Unable to create administrator invitation.",
                  ),
              });
            } finally {
              setInviteSubmitting(
                false,
              );
            }
          }}
        />
      ) : null}
    </AdminShell>
  );
}


/*
 * Supporting presentation components are added in the next
 * section of this same file.
 */


function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div
      className="
        rounded-2xl
        border
        border-white/[0.06]
        bg-white/[0.018]
        p-4
      "
    >
      <div
        className="
          flex
          items-center
          justify-between
          gap-3
        "
      >
        <div
          className="
            text-[10px]
            font-bold
            uppercase
            tracking-[0.12em]
            text-slate-500
          "
        >
          {label}
        </div>

        <div
          className="
            flex
            size-8
            items-center
            justify-center
            rounded-xl
            border
            border-violet-500/15
            bg-violet-500/[0.06]
            text-violet-300
          "
        >
          <Icon
            className="size-3.5"
            aria-hidden="true"
          />
        </div>
      </div>

      <div
        className="
          mt-3
          text-2xl
          font-bold
          tracking-[-0.04em]
          text-white
        "
      >
        {value}
      </div>
    </div>
  );
}


function TeamMembersSection({
  members,
  currentAdmin,
  isSuperAdmin,
  busyAction,
  onActionBusy,
  onNotice,
  onReload,
}: {
  members: AdminTeamMember[];
  currentAdmin: CurrentAdmin | null;
  isSuperAdmin: boolean;
  busyAction: string | null;
  onActionBusy: (
    value: string | null,
  ) => void;
  onNotice: (
    value: Notice,
  ) => void;
  onReload: () => Promise<void>;
}) {
  return (
    <section
      className="
        overflow-hidden
        rounded-2xl
        border
        border-white/[0.06]
        bg-white/[0.015]
      "
    >
      <div
        className="
          flex
          flex-col
          gap-2
          border-b
          border-white/[0.06]
          px-5
          py-4
          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >
        <div>
          <h2
            className="
              text-sm
              font-bold
              text-white
            "
          >
            Administrator team
          </h2>

          <p
            className="
              mt-1
              text-xs
              leading-5
              text-slate-500
            "
          >
            Access is enforced by the
            backend. Sensitive changes
            require administrator
            step-up verification.
          </p>
        </div>

        {!isSuperAdmin ? (
          <div
            className="
              inline-flex
              items-center
              gap-2
              self-start
              rounded-full
              border
              border-amber-500/15
              bg-amber-500/[0.05]
              px-3
              py-1.5
              text-[10px]
              font-bold
              uppercase
              tracking-[0.08em]
              text-amber-300
            "
          >
            <KeyRound
              className="size-3"
              aria-hidden="true"
            />

            Read only
          </div>
        ) : null}
      </div>

      {members.length === 0 ? (
        <div
          className="
            px-5
            py-14
            text-center
          "
        >
          <Users
            className="
              mx-auto
              size-6
              text-slate-600
            "
            aria-hidden="true"
          />

          <p
            className="
              mt-3
              text-sm
              font-semibold
              text-slate-300
            "
          >
            No administrators found
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table
            className="
              w-full
              min-w-[900px]
              border-collapse
              text-left
            "
          >
            <thead>
              <tr
                className="
                  border-b
                  border-white/[0.05]
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.1em]
                  text-slate-600
                "
              >
                <th className="px-5 py-3">
                  Administrator
                </th>

                <th className="px-4 py-3">
                  Role
                </th>

                <th className="px-4 py-3">
                  Security
                </th>

                <th className="px-4 py-3">
                  Last login
                </th>

                <th className="px-4 py-3">
                  Status
                </th>

                <th className="px-5 py-3 text-right">
                  Access controls
                </th>
              </tr>
            </thead>

            <tbody>
              {members.map(
                (member) => {
                  const isSelf =
                    currentAdmin?.id ===
                    member.id;

                  return (
                    <TeamMemberRow
                      key={member.id}
                      member={member}
                      isSelf={isSelf}
                      isSuperAdmin={
                        isSuperAdmin
                      }
                      busyAction={
                        busyAction
                      }
                      onActionBusy={
                        onActionBusy
                      }
                      onNotice={
                        onNotice
                      }
                      onReload={
                        onReload
                      }
                    />
                  );
                },
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}


function TeamMemberRow({
  member,
  isSelf,
  isSuperAdmin,
  busyAction,
  onActionBusy,
  onNotice,
  onReload,
}: {
  member: AdminTeamMember;
  isSelf: boolean;
  isSuperAdmin: boolean;
  busyAction: string | null;
  onActionBusy: (
    value: string | null,
  ) => void;
  onNotice: (
    value: Notice,
  ) => void;
  onReload: () => Promise<void>;
}) {
  const actionPrefix =
    `member:${member.id}:`;

  const memberBusy =
    busyAction?.startsWith(
      actionPrefix,
    ) ?? false;


  async function performSensitiveAction(
    actionName: string,
    action: () => Promise<unknown>,
    successMessage: string,
  ): Promise<void> {
    if (
      !isSuperAdmin ||
      memberBusy
    ) {
      return;
    }

    onNotice(null);
    onActionBusy(
      `${actionPrefix}${actionName}`,
    );

    try {
      await stepUpAdminSession();
      await action();

      onNotice({
        type: "success",
        message: successMessage,
      });

      await onReload();
    } catch (error) {
      onNotice({
        type: "error",
        message: getErrorMessage(
          error,
          "Unable to update administrator access.",
        ),
      });
    } finally {
      onActionBusy(null);
    }
  }


  return (
    <tr
      className="
        border-b
        border-white/[0.045]
        transition
        last:border-0
        hover:bg-white/[0.02]
      "
    >
      <td className="px-5 py-4">
        <div
          className="
            flex
            items-center
            gap-3
          "
        >
          <div
            className="
              flex
              size-9
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-white/[0.07]
              bg-white/[0.025]
              text-xs
              font-bold
              uppercase
              text-slate-300
            "
          >
            {(
              member.display_name ||
              member.email
            )
              .slice(0, 2)
              .toUpperCase()}
          </div>

          <div className="min-w-0">
            <div
              className="
                flex
                items-center
                gap-2
              "
            >
              <span
                className="
                  max-w-[220px]
                  truncate
                  text-sm
                  font-semibold
                  text-slate-200
                "
              >
                {member.display_name ||
                  "Administrator"}
              </span>

              {isSelf ? (
                <span
                  className="
                    rounded-full
                    border
                    border-violet-500/20
                    bg-violet-500/[0.07]
                    px-2
                    py-0.5
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-[0.08em]
                    text-violet-300
                  "
                >
                  You
                </span>
              ) : null}
            </div>

            <div
              className="
                mt-0.5
                max-w-[260px]
                truncate
                text-xs
                text-slate-500
              "
            >
              {member.email}
            </div>
          </div>
        </div>
      </td>

      <td className="px-4 py-4">
        {isSuperAdmin &&
        !isSelf ? (
          <select
            value={member.role}
            disabled={memberBusy}
            onChange={(event) => {
              const nextRole =
                event.target
                  .value as AdminRole;

              if (
                nextRole ===
                member.role
              ) {
                return;
              }

              void performSensitiveAction(
                "role",
                () =>
                  changeAdminRole(
                    member.id,
                    nextRole,
                  ),
                `Role updated to ${roleLabel(
                  nextRole,
                )}.`,
              );
            }}
            className="
              h-9
              rounded-xl
              border
              border-white/[0.08]
              bg-[#0d0d12]
              px-3
              text-xs
              font-semibold
              text-slate-300
              outline-none
              transition
              focus:border-violet-500/40
              disabled:opacity-50
            "
          >
            {ROLE_OPTIONS.map(
              (option) => (
                <option
                  key={
                    option.value
                  }
                  value={
                    option.value
                  }
                >
                  {option.label}
                </option>
              ),
            )}
          </select>
        ) : (
          <RoleBadge
            role={member.role}
          />
        )}
      </td>

      <td className="px-4 py-4">
        <div
          className="
            flex
            flex-col
            gap-1
          "
        >
          <span
            className={`
              inline-flex
              w-fit
              items-center
              gap-1.5
              text-xs
              font-semibold
              ${
                member.mfa_enabled
                  ? "text-emerald-300"
                  : "text-amber-300"
              }
            `}
          >
            {member.mfa_enabled ? (
              <ShieldCheck
                className="size-3"
                aria-hidden="true"
              />
            ) : (
              <ShieldOff
                className="size-3"
                aria-hidden="true"
              />
            )}

            {member.mfa_enabled
              ? "MFA enabled"
              : "MFA pending"}
          </span>

          <span
            className="
              text-[10px]
              text-slate-600
            "
          >
            Security updated{" "}
            {formatDateTime(
              member.security_updated_at,
            )}
          </span>
        </div>
      </td>

      <td
        className="
          px-4
          py-4
          text-xs
          text-slate-400
        "
      >
        {formatDateTime(
          member.last_login_at,
        )}
      </td>

      <td className="px-4 py-4">
        <span
          className={`
            inline-flex
            items-center
            gap-1.5
            rounded-full
            border
            px-2.5
            py-1
            text-[10px]
            font-bold
            uppercase
            tracking-[0.07em]
            ${
              member.is_active
                ? `
                    border-emerald-500/15
                    bg-emerald-500/[0.05]
                    text-emerald-300
                  `
                : `
                    border-rose-500/15
                    bg-rose-500/[0.05]
                    text-rose-300
                  `
            }
          `}
        >
          <span
            className={`
              size-1.5
              rounded-full
              ${
                member.is_active
                  ? "bg-emerald-400"
                  : "bg-rose-400"
              }
            `}
          />

          {member.is_active
            ? "Active"
            : "Disabled"}
        </span>
      </td>

      <td className="px-5 py-4">
        <div
          className="
            flex
            items-center
            justify-end
            gap-2
          "
        >
          {memberBusy ? (
            <LoaderCircle
              className="
                size-4
                animate-spin
                text-violet-300
              "
              aria-hidden="true"
            />
          ) : null}

          {isSuperAdmin ? (
            <>
              <button
                type="button"
                disabled={
                  memberBusy
                }
                title="Revoke active sessions"
                onClick={() => {
                  void performSensitiveAction(
                    "sessions",
                    () =>
                      revokeTeamAdminSessions(
                        member.id,
                      ),
                    isSelf
                      ? "Your other administrator sessions were revoked."
                      : `Sessions revoked for ${member.email}.`,
                  );
                }}
                className="
                  inline-flex
                  size-9
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-white/[0.07]
                  bg-white/[0.02]
                  text-slate-400
                  transition
                  hover:border-violet-500/25
                  hover:bg-violet-500/[0.06]
                  hover:text-violet-300
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                <RotateCcwKey
                  className="size-3.5"
                  aria-hidden="true"
                />
              </button>

              {!isSelf ? (
                <button
                  type="button"
                  disabled={
                    memberBusy
                  }
                  title={
                    member.is_active
                      ? "Disable administrator"
                      : "Enable administrator"
                  }
                  onClick={() => {
                    if (
                      member.is_active
                    ) {
                      void performSensitiveAction(
                        "disable",
                        () =>
                          disableTeamAdmin(
                            member.id,
                          ),
                        `${member.email} was disabled.`,
                      );

                      return;
                    }

                    void performSensitiveAction(
                      "enable",
                      () =>
                        enableTeamAdmin(
                          member.id,
                        ),
                      `${member.email} was enabled.`,
                    );
                  }}
                  className={`
                    inline-flex
                    h-9
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    border
                    px-3
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.06em]
                    transition
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                    ${
                      member.is_active
                        ? `
                            border-rose-500/15
                            bg-rose-500/[0.04]
                            text-rose-300
                            hover:bg-rose-500/[0.08]
                          `
                        : `
                            border-emerald-500/15
                            bg-emerald-500/[0.04]
                            text-emerald-300
                            hover:bg-emerald-500/[0.08]
                          `
                    }
                  `}
                >
                  {member.is_active ? (
                    <UserRoundX
                      className="size-3.5"
                      aria-hidden="true"
                    />
                  ) : (
                    <UserCheck
                      className="size-3.5"
                      aria-hidden="true"
                    />
                  )}

                  {member.is_active
                    ? "Disable"
                    : "Enable"}
                </button>
              ) : null}
            </>
          ) : (
            <span
              className="
                text-[10px]
                font-semibold
                text-slate-600
              "
            >
              Restricted
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}


function RoleBadge({
  role,
}: {
  role: AdminRole;
}) {
  return (
    <span
      className="
        inline-flex
        items-center
        gap-1.5
        rounded-full
        border
        border-violet-500/15
        bg-violet-500/[0.05]
        px-2.5
        py-1
        text-[10px]
        font-bold
        uppercase
        tracking-[0.06em]
        text-violet-300
      "
    >
      <UserCog
        className="size-3"
        aria-hidden="true"
      />

      {roleLabel(role)}
    </span>
  );
}


function InvitationsSection({
  invitations,
  currentTime,
  isSuperAdmin,
  busyAction,
  onActionBusy,
  onNotice,
  onReload,
}: {
  invitations: AdminInvitation[];
  currentTime: number;
  isSuperAdmin: boolean;
  busyAction: string | null;
  onActionBusy: (
    value: string | null,
  ) => void;
  onNotice: (
    value: Notice,
  ) => void;
  onReload: () => Promise<void>;
}) {
  return (
    <section
      className="
        overflow-hidden
        rounded-2xl
        border
        border-white/[0.06]
        bg-white/[0.015]
      "
    >
      <div
        className="
          border-b
          border-white/[0.06]
          px-5
          py-4
        "
      >
        <h2
          className="
            text-sm
            font-bold
            text-white
          "
        >
          Administrator invitations
        </h2>

        <p
          className="
            mt-1
            text-xs
            leading-5
            text-slate-500
          "
        >
          Track pending, accepted,
          expired and revoked access
          invitations.
        </p>
      </div>

      {invitations.length === 0 ? (
        <div
          className="
            px-5
            py-12
            text-center
          "
        >
          <MailPlus
            className="
              mx-auto
              size-6
              text-slate-600
            "
            aria-hidden="true"
          />

          <p
            className="
              mt-3
              text-sm
              font-semibold
              text-slate-300
            "
          >
            No invitations yet
          </p>

          <p
            className="
              mt-1
              text-xs
              text-slate-600
            "
          >
            New administrator
            invitations will appear
            here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.045]">
          {invitations.map(
            (invitation) => {
              const actionKey =
                `invite:${invitation.id}`;

              const busy =
                busyAction ===
                actionKey;

              const expired =
                new Date(
                  invitation.expires_at,
                ).getTime() <=
                currentTime;

              const pending =
                !invitation.accepted_at &&
                !invitation.revoked_at &&
                !expired;

              let state =
                "Expired";

              if (
                invitation.accepted_at
              ) {
                state =
                  "Accepted";
              } else if (
                invitation.revoked_at
              ) {
                state =
                  "Revoked";
              } else if (pending) {
                state =
                  "Pending";
              }

              return (
                <div
                  key={
                    invitation.id
                  }
                  className="
                    flex
                    flex-col
                    gap-4
                    px-5
                    py-4
                    lg:flex-row
                    lg:items-center
                    lg:justify-between
                  "
                >
                  <div
                    className="
                      flex
                      min-w-0
                      items-start
                      gap-3
                    "
                  >
                    <div
                      className="
                        flex
                        size-9
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        border
                        border-white/[0.07]
                        bg-white/[0.025]
                        text-slate-400
                      "
                    >
                      <MailPlus
                        className="size-3.5"
                        aria-hidden="true"
                      />
                    </div>

                    <div className="min-w-0">
                      <div
                        className="
                          truncate
                          text-sm
                          font-semibold
                          text-slate-200
                        "
                      >
                        {invitation.email}
                      </div>

                      <div
                        className="
                          mt-1
                          flex
                          flex-wrap
                          items-center
                          gap-x-3
                          gap-y-1
                          text-[11px]
                          text-slate-500
                        "
                      >
                        <span>
                          {roleLabel(
                            invitation.role,
                          )}
                        </span>

                        <span>
                          Created{" "}
                          {formatDateTime(
                            invitation.created_at,
                          )}
                        </span>

                        <span>
                          Expires{" "}
                          {formatDateTime(
                            invitation.expires_at,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="
                      flex
                      items-center
                      gap-3
                      self-start
                      lg:self-auto
                    "
                  >
                    <span
                      className={`
                        rounded-full
                        border
                        px-2.5
                        py-1
                        text-[10px]
                        font-bold
                        uppercase
                        tracking-[0.06em]
                        ${
                          state ===
                          "Pending"
                            ? `
                                border-amber-500/15
                                bg-amber-500/[0.05]
                                text-amber-300
                              `
                            : state ===
                                "Accepted"
                              ? `
                                  border-emerald-500/15
                                  bg-emerald-500/[0.05]
                                  text-emerald-300
                                `
                              : `
                                  border-white/[0.07]
                                  bg-white/[0.025]
                                  text-slate-500
                                `
                        }
                      `}
                    >
                      {state}
                    </span>

                    {isSuperAdmin &&
                    pending ? (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            if (busy) {
                              return;
                            }

                            onActionBusy(
                              actionKey,
                            );
                            onNotice(null);

                            void (async () => {
                              try {
                                await stepUpAdminSession();

                                await resendAdminInvitation(
                                  invitation.id,
                                );

                                onNotice({
                                  type: "success",
                                  message:
                                    `Invitation for ${invitation.email} was resent.`,
                                });

                                await onReload();
                              } catch (error) {
                                onNotice({
                                  type: "error",
                                  message:
                                    getErrorMessage(
                                      error,
                                      "Unable to resend administrator invitation.",
                                    ),
                                });
                              } finally {
                                onActionBusy(null);
                              }
                            })();
                          }}
                          className="
                            inline-flex
                            h-8
                            items-center
                            justify-center
                            gap-1.5
                            rounded-lg
                            border
                            border-sky-500/15
                            bg-sky-500/[0.04]
                            px-3
                            text-[10px]
                            font-bold
                            uppercase
                            tracking-[0.06em]
                            text-sky-300
                            transition
                            hover:bg-sky-500/[0.08]
                            disabled:cursor-not-allowed
                            disabled:opacity-40
                          "
                        >
                          {busy ? (
                            <LoaderCircle
                              className="size-3 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <RefreshCw
                              className="size-3"
                              aria-hidden="true"
                            />
                          )}

                          Resend
                        </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (busy) {
                            return;
                          }

                          onActionBusy(
                            actionKey,
                          );
                          onNotice(null);

                          void (async () => {
                            try {
                              await stepUpAdminSession();

                              await revokeAdminInvitation(
                                invitation.id,
                                "Revoked by Super Administrator.",
                              );

                              onNotice({
                                type: "success",
                                message:
                                  `Invitation for ${invitation.email} was revoked.`,
                              });

                              await onReload();
                            } catch (
                              error
                            ) {
                              onNotice({
                                type: "error",
                                message:
                                  getErrorMessage(
                                    error,
                                    "Unable to revoke administrator invitation.",
                                  ),
                              });
                            } finally {
                              onActionBusy(
                                null,
                              );
                            }
                          })();
                        }}
                        className="
                          inline-flex
                          h-8
                          items-center
                          justify-center
                          gap-1.5
                          rounded-lg
                          border
                          border-rose-500/15
                          bg-rose-500/[0.04]
                          px-3
                          text-[10px]
                          font-bold
                          uppercase
                          tracking-[0.06em]
                          text-rose-300
                          transition
                          hover:bg-rose-500/[0.08]
                          disabled:cursor-not-allowed
                          disabled:opacity-40
                        "
                      >
                        {busy ? (
                          <LoaderCircle
                            className="
                              size-3
                              animate-spin
                            "
                            aria-hidden="true"
                          />
                        ) : (
                          <X
                            className="size-3"
                            aria-hidden="true"
                          />
                        )}

                        Revoke
                      </button>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            },
          )}
        </div>
      )}
    </section>
  );
}


function InviteAdminDialog({
  email,
  role,
  submitting,
  onEmailChange,
  onRoleChange,
  onClose,
  onSubmit,
}: {
  email: string;
  role: AdminRole;
  submitting: boolean;
  onEmailChange: (
    value: string,
  ) => void;
  onRoleChange: (
    value: AdminRole,
  ) => void;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}) {
  return (
    <div
      className="
        fixed
        inset-0
        z-[100]
        flex
        items-center
        justify-center
        bg-black/70
        px-4
        backdrop-blur-md
      "
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-admin-title"
    >
      <div
        className="
          w-full
          max-w-lg
          overflow-hidden
          rounded-[24px]
          border
          border-white/[0.08]
          bg-[#0b0b10]
          shadow-2xl
          shadow-black/60
        "
      >
        <div
          className="
            flex
            items-start
            justify-between
            gap-4
            border-b
            border-white/[0.06]
            px-6
            py-5
          "
        >
          <div>
            <div
              className="
                flex
                items-center
                gap-2
                text-[10px]
                font-bold
                uppercase
                tracking-[0.1em]
                text-violet-400
              "
            >
              <ShieldCheck
                className="size-3.5"
                aria-hidden="true"
              />

              Secure onboarding
            </div>

            <h2
              id="invite-admin-title"
              className="
                mt-2
                text-xl
                font-bold
                tracking-[-0.03em]
                text-white
              "
            >
              Invite administrator
            </h2>

            <p
              className="
                mt-1
                text-xs
                leading-5
                text-slate-500
              "
            >
              The invitation is bound
              to the exact email
              address and selected
              administrator role.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="
              flex
              size-9
              shrink-0
              items-center
              justify-center
              rounded-xl
              border
              border-white/[0.07]
              text-slate-500
              transition
              hover:bg-white/[0.04]
              hover:text-white
              disabled:opacity-40
            "
          >
            <X
              className="size-4"
              aria-hidden="true"
            />
          </button>
        </div>


          <form
            className="p-6"
            onSubmit={(event) => {
              event.preventDefault();
              void onSubmit();
            }}
          >
            <label
              className="
                block
                text-[11px]
                font-bold
                uppercase
                tracking-[0.08em]
                text-slate-400
              "
            >
              Administrator email

              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                disabled={submitting}
                onChange={(event) => {
                  onEmailChange(
                    event.target.value,
                  );
                }}
                placeholder="admin@example.com"
                className="
                  mt-2
                  h-11
                  w-full
                  rounded-xl
                  border
                  border-white/[0.08]
                  bg-white/[0.025]
                  px-3.5
                  text-sm
                  font-medium
                  normal-case
                  tracking-normal
                  text-white
                  outline-none
                  transition
                  placeholder:text-slate-700
                  focus:border-violet-500/40
                  focus:bg-violet-500/[0.025]
                  disabled:opacity-50
                "
              />
            </label>


            <div className="mt-5">
              <div
                className="
                  text-[11px]
                  font-bold
                  uppercase
                  tracking-[0.08em]
                  text-slate-400
                "
              >
                Access role
              </div>

              <div
                className="
                  mt-2
                  grid
                  gap-2
                "
              >
                {ROLE_OPTIONS.map(
                  (option) => {
                    const selected =
                      role ===
                      option.value;

                    return (
                      <button
                        key={
                          option.value
                        }
                        type="button"
                        disabled={
                          submitting
                        }
                        onClick={() => {
                          onRoleChange(
                            option.value,
                          );
                        }}
                        className={`
                          flex
                          items-start
                          gap-3
                          rounded-xl
                          border
                          p-3.5
                          text-left
                          transition
                          disabled:opacity-50
                          ${
                            selected
                              ? `
                                  border-violet-500/30
                                  bg-violet-500/[0.07]
                                `
                              : `
                                  border-white/[0.06]
                                  bg-white/[0.015]
                                  hover:border-white/[0.1]
                                  hover:bg-white/[0.025]
                                `
                          }
                        `}
                      >
                        <span
                          className={`
                            mt-0.5
                            flex
                            size-7
                            shrink-0
                            items-center
                            justify-center
                            rounded-lg
                            border
                            ${
                              selected
                                ? `
                                    border-violet-500/25
                                    bg-violet-500/10
                                    text-violet-300
                                  `
                                : `
                                    border-white/[0.07]
                                    text-slate-600
                                  `
                            }
                          `}
                        >
                          {selected ? (
                            <Check
                              className="size-3.5"
                              aria-hidden="true"
                            />
                          ) : (
                            <UserCog
                              className="size-3.5"
                              aria-hidden="true"
                            />
                          )}
                        </span>

                        <span>
                          <span
                            className="
                              block
                              text-xs
                              font-bold
                              text-slate-200
                            "
                          >
                            {option.label}
                          </span>

                          <span
                            className="
                              mt-1
                              block
                              text-[11px]
                              leading-4
                              text-slate-600
                            "
                          >
                            {
                              option.description
                            }
                          </span>
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
            </div>


            <div
              className="
                mt-6
                flex
                items-center
                justify-end
                gap-2
              "
            >
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="
                  inline-flex
                  h-10
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-white/[0.08]
                  px-4
                  text-xs
                  font-semibold
                  text-slate-400
                  transition
                  hover:bg-white/[0.04]
                  hover:text-white
                  disabled:opacity-40
                "
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  submitting ||
                  !email.trim()
                }
                className="
                  inline-flex
                  h-10
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-violet-500
                  px-5
                  text-xs
                  font-bold
                  text-white
                  shadow-lg
                  shadow-violet-950/30
                  transition
                  hover:bg-violet-400
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {submitting ? (
                  <LoaderCircle
                    className="
                      size-3.5
                      animate-spin
                    "
                    aria-hidden="true"
                  />
                ) : (
                  <MailPlus
                    className="size-3.5"
                    aria-hidden="true"
                  />
                )}

                {submitting
                  ? "Verifying…"
                  : "Create invitation"}
              </button>
            </div>
          </form>
      </div>
    </div>
  );
}
