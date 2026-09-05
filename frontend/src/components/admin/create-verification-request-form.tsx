"use client";

import {
  ArrowLeft,
  CalendarClock,
  Check,
  Clock3,
  Copy,
  ExternalLink,
  Fingerprint,
  Info,
  Link2,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  AdminShell,
} from "@/components/admin/admin-shell";

import {
  createVerificationRequest,
} from "@/lib/admin-api";

import type {
  VerificationRequestCreatedResponse,
} from "@/types/admin-actions";


const DEFAULT_REQUIREMENTS = {
  legal_name: true,
  date_of_birth: true,
  age_confirmation: false,

  issuing_country: true,
  document_type: true,

  document_front: true,
  document_back: false,

  selfie: false,
  liveness: false,
};


type RequirementKey =
  keyof typeof DEFAULT_REQUIREMENTS;


type ExpirationPeriod =
  | "AM"
  | "PM";


const REQUIREMENT_GROUPS: Array<{
  title: string;
  description: string;
  keys: RequirementKey[];
}> = [
  {
    title: "Identity details",
    description:
      "Information the applicant enters directly in the verification form.",
    keys: [
      "legal_name",
      "date_of_birth",
      "age_confirmation",
      "issuing_country",
      "document_type",
    ],
  },
  {
    title: "Evidence capture",
    description:
      "Private identity evidence that must be uploaded before submission.",
    keys: [
      "document_front",
      "document_back",
      "selfie",
      "liveness",
    ],
  },
];


