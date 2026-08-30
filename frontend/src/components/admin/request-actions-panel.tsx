"use client";

import type {
  ElementType,
  ReactNode,
} from "react";

import {
  Ban,
  CalendarPlus,
  LoaderCircle,
  Settings2,
  UserRoundCog,
} from "lucide-react";

import {
  useState,
} from "react";

import {
  ReviewerPicker,
} from "@/components/admin/reviewer-picker";

import {
  ConfirmDialog,
} from "@/components/ui/confirm-dialog";

import {
  useToast,
} from "@/components/ui/toast-provider";

import {
  assignVerificationReviewer,
  extendVerificationExpiration,
  revokeVerificationRequest,
} from "@/lib/admin-api";


type RunningAction =
  | "extend"
  | "assign"
  | "revoke"
  | null;


export function RequestActionsPanel({
  requestId,
  onChanged,
}: {
  requestId: string;
  onChanged: () => void;
}) {
  const toast =
    useToast();

  const [
    expiresAt,
    setExpiresAt,
  ] =
    useState("");

  const [
    reviewerId,
    setReviewerId,
  ] =
    useState("");

  const [
    revokeReason,
    setRevokeReason,
  ] =
    useState("");

  const [
    action,
    setAction,
  ] =
    useState<RunningAction>(
      null,
    );

  const [
    revokeDialogOpen,
    setRevokeDialogOpen,
  ] =
    useState(false);


  async function extend(): Promise<void> {
    if (
      !expiresAt ||
      action !== null
    ) {
      return;
    }

    const selectedDate =
      new Date(expiresAt);

    if (
      Number.isNaN(
        selectedDate.getTime(),
      )
    ) {
      toast.error(
        "Choose a valid expiration date and time.",
      );

      return;
    }

    setAction("extend");

    try {
      await extendVerificationExpiration(
        requestId,
        selectedDate.toISOString(),
      );

      setExpiresAt("");

      toast.success(
        "Verification expiration extended.",
      );

      onChanged();
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Unable to extend verification expiration.",
      );
    } finally {
      setAction(null);
    }
  }


  async function assign(): Promise<void> {
    if (
      !reviewerId ||
      action !== null
    ) {
      return;
    }

    setAction("assign");

    try {
      await assignVerificationReviewer(
        requestId,
        {
          reviewer_admin_id:
            reviewerId,
        },
      );

      setReviewerId("");

      toast.success(
        "Reviewer assigned successfully.",
      );

      onChanged();
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Unable to assign reviewer.",
      );
    } finally {
      setAction(null);
    }
  }


  async function revoke(): Promise<void> {
    if (action !== null) {
      return;
    }

    setAction("revoke");

    try {
      await revokeVerificationRequest(
        requestId,
        revokeReason.trim() ||
          undefined,
      );

      setRevokeReason("");

      setRevokeDialogOpen(
        false,
      );

      toast.success(
        "Verification request revoked.",
      );

      onChanged();
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Unable to revoke verification request.",
      );
    } finally {
      setAction(null);
    }
  }


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
              items-center
              gap-2
              text-xs
              font-bold
              text-slate-200
            "
          >
            <Settings2
              className="
                size-4
                text-violet-400
              "
              aria-hidden="true"
            />

            Request controls
          </div>

          <p
            className="
              mt-1
              text-[9px]
              leading-4
              text-slate-600
            "
          >
            Administrative lifecycle and reviewer assignment actions.
          </p>
        </div>


        <div
          className="
            space-y-5
            p-5
          "
        >
          <ActionBlock
            icon={
              CalendarPlus
            }
            title="Extend expiration"
            description="Set a later expiry for this verification request."
          >
            <div
              className="
                flex
                flex-col
                gap-2
                sm:flex-row
              "
            >
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(event) => {
                  setExpiresAt(
                    event.target.value,
                  );
                }}
                disabled={
                  action !== null
                }
                aria-label="New expiration date and time"
                className={inputClass}
              />

              <ActionButton
                disabled={
                  !expiresAt ||
                  action !== null
                }
                loading={
                  action ===
                  "extend"
                }
                onClick={() => {
                  void extend();
                }}
              >
                Extend
              </ActionButton>
            </div>
          </ActionBlock>


          <div
            className="
              border-t
              border-white/[0.055]
              pt-5
            "
          >
            <ActionBlock
              icon={
                UserRoundCog
              }
              title="Assign reviewer"
              description="Assign this request to an active reviewer."
            >
              <div
                className="
                  flex
                  flex-col
                  gap-2
                  sm:flex-row
                "
              >
                <ReviewerPicker
                  value={
                    reviewerId
                  }
                  onChange={
                    setReviewerId
                  }
                />

                <ActionButton
                  disabled={
                    !reviewerId ||
                    action !== null
                  }
                  loading={
                    action ===
                    "assign"
                  }
                  onClick={() => {
                    void assign();
                  }}
                >
                  Assign
                </ActionButton>
              </div>
            </ActionBlock>
          </div>


          <div
            className="
              border-t
              border-red-500/10
              pt-5
            "
          >
            <div
              className="
                flex
                items-center
                gap-2
                text-[10px]
                font-bold
                text-red-300
              "
            >
              <Ban
                className="size-3.5"
                aria-hidden="true"
              />

              Revoke request
            </div>

            <p
              className="
                mt-2
                text-[9px]
                leading-4
                text-slate-600
              "
            >
              Revocation is a hard stop for this verification request. The applicant must not receive access through the revoked request.
            </p>

            <label
              htmlFor="revoke-request-reason"
              className="
                mt-3
                block
                text-[8px]
                font-bold
                uppercase
                tracking-[0.09em]
                text-slate-700
              "
            >
              Revocation reason
              <span
                className="
                  ml-1
                  font-normal
                  normal-case
                  tracking-normal
                "
              >
                optional
              </span>
            </label>

            <textarea
              id="revoke-request-reason"
              value={
                revokeReason
              }
              onChange={(event) => {
                setRevokeReason(
                  event.target.value,
                );
              }}
              disabled={
                action !== null
              }
              maxLength={1000}
              placeholder="Document why this request is being revoked."
              className="
                mt-2
                min-h-[76px]
                w-full
                resize-y
                rounded-[13px]
                border
                border-red-500/10
                bg-red-500/[0.025]
                p-3
                text-[10px]
                leading-5
                text-slate-300
                outline-none
                transition
                placeholder:text-slate-700
                focus:border-red-500/30
                focus:ring-4
                focus:ring-red-500/[0.04]
                disabled:opacity-50
              "
            />

            <button
              type="button"
              disabled={
                action !== null
              }
              onClick={() => {
                setRevokeDialogOpen(
                  true,
                );
              }}
              className="
                mt-3
                inline-flex
                min-h-10
                w-full
                items-center
                justify-center
                gap-2
                rounded-[12px]
                border
                border-red-500/20
                bg-red-500/[0.08]
                px-3
                text-[10px]
                font-bold
                text-red-300
                transition
                hover:bg-red-500/[0.13]
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              <Ban
                className="size-3.5"
                aria-hidden="true"
              />

              Revoke verification request
            </button>
          </div>
        </div>
      </section>


      <ConfirmDialog
        open={
          revokeDialogOpen
        }
        title="Revoke this verification request?"
        description="The applicant will no longer be able to use this request. Discord server access must not be released from the revoked request, and any unused controlled access should be invalidated."
        confirmLabel="Revoke request"
        danger
        loading={
          action ===
          "revoke"
        }
        onCancel={() => {
          if (
            action === null
          ) {
            setRevokeDialogOpen(
              false,
            );
          }
        }}
        onConfirm={() => {
          void revoke();
        }}
      />
    </>
  );
}


