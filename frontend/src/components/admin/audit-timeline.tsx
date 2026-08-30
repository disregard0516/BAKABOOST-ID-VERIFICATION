"use client";

import {
  Activity,
  AlertCircle,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getAuditHistory,
} from "@/lib/admin-api";

import {
  formatDateTime,
} from "@/lib/date";

import type {
  AuditEventView,
} from "@/types/admin-review";


export function AuditTimeline({
  requestId,
}: {
  requestId: string;
}) {
  const [
    events,
    setEvents,
  ] =
    useState<AuditEventView[]>([]);

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
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );


  const refresh =
    useCallback(
      async (
        background = true,
      ): Promise<void> => {
        if (background) {
          setRefreshing(
            true,
          );
        }

        try {
          const result =
            await getAuditHistory(
              requestId,
            );

          setEvents(
            result.items,
          );

          setError(
            null,
          );
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load audit history.",
          );
        } finally {
          if (background) {
            setRefreshing(
              false,
            );
          }
        }
      },
      [requestId],
    );


  useEffect(() => {
    let active =
      true;

    async function load(): Promise<void> {
      try {
        const result =
          await getAuditHistory(
            requestId,
          );

        if (!active) {
          return;
        }

        setEvents(
          result.items,
        );

        setError(
          null,
        );
      } catch (cause) {
        if (!active) {
          return;
        }

        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to load audit history.",
        );
      } finally {
        if (active) {
          setLoading(
            false,
          );
        }
      }
    }

    void load();

    return () => {
      active =
        false;
    };
  }, [requestId]);


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
          gap-3
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
            <Activity
              className="
                size-4
                text-violet-400
              "
              aria-hidden="true"
            />

            Audit history
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
            <ShieldCheck
              className="size-3"
              aria-hidden="true"
            />

            Recorded security and workflow activity
          </p>
        </div>


        <button
          type="button"
          disabled={
            loading ||
            refreshing
          }
          onClick={() => {
            void refresh();
          }}
          aria-label="Refresh audit history"
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
        {error && (
          <div
            role="alert"
            className="
              mb-4
              flex
              items-start
              gap-2
              rounded-[12px]
              border
              border-red-500/15
              bg-red-500/[0.05]
              p-3
              text-[9px]
              leading-4
              text-red-300
            "
          >
            <AlertCircle
              className="
                mt-0.5
                size-3.5
                shrink-0
              "
              aria-hidden="true"
            />

            {error}
          </div>
        )}


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
                size-4
                animate-spin
              "
              aria-hidden="true"
            />

            Loading audit history
          </div>
        ) : events.length === 0 ? (
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
            No audit events are available for this request.
          </div>
        ) : (
          <div>
            {events.map(
              (
                event,
                index,
              ) => (
                <article
                  key={
                    event.id
                  }
                  className="
                    relative
                    flex
                    gap-3
                    pb-5
                    last:pb-0
                  "
                >
                  {index <
                    events.length -
                      1 && (
                    <div
                      className="
                        absolute
                        left-[6px]
                        top-4
                        h-[calc(100%-6px)]
                        w-px
                        bg-white/[0.06]
                      "
                    />
                  )}

                  <div
                    className="
                      relative
                      z-10
                      mt-1
                      size-[13px]
                      shrink-0
                      rounded-full
                      border
                      border-violet-400/30
                      bg-[#111827]
                    "
                  >
                    <div
                      className="
                        absolute
                        inset-[3px]
                        rounded-full
                        bg-violet-400
                      "
                    />
                  </div>


                  <div
                    className="
                      min-w-0
                      flex-1
                    "
                  >
                    <div
                      className="
                        text-[10px]
                        font-semibold
                        leading-4
                        text-slate-400
                      "
                    >
                      {formatAuditAction(
                        event.action,
                      )}
                    </div>

                    <div
                      className="
                        mt-1
                        text-[9px]
                        text-slate-700
                      "
                    >
                      {formatDateTime(
                        event.timestamp,
                      )}
                    </div>

                    <div
                      className="
                        mt-1.5
                        break-all
                        font-mono
                        text-[8px]
                        leading-4
                        text-slate-700
                      "
                    >
                      {formatActor(
                        event.actor_type,
                        event.actor_id,
                      )}
                    </div>
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </div>
    </section>
  );
}


function formatAuditAction(
  action: string,
): string {
  return action
    .replaceAll(
      ".",
      " ",
    )
    .replaceAll(
      "_",
      " ",
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}


function formatActor(
  actorType: string,
  actorId: string | null,
): string {
  const readableType =
    actorType
      .replaceAll(
        "_",
        " ",
      )
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase(),
      );

  return actorId
    ? `${readableType} · ${actorId}`
    : readableType;
}