export function CreateVerificationRequestForm() {
  const router =
    useRouter();

  const [
    discordId,
    setDiscordId,
  ] =
    useState("");

  const [
    usernameSnapshot,
    setUsernameSnapshot,
  ] =
    useState("");

  const [
    expirationDate,
    setExpirationDate,
  ] =
    useState("");

  const [
    expirationTime,
    setExpirationTime,
  ] =
    useState("");

  const [
    expirationPeriod,
    setExpirationPeriod,
  ] =
    useState<ExpirationPeriod>(
      "PM",
    );

  const [
    maxSubmissions,
    setMaxSubmissions,
  ] =
    useState(1);

  const [
    requirements,
    setRequirements,
  ] =
    useState(
      DEFAULT_REQUIREMENTS,
    );

  const [
    creating,
    setCreating,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    created,
    setCreated,
  ] =
    useState<VerificationRequestCreatedResponse | null>(
      null,
    );


  const selectedRequirementCount =
    useMemo(
      () =>
        Object.values(
          requirements,
        ).filter(
          Boolean,
        ).length,
      [requirements],
    );


  function toggleRequirement(
    key: RequirementKey,
  ): void {
    setRequirements(
      (current) => ({
        ...current,
        [key]:
          !current[key],
      }),
    );
  }


  function validate(): string | null {
    const normalizedDiscordId =
      discordId.trim();

    if (
      !/^\d{17,20}$/.test(
        normalizedDiscordId,
      )
    ) {
      return "Enter a valid 17-20 digit Discord User ID.";
    }

    if (
      usernameSnapshot.length >
      100
    ) {
      return "Username snapshot is too long.";
    }

    if (
      !Number.isInteger(
        maxSubmissions,
      ) ||
      maxSubmissions < 1 ||
      maxSubmissions > 10
    ) {
      return "Max submissions must be between 1 and 10.";
    }

    if (
      selectedRequirementCount ===
      0
    ) {
      return "Select at least one verification requirement.";
    }

    const normalizedDate =
      expirationDate.trim();

    const normalizedTime =
      expirationTime.trim();

    const hasAnyExpirationValue =
      Boolean(
        normalizedDate ||
          normalizedTime,
      );

    if (
      hasAnyExpirationValue &&
      (
        !normalizedDate ||
        !normalizedTime
      )
    ) {
      return "Enter both the expiration date and expiration time.";
    }

    if (
      normalizedDate &&
      normalizedTime
    ) {
      const expiration =
        parseExpirationDateTime(
          normalizedDate,
          normalizedTime,
          expirationPeriod,
        );

      if (!expiration) {
        return "Enter a valid expiration date and time.";
      }

      if (
        expiration.getTime() <=
        Date.now()
      ) {
        return "Expiration must be in the future.";
      }
    }

    return null;
  }


  async function submit(): Promise<void> {
    if (creating) {
      return;
    }

    setError(
      null,
    );

    const validationError =
      validate();

    if (validationError) {
      setError(
        validationError,
      );

      return;
    }

    let expiresAt:
      | string
      | null =
      null;

    if (
      expirationDate.trim() &&
      expirationTime.trim()
    ) {
      const expiration =
        parseExpirationDateTime(
          expirationDate,
          expirationTime,
          expirationPeriod,
        );

      if (!expiration) {
        setError(
          "Enter a valid expiration date and time.",
        );

        return;
      }

      expiresAt =
        expiration.toISOString();
    }

    setCreating(
      true,
    );

    try {
      const result =
        await createVerificationRequest(
          {
            assigned_discord_user_id:
              discordId.trim(),

            discord_username_snapshot:
              usernameSnapshot.trim() ||
              null,

            required_evidence:
              requirements,

            expires_at:
              expiresAt,

            max_submissions:
              maxSubmissions,
          },
        );

      setCreated(
        result,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to create verification request.",
      );
    } finally {
      setCreating(
        false,
      );
    }
  }


  function resetForm(): void {
    setCreated(
      null,
    );

    setDiscordId(
      "",
    );

    setUsernameSnapshot(
      "",
    );

    setExpirationDate(
      "",
    );

    setExpirationTime(
      "",
    );

    setExpirationPeriod(
      "PM",
    );

    setMaxSubmissions(
      1,
    );

    setRequirements(
      DEFAULT_REQUIREMENTS,
    );

    setError(
      null,
    );
  }


  if (created) {
    return (
      <AdminShell>
        <CreatedRequestState
          request={
            created
          }
          onBackToQueue={() => {
            router.push(
              "/admin/verification-queue",
            );
          }}
          onCreateAnother={
            resetForm
          }
        />
      </AdminShell>
    );
  }


  return (
    <AdminShell>
      <div
        className="
          mx-auto
          max-w-[1080px]
          space-y-6
        "
      >
        <button
          type="button"
          onClick={() => {
            router.push(
              "/admin/verification-queue",
            );
          }}
          className="
            inline-flex
            min-h-10
            items-center
            gap-2
            rounded-xl
            px-1
            text-[10px]
            font-semibold
            text-slate-600
            transition
            hover:text-slate-300
          "
        >
          <ArrowLeft
            className="size-3.5"
            aria-hidden="true"
          />

          Back to queue
        </button>


        <header>
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
            <Link2
              className="size-3.5"
              aria-hidden="true"
            />

            One-person verification link
          </div>

          <h1
            className="
              mt-2
              text-[30px]
              font-bold
              tracking-[-0.045em]
              text-white
              sm:text-[34px]
            "
          >
            Create verification request
          </h1>

          <p
            className="
              mt-2
              max-w-[700px]
              text-sm
              leading-6
              text-slate-500
            "
          >
            Create one private request bound to exactly one immutable Discord User ID. The link only permits that account to attempt verification.
          </p>
        </header>


        <div
          className="
            grid
            gap-6
            xl:grid-cols-[minmax(0,1fr)_330px]
          "
        >
          <section
            className="
              overflow-hidden
              rounded-[22px]
              border
              border-white/[0.07]
              bg-black
              text-white
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
              <div
                className="
                  text-xs
                  font-bold
                  text-slate-200
                "
              >
                Request configuration
              </div>

              <p
                className="
                  mt-1
                  text-[9px]
                  leading-4
                  text-slate-600
                "
              >
                Define the account binding, expiration, and evidence required for this applicant.
              </p>
            </div>


            <div
              className="
                space-y-7
                p-5
                sm:p-6
              "
            >
              <div>
                <SectionLabel
                  icon={
                    Fingerprint
                  }
                  title="Discord identity binding"
                />

                <div
                  className="
                    mt-4
                    grid
                    gap-4
                  "
                >
                  <AdminField
                    id="create-discord-id"
                    label="Discord User ID"
                    value={
                      discordId
                    }
                    onChange={
                      setDiscordId
                    }
                    placeholder="123456789012345678"
                    description="Immutable account identifier used for the OAuth match. Do not use a username here."
                    mono
                    required
                  />

                  <AdminField
                    id="create-username-snapshot"
                    label="Username snapshot"
                    value={
                      usernameSnapshot
                    }
                    onChange={
                      setUsernameSnapshot
                    }
                    placeholder="Optional display label"
                    description="Display-only convenience field. A username change does not alter the Discord ID binding."
                  />
                </div>
              </div>


              <div
                className="
                  border-t
                  border-white/[0.055]
                  pt-6
                "
              >
                <SectionLabel
                  icon={
                    CalendarClock
                  }
                  title="Request lifetime"
                />

                <div
                  className="
                    mt-4
                    grid
                    gap-4
                    sm:grid-cols-2
                  "
                >
                  <div className="block">
                    <FieldLabel>
                      Expiration
                    </FieldLabel>

                    <div
                      className="
                        grid
                        grid-cols-1
                        gap-2
                        sm:grid-cols-[minmax(0,1fr)_120px_78px]
                      "
                    >
                      <div>
                        <label
                          htmlFor="create-expiration-date"
                          className="sr-only"
                        >
                          Expiration date
                        </label>

                        <input
                          id="create-expiration-date"
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="DD/MM/YYYY"
                          value={
                            expirationDate
                          }
                          onChange={(event) => {
                            setExpirationDate(
                              normalizeExpirationDateInput(
                                event.target.value,
                              ),
                            );
                          }}
                          onBlur={() => {
                            setExpirationDate(
                              normalizeExpirationDateOnBlur(
                                expirationDate,
                              ),
                            );
                          }}
                          maxLength={10}
                          aria-label="Expiration date in day month year format"
                          className={
                            inputClass
                          }
                        />
                      </div>


                      <div>
                        <label
                          htmlFor="create-expiration-time"
                          className="sr-only"
                        >
                          Expiration time
                        </label>

                        <input
                          id="create-expiration-time"
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="HH:MM"
                          value={
                            expirationTime
                          }
                          onChange={(event) => {
                            setExpirationTime(
                              normalizeExpirationTimeInput(
                                event.target.value,
                              ),
                            );
                          }}
                          onBlur={() => {
                            setExpirationTime(
                              normalizeExpirationTimeOnBlur(
                                expirationTime,
                              ),
                            );
                          }}
                          maxLength={5}
                          aria-label="Expiration time in twelve hour format"
                          className={
                            inputClass
                          }
                        />
                      </div>


                      <div>
                        <label
                          htmlFor="create-expiration-period"
                          className="sr-only"
                        >
                          AM or PM
                        </label>

                        <select
                          id="create-expiration-period"
                          value={
                            expirationPeriod
                          }
                          onChange={(event) => {
                            setExpirationPeriod(
                              event.target.value as
                                ExpirationPeriod,
                            );
                          }}
                          aria-label="Expiration AM or PM"
                          className={`
                            ${inputClass}
                            min-w-[76px]
                            cursor-pointer
                          `}
                        >
                          <option value="AM">
                            AM
                          </option>

                          <option value="PM">
                            PM
                          </option>
                        </select>
                      </div>
                    </div>


                    <p
                      className="
                        mt-2
                        text-[9px]
                        leading-4
                        text-slate-700
                      "
                    >
                      Optional. Type a local date and time, for example 31/08/2026 at 09:30 PM. Leave the date and time empty to use the default request lifetime.
                    </p>
                  </div>


                  <label
                    htmlFor="create-max-submissions"
                    className="block"
                  >
                    <FieldLabel>
                      Max submissions
                    </FieldLabel>

                    <input
                      id="create-max-submissions"
                      type="number"
                      min={1}
                      max={10}
                      step={1}
                      value={
                        maxSubmissions
                      }
                      onChange={(event) => {
                        const parsed =
                          Number.parseInt(
                            event.target.value,
                            10,
                          );

                        if (
                          Number.isNaN(
                            parsed,
                          )
                        ) {
                          setMaxSubmissions(
                            1,
                          );

                          return;
                        }

                        setMaxSubmissions(
                          Math.max(
                            1,
                            Math.min(
                              10,
                              parsed,
                            ),
                          ),
                        );
                      }}
                      className={
                        inputClass
                      }
                    />

                    <p
                      className="
                        mt-2
                        text-[9px]
                        leading-4
                        text-slate-700
                      "
                    >
                      Limits repeated full submissions for this request.
                    </p>
                  </label>
                </div>
              </div>


              <div
                className="
                  border-t
                  border-white/[0.055]
                  pt-6
                "
              >
                <div
                  className="
                    flex
                    flex-col
                    gap-2
                    sm:flex-row
                    sm:items-end
                    sm:justify-between
                  "
                >
                  <div>
                    <SectionLabel
                      icon={
                        ShieldCheck
                      }
                      title="Verification requirements"
                    />

                    <p
                      className="
                        mt-2
                        max-w-[620px]
                        text-[9px]
                        leading-4
                        text-slate-700
                      "
                    >
                      Request only the information and evidence needed for this verification.
                    </p>
                  </div>

                  <div
                    className="
                      text-[9px]
                      font-semibold
                      text-slate-600
                    "
                  >
                    {
                      selectedRequirementCount
                    }{" "}
                    selected
                  </div>
                </div>


                <div
                  className="
                    mt-5
                    space-y-5
                  "
                >
                  {REQUIREMENT_GROUPS.map(
                    (
                      group,
                    ) => (
                      <div
                        key={
                          group.title
                        }
                      >
                        <div
                          className="
                            text-[9px]
                            font-bold
                            text-slate-400
                          "
                        >
                          {
                            group.title
                          }
                        </div>

                        <p
                          className="
                            mt-1
                            text-[8px]
                            leading-4
                            text-slate-700
                          "
                        >
                          {
                            group.description
                          }
                        </p>

                        <div
                          className="
                            mt-3
                            grid
                            gap-2
                            sm:grid-cols-2
                          "
                        >
                          {group.keys.map(
                            (
                              key,
                            ) => (
                              <RequirementToggle
                                key={
                                  key
                                }
                                label={
                                  formatRequirementLabel(
                                    key,
                                  )
                                }
                                checked={
                                  requirements[
                                    key
                                  ]
                                }
                                onClick={() => {
                                  toggleRequirement(
                                    key,
                                  );
                                }}
                              />
                            ),
                          )}
                        </div>
                      </div>
                    ),
                  )}
                </div>


                {requirements.liveness && (
                  <div
                    className="
                      mt-4
                      flex
                      items-start
                      gap-2
                      rounded-[13px]
                      border
                      border-amber-500/15
                      bg-amber-500/[0.04]
                      p-3
                      text-[9px]
                      leading-4
                      text-amber-200/75
                    "
                  >
                    <Info
                      className="
                        mt-0.5
                        size-3.5
                        shrink-0
                      "
                      aria-hidden="true"
                    />

                    Only enable liveness when the backend actually performs a liveness check. A normal static selfie or camera capture is not, by itself, proof of liveness.
                  </div>
                )}
              </div>


              {error && (
                <div
                  role="alert"
                  className="
                    rounded-[14px]
                    border
                    border-red-500/20
                    bg-red-500/[0.07]
                    p-3
                    text-[10px]
                    leading-5
                    text-red-300
                  "
                >
                  {error}
                </div>
              )}


              <button
                type="button"
                disabled={
                  creating
                }
                onClick={() => {
                  void submit();
                }}
                className="
                  inline-flex
                  min-h-12
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-[14px]
                  bg-violet-500
                  px-4
                  text-xs
                  font-bold
                  text-white
                  transition
                  hover:bg-violet-400
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {creating ? (
                  <LoaderCircle
                    className="
                      size-4
                      animate-spin
                    "
                    aria-hidden="true"
                  />
                ) : (
                  <Link2
                    className="size-4"
                    aria-hidden="true"
                  />
                )}

                {creating
                  ? "Creating private request"
                  : "Create private request"}
              </button>
            </div>
          </section>


          <aside
            className="
              h-fit
              space-y-4
              xl:sticky
              xl:top-[100px]
            "
          >
            <section
              className="
                rounded-[22px]
                border
                border-white/[0.07]
                bg-white/[0.025]
                p-5
              "
            >
              <div
                className="
                  flex
                  size-11
                  items-center
                  justify-center
                  rounded-[14px]
                  bg-violet-500/10
                  text-violet-300
                "
              >
                <ShieldCheck
                  className="size-5"
                  aria-hidden="true"
                />
              </div>

              <h2
                className="
                  mt-4
                  text-sm
                  font-bold
                  text-slate-200
                "
              >
                Security model
              </h2>

              <div
                className="
                  mt-4
                  space-y-3
                "
              >
                {[
                  "The request is bound to one immutable Discord User ID.",
                  "The verification URL does not need to expose that Discord ID.",
                  "Discord OAuth must match before identity submission unlocks.",
                  "The private link grants permission to attempt verification, not server access.",
                  "Controlled Discord access remains locked until explicit approval.",
                ].map(
                  (
                    item,
                  ) => (
                    <SecurityPoint
                      key={
                        item
                      }
                    >
                      {
                        item
                      }
                    </SecurityPoint>
                  ),
                )}
              </div>
            </section>


            <section
              className="
                rounded-[18px]
                border
                border-amber-500/10
                bg-black
                text-white
                p-4
              "
            >
              <div
                className="
                  flex
                  items-start
                  gap-2
                  text-[9px]
                  leading-4
                  text-amber-200/70
                "
              >
                <Clock3
                  className="
                    mt-0.5
                    size-3.5
                    shrink-0
                  "
                  aria-hidden="true"
                />

                The raw private link should be handled like a temporary secret. Share it only with the intended applicant through an appropriate private channel.
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AdminShell>
  );
}