const inputClass = `
  h-10
  min-w-0
  flex-1
  rounded-[12px]
  border
  border-white/[0.07]
  bg-[#0a111c]
  px-3
  text-[10px]
  text-slate-300
  outline-none
  transition
  focus:border-violet-500/40
  focus:ring-4
  focus:ring-violet-500/[0.04]
  disabled:cursor-not-allowed
  disabled:opacity-50
`;


function ActionBlock({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: ElementType;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div
        className="
          flex
          items-center
          gap-2
          text-[10px]
          font-bold
          text-slate-400
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

      <p
        className="
          mt-1.5
          text-[9px]
          leading-4
          text-slate-700
        "
      >
        {description}
      </p>

      <div className="mt-3">
        {children}
      </div>
    </div>
  );
}


function ActionButton({
  disabled,
  loading,
  onClick,
  children,
}: {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="
        inline-flex
        min-h-10
        shrink-0
        items-center
        justify-center
        gap-2
        rounded-[12px]
        bg-violet-500
        px-4
        text-[10px]
        font-bold
        text-white
        transition
        hover:bg-violet-400
        disabled:cursor-not-allowed
        disabled:opacity-40
      "
    >
      {loading && (
        <LoaderCircle
          className="
            size-3
            animate-spin
          "
          aria-hidden="true"
        />
      )}

      {children}
    </button>
  );
}