"use client";

import {
  ShieldAlert,
  Trash2,
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
  deleteVerificationEvidence,
} from "@/lib/admin-api";

export function EvidenceDeletionPanel({
  requestId,
  onChanged,
}: {
  requestId: string;
  onChanged: () => void;
}) {
  const [
    confirmOpen,
    setConfirmOpen,
  ] = useState(false);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const toast =
    useToast();

  async function remove() {
    setDeleting(true);

    try {
      const response =
        await deleteVerificationEvidence(
          requestId,
        );

      toast.success(
        `${response.deleted_count} evidence item(s) processed for deletion.`,
      );

      setConfirmOpen(false);

      onChanged();
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Unable to delete evidence.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <section
        className="
          rounded-[20px]
          border
          border-red-500/10
          bg-red-500/[0.025]
        "
      >
        <div
          className="
            border-b
            border-red-500/10
            px-5 py-4
          "
        >
          <div
            className="
              flex
              items-center
              gap-2
              text-xs
              font-bold
              text-red-300
            "
          >
            <ShieldAlert
              className="size-4"
            />

            Evidence retention
          </div>
        </div>

        <div className="p-5">
          <p
            className="
              text-[10px]
              leading-5
              text-slate-600
            "
          >
            Submitted identity evidence
            is retained indefinitely by
            default. Use this protected
            action when manual deletion
            is required.
          </p>

          <button
            type="button"
            onClick={() =>
              setConfirmOpen(
                true,
              )
            }
            className="
              mt-4
              inline-flex h-10
              w-full
              items-center
              justify-center
              gap-2
              rounded-[12px]
              border
              border-red-500/15
              bg-red-500/[0.06]
              text-[10px]
              font-bold
              text-red-300
              transition
              hover:bg-red-500/[0.11]
            "
          >
            <Trash2
              className="size-3.5"
            />

            Delete raw evidence
          </button>
        </div>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete raw identity evidence?"
        description="This action runs the approved evidence-deletion workflow. The audit trail and minimal verification result remain, but raw evidence should no longer be available after physical storage deletion completes."
        confirmLabel="Delete evidence"
        danger
        loading={deleting}
        onCancel={() => {
          if (!deleting) {
            setConfirmOpen(
              false,
            );
          }
        }}
        onConfirm={() => {
          void remove();
        }}
      />
    </>
  );
}