const inputClass = `
  h-11
  w-full
  rounded-[13px]
  border
  border-white/[0.07]
  bg-black
  px-3
  text-xs
  text-white
  outline-none
  transition
  placeholder:text-slate-500
  focus:border-violet-500/40
  focus:ring-4
  focus:ring-violet-500/[0.04]
`;


function SectionLabel({
  icon: Icon,
  title,
}: {
  icon: typeof ShieldCheck;
  title: string;
}) {
  return (
    <div
      className="
        flex
        items-center
        gap-2
        text-[10px]
        font-bold
        text-slate-300
      "
    >
      <Icon
        className="
          size-3.5
          text-violet-400
        "
        aria-hidden="true"
      />

      {title}
    </div>
  );
}


function FieldLabel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="
        mb-2
        text-[10px]
        font-bold
        uppercase
        tracking-[0.08em]
        text-slate-600
      "
    >
      {children}
    </div>
  );
}


function AdminField({
  id,
  label,
  value,
  onChange,
  placeholder,
  description,
  mono = false,
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  placeholder: string;
  description: string;
  mono?: boolean;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className="block"
    >
      <FieldLabel>
        {label}

        {required && (
          <span
            className="
              ml-1
              text-violet-400
            "
          >
            *
          </span>
        )}
      </FieldLabel>

      <input
        id={id}
        value={
          value
        }
        onChange={(event) => {
          onChange(
            event.target.value,
          );
        }}
        placeholder={
          placeholder
        }
        spellCheck={
          !mono
        }
        autoComplete="off"
        className={`
          ${inputClass}
          ${
            mono
              ? "font-mono"
              : ""
          }
        `}
      />

      <p
        className="
          mt-2
          text-[9px]
          leading-4
          text-slate-700
        "
      >
        {description}
      </p>
    </label>
  );
}


