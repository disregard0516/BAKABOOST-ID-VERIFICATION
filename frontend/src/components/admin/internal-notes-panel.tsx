"use client";

import {
  LoaderCircle,
  LockKeyhole,
  MessageSquarePlus,
  RefreshCw,
  Send,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  createAdminNote,
  getAdminNotes,
} from "@/lib/admin-api";

import {
  formatDateTime,
} from "@/lib/date";

import type {
  AdminNoteView,
} from "@/types/admin-review";


export function InternalNotesPanel({
  requestId,
}: {
  requestId: string;
}) {
  const [
    notes,
    setNotes,
  ] =
    useState<AdminNoteView[]>([]);

  const [
    draft,
    setDraft,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(null);


  const refreshNotes =
    useCallback(
      async (
        background = true,
      ): Promise<void> => {
        if (background) {
          setRefreshing(true);
        }

        try {
          const result =
            await getAdminNotes(
              requestId,
            );

          setNotes(
            result.items,
          );

          setError(null);
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load internal notes.",
          );
        } finally {
          if (background) {
            setRefreshing(false);
          }
        }
      },
      [requestId],
    );


  useEffect(() => {
    let active = true;

    async function load(): Promise<void> {
      try {
        const result =
          await getAdminNotes(
            requestId,
          );

        if (!active) {
          return;
        }

        setNotes(
          result.items,
        );

        setError(null);
      } catch (cause) {
        if (!active) {
          return;
        }

        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to load internal notes.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [requestId]);


  async function save(): Promise<void> {
    const note =
      draft.trim();

    if (
      !note ||
      saving
    ) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await createAdminNote(
        requestId,
        note,
      );

      setDraft("");

      await refreshNotes(
        false,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to create internal note.",
      );
    } finally {
      setSaving(false);
    }
  }


  return (
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
          flex
          items-center
          justify-between
          gap-4
          border-b
          border-white/[0.06]
          px-5
          py-4
        "
      >
        <div>
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
            <MessageSquarePlus
              className="
                size-4
                text-violet-400
              "
              aria-hidden="true"
            />

            Internal notes
          </div>

          <p
            className="
              mt-1
              flex
              items-center
              gap-1.5
              text-[9px]
              text-slate-600
            "
          >
            <LockKeyhole
              className="size-3"
              aria-hidden="true"
            />

            Reviewer-only. Never shown to the applicant.
          </p>
        </div>

        <button
          type="button"
          disabled={
            loading ||
            refreshing
          }
          onClick={() => {
            void refreshNotes();
          }}
          aria-label="Refresh internal notes"
          className="
            flex
            size-9
            items-center
            justify-center
            rounded-xl
            border
            border-white/[0.07]
            bg-white/[0.025]
            text-slate-600
            transition
            hover:bg-white/[0.06]
            hover:text-white
            disabled:opacity-40
          "
        >
          <RefreshCw
            className={`
              size-3.5
              ${
                refreshing
                  ? "animate-spin"
                  : ""
              }
            `}
            aria-hidden="true"
          />
        </button>
      </div>


      <div className="p-5">
        <label
          htmlFor="internal-note-draft"
          className="
            mb-2
            block
            text-[8px]
            font-bold
            uppercase
            tracking-[0.1em]
            text-slate-700
          "
        >
          Add reviewer context
        </label>

        <textarea
          id="internal-note-draft"
          value={draft}
          onChange={(event) => {
            setDraft(
              event.target.value,
            );
          }}
          maxLength={5000}
          placeholder="Add reviewer-only context, observations, or follow-up notes..."
          className="
            min-h-[110px]
            w-full
            resize-y
            rounded-[14px]
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

        <div
          className="
            mt-3
            flex
            items-center
            justify-between
            gap-3
          "
        >
          <span
            className="
              text-[9px]
              text-slate-700
            "
          >
            {draft.length}/5000
          </span>

          <button
            type="button"
            disabled={
              saving ||
              !draft.trim()
            }
            onClick={() => {
              void save();
            }}
            className="
              inline-flex
              min-h-9
              items-center
              gap-2
              rounded-xl
              bg-violet-500
              px-3.5
              text-[10px]
              font-bold
              text-white
              transition
              hover:bg-violet-400
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            {saving ? (
              <LoaderCircle
                className="
                  size-3.5
                  animate-spin
                "
                aria-hidden="true"
              />
            ) : (
              <Send
                className="size-3"
                aria-hidden="true"
              />
            )}

            {saving
              ? "Adding"
              : "Add note"}
          </button>
        </div>


        {error && (
          <p
            role="alert"
            className="
              mt-3
              rounded-[12px]
              border
              border-red-500/15
              bg-red-500/[0.05]
              px-3
              py-2.5
              text-[9px]
              leading-4
              text-red-300
            "
          >
            {error}
          </p>
        )}


        <div
          className="
            mt-6
            border-t
            border-white/[0.06]
            pt-5
          "
        >
          <div
            className="
              mb-3
              text-[8px]
              font-bold
              uppercase
              tracking-[0.1em]
              text-slate-700
            "
          >
            Note history
          </div>

          {loading ? (
            <div
              className="
                flex
                items-center
                gap-2
                text-[9px]
                text-slate-600
              "
            >
              <LoaderCircle
                className="
                  size-3.5
                  animate-spin
                "
                aria-hidden="true"
              />

              Loading notes
            </div>
          ) : notes.length === 0 ? (
            <div
              className="
                rounded-[14px]
                border
                border-dashed
                border-white/[0.06]
                p-4
                text-[10px]
                text-slate-700
              "
            >
              No internal notes have been added.
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map(
                (note) => (
                  <article
                    key={note.id}
                    className="
                      rounded-[14px]
                      border
                      border-white/[0.055]
                      bg-[#0b131e]
                      p-4
                    "
                  >
                    <p
                      className="
                        whitespace-pre-wrap
                        break-words
                        text-[11px]
                        leading-5
                        text-slate-400
                      "
                    >
                      {note.note}
                    </p>

                    <div
                      className="
                        mt-3
                        border-t
                        border-white/[0.04]
                        pt-2.5
                        font-mono
                        text-[8px]
                        text-slate-700
                      "
                    >
                      {formatDateTime(
                        note.created_at,
                      )}
                    </div>
                  </article>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}