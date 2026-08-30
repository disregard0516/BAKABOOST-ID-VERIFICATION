"use client";

import type {
  ElementType,
} from "react";

import {
  CheckCircle2,
  FileQuestion,
  Info,
  ShieldAlert,
  XCircle,
} from "lucide-react";

import {
  useState,
} from "react";

import {
  ConfirmDialog,
} from "@/components/ui/confirm-dialog";

import {
  useToast,
} from "@/components/ui/toast-provider";

import {
  approveCase,
  rejectCase,
  requestMoreInfo,
} from "@/lib/admin-api";


type Decision =
  | "approve"
  | "reject"
  | "more_info";


export function DecisionPanel({
  requestId,
  onCompleted,
}: {
  requestId: string;
  onCompleted: () => void;
}) {
  const toast =
    useToast();

  const [
    selected,
    setSelected,
  ] =
    useState<Decision | null>(
      null,
    );

  const [
    reasonCode,
    setReasonCode,
  ] =
    useState("");

  const [
    internalNote,
    setInternalNote,
  ] =
    useState("");

  const [
    userMessage,
    setUserMessage,
  ] =
    useState("");

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    confirmOpen,
    setConfirmOpen,
  ] =
    useState(false);


  async function submit(): Promise<void> {
    if (!selected) {
      return;
    }

    const decision =
      selected;

    setSaving(
      true,
    );

    const payload = {
      reason_code:
        reasonCode.trim() ||
        null,

      internal_note:
        internalNote.trim() ||
        null,

      user_message:
        userMessage.trim() ||
        null,
    };


    try {
      if (
        decision ===
        "approve"
      ) {
        await approveCase(
          requestId,
          payload,
        );
      } else if (
        decision ===
        "reject"
      ) {
        await rejectCase(
          requestId,
          payload,
        );
      } else {
        await requestMoreInfo(
          requestId,
          payload,
        );
      }


      setConfirmOpen(
        false,
      );

      toast.success(
        decision ===
          "approve"
          ? "Verification approved."
          : decision ===
              "reject"
            ? "Verification rejected."
            : "More information requested.",
      );

      setSelected(
        null,
      );

      setReasonCode(
        "",
      );

      setInternalNote(
        "",
      );

      setUserMessage(
        "",
      );

      onCompleted();
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Unable to record decision.",
      );
    } finally {
      setSaving(
        false,
      );
    }
  }


  const confirmTitle =
    selected ===
    "approve"
      ? "Approve this verification?"
      : selected ===
          "reject"
        ? "Reject this verification?"
        : "Request more information?";


  const confirmDescription =
    selected ===
    "approve"
      ? "Approval makes the immutable Discord User ID eligible for controlled server access. Access is issued separately."
      : selected ===
          "reject"
        ? "This verification request will be rejected and will not release Discord server access."
        : "The applicant will remain blocked from Discord server entry and will return to the verification submission flow.";


  const confirmLabel =
    selected ===
    "approve"
      ? "Approve verification"
      : selected ===
          "reject"
        ? "Reject verification"
        : "Request more info";


  const moreInfoNeedsMessage =
    selected ===
      "more_info" &&
    !userMessage.trim();


  return (
    <>
      <section
        className="
          overflow-hidden
          rounded-[20px]
          border
          border-white/[0.07]
          bg-white/[0.025]
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
              flex
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
                rounded-[12px]
                bg-violet-500/10
                text-violet-300
              "
            >
              <ShieldAlert
                className="size-4"
                aria-hidden="true"
              />
            </div>

            <div>
              <div
                className="
                  text-xs
                  font-bold
                  text-slate-200
                "
              >
                Review decision
              </div>

              <p
                className="
                  mt-1
                  text-[9px]
                  leading-4
                  text-slate-600
                "
              >
                Decisions are auditable and change the verification state.
              </p>
            </div>
          </div>
        </div>


        <div
          className="
            space-y-5
            p-5
          "
        >
          <div>
            <div
              className="
                mb-2
                text-[8px]
                font-bold
                uppercase
                tracking-[0.09em]
                text-slate-700
              "
            >
              Select outcome
            </div>

            <div
              className="
                grid
                gap-2
                sm:grid-cols-3
                2xl:grid-cols-1
              "
            >
              <DecisionButton
                active={
                  selected ===
                  "approve"
                }
                icon={
                  CheckCircle2
                }
                label="Approve"
                description="Verification requirements are satisfied."
                tone="success"
                onClick={() => {
                  setSelected(
                    "approve",
                  );
                }}
              />

              <DecisionButton
                active={
                  selected ===
                  "more_info"
                }
                icon={
                  FileQuestion
                }
                label="More Info"
                description="Applicant must submit additional information."
                tone="warning"
                onClick={() => {
                  setSelected(
                    "more_info",
                  );
                }}
              />

              <DecisionButton
                active={
                  selected ===
                  "reject"
                }
                icon={
                  XCircle
                }
                label="Reject"
                description="Verification requirements are not satisfied."
                tone="danger"
                onClick={() => {
                  setSelected(
                    "reject",
                  );
                }}
              />
            </div>
          </div>


          {selected && (
            <div
              className="
                rounded-[14px]
                border
                border-white/[0.055]
                bg-[#0a111c]/60
                p-3
              "
            >
              <div
                className="
                  flex
                  items-start
                  gap-2
                  text-[9px]
                  leading-4
                  text-slate-500
                "
              >
                <Info
                  className="
                    mt-0.5
                    size-3.5
                    shrink-0
                    text-violet-400
                  "
                  aria-hidden="true"
                />

                {selected ===
                "approve"
                  ? "Approval does not itself expose an invite. Controlled Discord access remains a separate approved-only step."
                  : selected ===
                      "more_info"
                    ? "The request remains blocked from Discord access while the applicant provides the requested information."
                    : "Rejected requests do not receive Discord server access."}
              </div>
            </div>
          )}


          <div>
            <label
              htmlFor="decision-reason-code"
              className="
                mb-2
                block
                text-[9px]
                font-bold
                uppercase
                tracking-[0.08em]
                text-slate-600
              "
            >
              Reason code
              <span
                className="
                  ml-1
                  font-normal
                  normal-case
                  tracking-normal
                  text-slate-700
                "
              >
                optional
              </span>
            </label>

            <input
              id="decision-reason-code"
              value={
                reasonCode
              }
              onChange={(
                event,
              ) => {
                setReasonCode(
                  event.target.value,
                );
              }}
              maxLength={
                100
              }
              placeholder="Example: identity_verified"
              className="
                h-11
                w-full
                rounded-[13px]
                border
                border-white/[0.07]
                bg-[#0a111c]
                px-3
                text-xs
                text-slate-300
                outline-none
                transition
                placeholder:text-slate-700
                focus:border-violet-500/40
                focus:ring-4
                focus:ring-violet-500/[0.05]
              "
            />
          </div>


          <div>
            <div
              className="
                mb-2
                flex
                items-center
                justify-between
                gap-3
              "
            >
              <label
                htmlFor="decision-internal-note"
                className="
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-[0.08em]
                  text-slate-600
                "
              >
                Internal decision note
              </label>

              <span
                className="
                  text-[8px]
                  text-slate-700
                "
              >
                Reviewer only
              </span>
            </div>

            <textarea
              id="decision-internal-note"
              value={
                internalNote
              }
              onChange={(
                event,
              ) => {
                setInternalNote(
                  event.target.value,
                );
              }}
              maxLength={
                5000
              }
              placeholder="Document the reasoning or reviewer-only context for this decision."
              className="
                min-h-[96px]
                w-full
                resize-y
                rounded-[13px]
                border
                border-white/[0.07]
                bg-[#0a111c]
                p-3
                text-xs
                leading-5
                text-slate-300
                outline-none
                transition
                placeholder:text-slate-700
                focus:border-violet-500/40
                focus:ring-4
                focus:ring-violet-500/[0.05]
              "
            />
          </div>


          <div>
            <div
              className="
                mb-2
                flex
                items-center
                justify-between
                gap-3
              "
            >
              <label
                htmlFor="decision-user-message"
                className="
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-[0.08em]
                  text-slate-600
                "
              >
                User-facing explanation
              </label>

              <span
                className="
                  text-[8px]
                  text-slate-700
                "
              >
                Visible to applicant
              </span>
            </div>

            <textarea
              id="decision-user-message"
              value={
                userMessage
              }
              onChange={(
                event,
              ) => {
                setUserMessage(
                  event.target.value,
                );
              }}
              maxLength={
                2000
              }
              placeholder={
                selected ===
                "more_info"
                  ? "Explain exactly what the applicant needs to correct or provide."
                  : "Optional explanation visible to the applicant."
              }
              className="
                min-h-[96px]
                w-full
                resize-y
                rounded-[13px]
                border
                border-white/[0.07]
                bg-[#0a111c]
                p-3
                text-xs
                leading-5
                text-slate-300
                outline-none
                transition
                placeholder:text-slate-700
                focus:border-violet-500/40
                focus:ring-4
                focus:ring-violet-500/[0.05]
              "
            />
          </div>


          {moreInfoNeedsMessage && (
            <div
              role="alert"
              className="
                rounded-[13px]
                border
                border-amber-500/15
                bg-amber-500/[0.05]
                p-3
                text-[9px]
                leading-4
                text-amber-300
              "
            >
              Add a user-facing explanation so the applicant knows what must be corrected or resubmitted.
            </div>
          )}


          <button
            type="button"
            disabled={
              !selected ||
              saving ||
              moreInfoNeedsMessage
            }
            onClick={() => {
              setConfirmOpen(
                true,
              );
            }}
            className="
              inline-flex
              min-h-11
              w-full
              items-center
              justify-center
              rounded-[13px]
              bg-violet-500
              px-4
              text-xs
              font-bold
              text-white
              transition
              hover:bg-violet-400
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            {selected
              ? "Review selected decision"
              : "Select a decision"}
          </button>
        </div>
      </section>


      <ConfirmDialog
        open={
          confirmOpen &&
          selected !==
            null
        }
        title={
          confirmTitle
        }
        description={
          confirmDescription
        }
        confirmLabel={
          confirmLabel
        }
        danger={
          selected ===
          "reject"
        }
        loading={
          saving
        }
        onCancel={() => {
          if (!saving) {
            setConfirmOpen(
              false,
            );
          }
        }}
        onConfirm={() => {
          void submit();
        }}
      />
    </>
  );
}


function DecisionButton({
  active,
  icon: Icon,
  label,
  description,
  tone,
  onClick,
}: {
  active: boolean;
  icon: ElementType;
  label: string;
  description: string;
  tone:
    | "success"
    | "warning"
    | "danger";
  onClick: () => void;
}) {
  const activeClass =
    tone ===
    "success"
      ? `
          border-emerald-500/35
          bg-emerald-500/10
          text-emerald-300
        `
      : tone ===
          "warning"
        ? `
            border-amber-500/35
            bg-amber-500/10
            text-amber-300
          `
        : `
            border-red-500/35
            bg-red-500/10
            text-red-300
          `;


  return (
    <button
      type="button"
      aria-pressed={
        active
      }
      onClick={
        onClick
      }
      className={`
        flex
        min-h-[66px]
        items-start
        gap-3
        rounded-[13px]
        border
        p-3
        text-left
        transition
        ${
          active
            ? activeClass
            : `
                border-white/[0.07]
                bg-[#0a111c]
                text-slate-500
                hover:bg-white/[0.04]
                hover:text-slate-300
              `
        }
      `}
    >
      <Icon
        className="
          mt-0.5
          size-4
          shrink-0
        "
        aria-hidden="true"
      />

      <span>
        <span
          className="
            block
            text-[10px]
            font-bold
          "
        >
          {label}
        </span>

        <span
          className="
            mt-1
            block
            text-[8px]
            leading-4
            opacity-70
          "
        >
          {description}
        </span>
      </span>
    </button>
  );
}