function RequirementToggle({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={
        checked
      }
      onClick={
        onClick
      }
      className={`
        flex
        min-h-[48px]
        items-center
        justify-between
        gap-3
        rounded-[13px]
        border
        px-3
        py-3
        text-left
        text-[10px]
        font-semibold
        transition
        ${
          checked
            ? `
                border-violet-500/30
                bg-violet-500/10
                text-violet-200
              `
            : `
                border-white/[0.06]
                bg-[#0a111c]
                text-slate-600
                hover:border-white/[0.1]
                hover:text-slate-400
              `
        }
      `}
    >
      <span>
        {label}
      </span>

      <span
        className={`
          flex
          size-5
          shrink-0
          items-center
          justify-center
          rounded-md
          border
          transition
          ${
            checked
              ? `
                  border-violet-400
                  bg-violet-500
                  text-white
                `
              : `
                  border-white/[0.1]
                  bg-black/10
                `
          }
        `}
      >
        {checked && (
          <Check
            className="size-3"
            aria-hidden="true"
          />
        )}
      </span>
    </button>
  );
}


function SecurityPoint({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="
        flex
        items-start
        gap-2
        text-[10px]
        leading-5
        text-slate-500
      "
    >
      <Check
        className="
          mt-1
          size-3
          shrink-0
          text-violet-400
        "
        aria-hidden="true"
      />

      <span>
        {children}
      </span>
    </div>
  );
}


function CreatedRequestState({
  request,
  onBackToQueue,
  onCreateAnother,
}: {
  request: VerificationRequestCreatedResponse;
  onBackToQueue: () => void;
  onCreateAnother: () => void;
}) {
  const [
    copied,
    setCopied,
  ] =
    useState(false);

  const [
    copyError,
    setCopyError,
  ] =
    useState<string | null>(
      null,
    );


  async function copy(): Promise<void> {
    setCopyError(
      null,
    );

    try {
      await navigator.clipboard.writeText(
        request.verification_url,
      );

      setCopied(
        true,
      );

      window.setTimeout(
        () => {
          setCopied(
            false,
          );
        },
        2000,
      );
    } catch {
      setCopyError(
        "Unable to copy automatically. Select and copy the link manually.",
      );
    }
  }


  return (
    <div
      className="
        mx-auto
        max-w-[780px]
      "
    >
      <button
        type="button"
        onClick={
          onBackToQueue
        }
        className="
          mb-5
          inline-flex
          min-h-10
          items-center
          gap-2
          rounded-xl
          px-1
          text-[10px]
          font-semibold
          text-slate-600
          transition
          hover:text-slate-300
        "
      >
        <ArrowLeft
          className="size-3.5"
          aria-hidden="true"
        />

        Back to queue
      </button>


      <section
        className="
          overflow-hidden
          rounded-[24px]
          border
          border-emerald-500/20
          bg-black
          text-white
        "
      >
        <div
          className="
            px-6
            py-7
            text-center
            sm:px-8
            sm:py-8
          "
        >
          <div
            className="
              mx-auto
              flex
              size-14
              items-center
              justify-center
              rounded-[18px]
              bg-black
              text-white
            "
          >
            <Link2
              className="size-6"
              aria-hidden="true"
            />
          </div>

          <div
            className="
              mt-5
              text-[10px]
              font-bold
              uppercase
              tracking-[0.1em]
              text-emerald-400
            "
          >
            Private request created
          </div>

          <h1
            className="
              mt-2
              text-[28px]
              font-bold
              tracking-[-0.04em]
              text-white
              sm:text-[32px]
            "
          >
            Copy the verification link now
          </h1>

          <p
            className="
              mx-auto
              mt-3
              max-w-[570px]
              text-xs
              leading-5
              text-slate-500
            "
          >
            Treat this URL as a temporary private secret and send it only to the intended applicant. The applicant must still authenticate with the matching Discord User ID.
          </p>
        </div>


        <div
          className="
            border-t
            border-emerald-500/10
            bg-[#09111b]/70
            p-5
            sm:p-6
          "
        >
          <div
            className="
              text-[8px]
              font-bold
              uppercase
              tracking-[0.1em]
              text-slate-700
            "
          >
            Private verification URL
          </div>

          <div
            className="
              mt-2
              rounded-[16px]
              border
              border-white/[0.07]
              bg-[#08101a]
              p-4
            "
          >
            <div
              className="
                select-all
                break-all
                font-mono
                text-[10px]
                leading-5
                text-slate-400
              "
            >
              {
                request.verification_url
              }
            </div>
          </div>


          {copyError && (
            <div
              role="alert"
              className="
                mt-3
                rounded-[12px]
                border
                border-red-500/15
                bg-red-500/[0.05]
                p-3
                text-[9px]
                text-red-300
              "
            >
              {
                copyError
              }
            </div>
          )}


          <div
            className="
              mt-4
              grid
              gap-3
              sm:grid-cols-2
            "
          >
            <button
              type="button"
              onClick={() => {
                void copy();
              }}
              className="
                inline-flex
                min-h-11
                items-center
                justify-center
                gap-2
                rounded-[13px]
                bg-emerald-500
                px-4
                text-xs
                font-bold
                text-white
                transition
                hover:bg-emerald-400
              "
            >
              {copied ? (
                <Check
                  className="size-4"
                  aria-hidden="true"
                />
              ) : (
                <Copy
                  className="size-4"
                  aria-hidden="true"
                />
              )}

              {copied
                ? "Copied"
                : "Copy private link"}
            </button>

            <a
              href={
                request.verification_url
              }
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
              className="
                inline-flex
                min-h-11
                items-center
                justify-center
                gap-2
                rounded-[13px]
                border
                border-white/[0.07]
                bg-white/[0.03]
                px-4
                text-xs
                font-semibold
                text-slate-300
                transition
                hover:bg-white/[0.06]
                hover:text-white
              "
            >
              <ExternalLink
                className="size-4"
                aria-hidden="true"
              />

              Open verification page
            </a>
          </div>


          <div
            className="
              mt-5
              grid
              gap-3
              sm:grid-cols-2
            "
          >
            <ResultMeta
              icon={
                Clock3
              }
              label="Expiration"
              value={
                formatCreatedExpiration(
                  request.expires_at,
                )
              }
            />

            <ResultMeta
              icon={
                ShieldCheck
              }
              label="Access state"
              value="Locked until approval"
            />
          </div>


          <div
            className="
              mt-5
              flex
              items-start
              gap-2
              rounded-[13px]
              border
              border-amber-500/10
              bg-amber-500/[0.025]
              p-3
              text-[9px]
              leading-4
              text-amber-200/70
            "
          >
            <Info
              className="
                mt-0.5
                size-3.5
                shrink-0
              "
              aria-hidden="true"
            />

            If this private link is exposed or sent to the wrong person, revoke or replace the request rather than relying on secrecy alone. The Discord OAuth ID match remains the identity binding.
          </div>


          <button
            type="button"
            onClick={
              onCreateAnother
            }
            className="
              mt-5
              inline-flex
              min-h-10
              w-full
              items-center
              justify-center
              rounded-[12px]
              border
              border-white/[0.07]
              bg-white/[0.025]
              px-4
              text-[10px]
              font-bold
              text-slate-500
              transition
              hover:bg-white/[0.06]
              hover:text-white
            "
          >
            Create another request
          </button>
        </div>
      </section>
    </div>
  );
}


function ResultMeta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
}) {
  return (
    <div
      className="
        rounded-[13px]
        border
        border-white/[0.06]
        bg-white/[0.02]
        p-3
      "
    >
      <div
        className="
          flex
          items-center
          gap-1.5
          text-[8px]
          font-bold
          uppercase
          tracking-[0.08em]
          text-slate-700
        "
      >
        <Icon
          className="size-3"
          aria-hidden="true"
        />

        {label}
      </div>

      <div
        className="
          mt-1.5
          text-[10px]
          font-semibold
          text-slate-400
        "
      >
        {value}
      </div>
    </div>
  );
}


/**
 * Accepts keyboard input for DD/MM/YYYY.
 *
 * Examples:
 * 3          -> 3
 * 31         -> 31
 * 310        -> 31/0
 * 3108       -> 31/08
 * 31082026   -> 31/08/2026
 *
 * Existing slashes are also supported.
 */
function normalizeExpirationDateInput(
  value: string,
): string {
  const digits =
    value
      .replace(
        /\D/g,
        "",
      )
      .slice(
        0,
        8,
      );

  if (
    digits.length <= 2
  ) {
    return digits;
  }

  if (
    digits.length <= 4
  ) {
    return `${digits.slice(
      0,
      2,
    )}/${digits.slice(
      2,
    )}`;
  }

  return `${digits.slice(
    0,
    2,
  )}/${digits.slice(
    2,
    4,
  )}/${digits.slice(
    4,
    8,
  )}`;
}


/**
 * On blur, allow users who entered something like
 * 1/9/2026 to receive the normalized form 01/09/2026.
 */
function normalizeExpirationDateOnBlur(
  value: string,
): string {
  const trimmed =
    value.trim();

  if (!trimmed) {
    return "";
  }

  const match =
    trimmed.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    );

  if (!match) {
    return trimmed;
  }

  const day =
    match[1].padStart(
      2,
      "0",
    );

  const month =
    match[2].padStart(
      2,
      "0",
    );

  const year =
    match[3];

  return `${day}/${month}/${year}`;
}


