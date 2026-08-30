"use client";

import {
  Ban,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
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
  grantDiscordAccess,
  revokeDiscordAccess,
} from "@/lib/admin-api";


export function AccessManagementPanel({
  requestId,
  approved,
  onChanged,
}: {
  requestId: string;
  approved: boolean;
  onChanged: () => void;
}) {
  const [
    confirmRevoke,
    setConfirmRevoke,
  ] =
    useState(false);

  const [
    action,
    setAction,
  ] =
    useState<
      "grant" |
      "revoke" |
      null
    >(null);

  const toast =
    useToast();


  if (!approved) {
    return null;
  }


  async function grant(): Promise<void> {
    if (action !== null) {
      return;
    }

    setAction(
      "grant",
    );

    try {
      await grantDiscordAccess(
        requestId,
      );

      toast.success(
        "Controlled Discord access created.",
      );

      onChanged();
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Unable to grant Discord access.",
      );
    } finally {
      setAction(null);
    }
  }


  async function revoke(): Promise<void> {
    if (action !== null) {
      return;
    }

    setAction(
      "revoke",
    );

    try {
      await revokeDiscordAccess(
        requestId,
      );

      toast.success(
        "Discord access grant revoked.",
      );

      setConfirmRevoke(
        false,
      );

      onChanged();
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Unable to revoke Discord access.",
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
          border-emerald-500/15
          bg-emerald-500/[0.035]
        "
      >
        <div
          className="
            border-b
            border-emerald-500/10
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
              text-emerald-300
            "
          >
            <CheckCircle2
              className="size-4"
              aria-hidden="true"
            />

            Approved access
          </div>

          <p
            className="
              mt-1
              text-[9px]
              leading-4
              text-slate-600
            "
          >
            The identity verification is approved. Controlled Discord entry may now be issued for this request.
          </p>
        </div>


        <div
          className="
            space-y-4
            p-5
          "
        >
          <div
            className="
              flex
              items-start
              gap-2
              rounded-[13px]
              border
              border-emerald-500/10
              bg-emerald-500/[0.035]
              p-3
              text-[9px]
              leading-4
              text-emerald-200/70
            "
          >
            <ShieldCheck
              className="
                mt-0.5
                size-3.5
                shrink-0
              "
              aria-hidden="true"
            />

            Access issuance is separate from approval and should remain short-lived or otherwise controlled by the backend.
          </div>


          <button
            type="button"
            disabled={
              action !== null
            }
            onClick={() => {
              void grant();
            }}
            className="
              inline-flex
              min-h-10
              w-full
              items-center
              justify-center
              gap-2
              rounded-[12px]
              bg-emerald-500
              px-3
              text-[10px]
              font-bold
              text-white
              transition
              hover:bg-emerald-400
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            {action ===
            "grant" ? (
              <LoaderCircle
                className="
                  size-3.5
                  animate-spin
                "
                aria-hidden="true"
              />
            ) : (
              <KeyRound
                className="size-3.5"
                aria-hidden="true"
              />
            )}

            {action ===
            "grant"
              ? "Creating access"
              : "Create controlled access"}
          </button>


          <button
            type="button"
            disabled={
              action !== null
            }
            onClick={() => {
              setConfirmRevoke(
                true,
              );
            }}
            className="
              inline-flex
              min-h-10
              w-full
              items-center
              justify-center
              gap-2
              rounded-[12px]
              border
              border-red-500/15
              bg-red-500/[0.05]
              px-3
              text-[10px]
              font-bold
              text-red-300
              transition
              hover:bg-red-500/[0.1]
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            <Ban
              className="size-3.5"
              aria-hidden="true"
            />

            Revoke unused access
          </button>
        </div>
      </section>


      <ConfirmDialog
        open={
          confirmRevoke
        }
        title="Revoke Discord access?"
        description="Any unused controlled access grant for this verification request will be invalidated. This does not erase the historical approval record."
        confirmLabel="Revoke access"
        danger
        loading={
          action ===
          "revoke"
        }
        onCancel={() => {
          if (
            action === null
          ) {
            setConfirmRevoke(
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