/**
 * Accepts HH:MM in 12-hour time.
 *
 * Examples:
 * 09     -> 09
 * 093    -> 09:3
 * 0930   -> 09:30
 */
function normalizeExpirationTimeInput(
  value: string,
): string {
  const digits =
    value
      .replace(
        /\D/g,
        "",
      )
      .slice(
        0,
        4,
      );

  if (
    digits.length <= 2
  ) {
    return digits;
  }

  return `${digits.slice(
    0,
    2,
  )}:${digits.slice(
    2,
    4,
  )}`;
}


/**
 * Converts a valid single digit hour such as 9:30
 * into 09:30 when possible.
 */
function normalizeExpirationTimeOnBlur(
  value: string,
): string {
  const trimmed =
    value.trim();

  if (!trimmed) {
    return "";
  }

  const directMatch =
    trimmed.match(
      /^(\d{1,2}):(\d{2})$/,
    );

  if (directMatch) {
    return `${directMatch[1].padStart(
      2,
      "0",
    )}:${directMatch[2]}`;
  }

  const digits =
    trimmed.replace(
      /\D/g,
      "",
    );

  if (
    digits.length === 3
  ) {
    return `0${digits[0]}:${digits.slice(
      1,
    )}`;
  }

  if (
    digits.length === 4
  ) {
    return `${digits.slice(
      0,
      2,
    )}:${digits.slice(
      2,
    )}`;
  }

  return trimmed;
}


/**
 * Parse the administrator's local wall-clock time.
 *
 * Important:
 * new Date(year, month, day, hour, minute) creates a Date
 * in the browser's LOCAL timezone. Later .toISOString()
 * converts that instant to UTC for the API.
 *
 * Example in UTC+05:30:
 *
 * 31/08/2026 09:30 PM
 *
 * becomes the same instant represented in UTC by:
 *
 * 2026-08-31T16:00:00.000Z
 */
function parseExpirationDateTime(
  rawDate: string,
  rawTime: string,
  period: ExpirationPeriod,
): Date | null {
  const dateMatch =
    rawDate
      .trim()
      .match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      );

  if (!dateMatch) {
    return null;
  }

  const timeMatch =
    rawTime
      .trim()
      .match(
        /^(\d{1,2}):(\d{2})$/,
      );

  if (!timeMatch) {
    return null;
  }

  const day =
    Number.parseInt(
      dateMatch[1],
      10,
    );

  const month =
    Number.parseInt(
      dateMatch[2],
      10,
    );

  const year =
    Number.parseInt(
      dateMatch[3],
      10,
    );

  const hour12 =
    Number.parseInt(
      timeMatch[1],
      10,
    );

  const minute =
    Number.parseInt(
      timeMatch[2],
      10,
    );


  if (
    year < 2000 ||
    year > 9999
  ) {
    return null;
  }

  if (
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  if (
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  if (
    hour12 < 1 ||
    hour12 > 12
  ) {
    return null;
  }

  if (
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }


  let hour24 =
    hour12 % 12;

  if (
    period === "PM"
  ) {
    hour24 += 12;
  }


  const result =
    new Date(
      year,
      month - 1,
      day,
      hour24,
      minute,
      0,
      0,
    );


  /*
   * JavaScript normalizes impossible dates.
   *
   * For example:
   * new Date(2026, 1, 31)
   *
   * becomes a date in March rather than throwing.
   *
   * Therefore every component must be compared back
   * against the requested values.
   */
  if (
    result.getFullYear() !==
      year ||
    result.getMonth() !==
      month - 1 ||
    result.getDate() !==
      day ||
    result.getHours() !==
      hour24 ||
    result.getMinutes() !==
      minute
  ) {
    return null;
  }

  return result;
}


function formatCreatedExpiration(
  value: string,
): string {
  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Configured";
  }

  return date.toLocaleString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}


function formatRequirementLabel(
  key: string,
): string {
  return key
    .replaceAll(
      "_",
      " ",
    )
    .replace(
      /\b\w/g,
      (value) =>
        value.toUpperCase(),
    );
}