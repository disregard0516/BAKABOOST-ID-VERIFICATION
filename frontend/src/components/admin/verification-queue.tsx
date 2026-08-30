"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  ArrowRight,
  Clock3,
  FileSearch,
  Filter,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

import {
  AdminShell,
} from "@/components/admin/admin-shell";

import {
  AdminStatusBadge,
} from "@/components/admin/status-badge";

import {
  claimAdminCase,
  getAdminQueue,
} from "@/lib/admin-api";

import {
  formatDateTime,
  formatWaitingDuration,
} from "@/lib/date";

import type {
  AdminQueueItem,
} from "@/types/admin";

import type {
  VerificationStatus,
} from "@/types/verification";


const STATUS_FILTERS: {
  status: VerificationStatus;
  label: string;
}[] = [
  {
    status: "queued",
    label: "Queued",
  },
  {
    status: "in_review",
    label: "In Review",
  },
  {
    status: "more_info",
    label: "More Info",
  },
  {
    status: "approved",
    label: "Approved",
  },
  {
    status: "rejected",
    label: "Rejected",
  },
];


export function VerificationQueue() {
  const router =
    useRouter();

  const [
    items,
    setItems,
  ] =
    useState<
      AdminQueueItem[]
    >([]);

  const [
    total,
    setTotal,
  ] =
    useState(0);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    statuses,
    setStatuses,
  ] =
    useState<
      VerificationStatus[]
    >([
      "queued",
    ]);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    claimingId,
    setClaimingId,
  ] =
    useState<string | null>(
      null,
    );


  const loadQueue =
    useCallback(
      async (): Promise<void> => {
        setLoading(
          true,
        );

        setError(
          null,
        );

        try {
          const result =
            await getAdminQueue({
              search:
                search.trim(),

              statuses:
                statuses.length > 0
                  ? statuses
                  : undefined,
            });

          setItems(
            result.items,
          );

          setTotal(
            result.total,
          );
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load verification queue.",
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        search,
        statuses,
      ],
    );


  useEffect(() => {
    const timeout =
      window.setTimeout(
        () => {
          void loadQueue();
        },
        300,
      );

    return () => {
      window.clearTimeout(
        timeout,
      );
    };
  }, [
    loadQueue,
  ]);


  const visibleQueuedCount =
    items.filter(
      (item) =>
        item.status ===
        "queued",
    ).length;


  async function claim(
    requestId: string,
  ): Promise<void> {
    setClaimingId(
      requestId,
    );

    setError(
      null,
    );

    try {
      await claimAdminCase(
        requestId,
      );

      router.push(
        `/admin/verification-requests/${requestId}`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to claim case.",
      );

      setClaimingId(
        null,
      );

      await loadQueue();
    }
  }


  function toggleStatus(
    status: VerificationStatus,
  ): void {
    setStatuses(
      (current) =>
        current.includes(
          status,
        )
          ? current.filter(
              (value) =>
                value !==
                status,
            )
          : [
              ...current,
              status,
            ],
    );
  }


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
        <div
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

              Verification operations
            </div>

            <h1
              className="
                mt-2
                text-[30px]
                font-bold
                tracking-[-0.04em]
                text-white
                sm:text-[36px]
              "
            >
              Verification queue
            </h1>

            <p
              className="
                mt-2
                max-w-[670px]
                text-sm
                leading-6
                text-slate-500
              "
            >
              Review submitted verification cases. Queue age and submission time should guide prioritization before claiming a case.
            </p>
          </div>


          <div
            className="
              flex
              flex-col
              gap-3
              sm:flex-row
              sm:items-stretch
            "
          >
            <div
              className="
                grid
                grid-cols-2
                gap-3
              "
            >
              <StatCard
                label="Queued here"
                value={
                  String(
                    visibleQueuedCount,
                  )
                }
              />

              <StatCard
                label="Results"
                value={
                  String(
                    total,
                  )
                }
              />
            </div>

            <button
              type="button"
              onClick={() => {
                router.push(
                  "/admin/verification-requests/new",
                );
              }}
              className="
                inline-flex
                min-h-12
                items-center
                justify-center
                gap-2
                rounded-[14px]
                bg-violet-500
                px-5
                text-[10px]
                font-bold
                text-white
                shadow-[0_10px_30px_rgba(109,83,235,0.2)]
                transition
                hover:bg-violet-400
              "
            >
              <Plus
                className="size-4"
                aria-hidden="true"
              />

              Create request
            </button>
          </div>
        </div>


        <section
          className="
            rounded-[21px]
            border
            border-white/[0.07]
            bg-white/[0.025]
            p-4
            shadow-[0_20px_60px_rgba(0,0,0,0.16)]
          "
        >
          <div
            className="
              flex
              flex-col
              gap-4
            "
          >
            <div
              className="
                flex
                flex-col
                gap-3
                xl:flex-row
                xl:items-center
                xl:justify-between
              "
            >
              <div
                className="
                  relative
                  flex-1
                  xl:max-w-[560px]
                "
              >
                <Search
                  className="
                    pointer-events-none
                    absolute
                    left-3.5
                    top-1/2
                    size-4
                    -translate-y-1/2
                    text-slate-600
                  "
                  aria-hidden="true"
                />

                <input
                  value={
                    search
                  }
                  onChange={(
                    event,
                  ) => {
                    setSearch(
                      event.target.value,
                    );
                  }}
                  aria-label="Search verification queue"
                  placeholder="Search Discord ID, username, or request ID..."
                  className="
                    h-11
                    w-full
                    rounded-[13px]
                    border
                    border-white/[0.07]
                    bg-[#0a111c]/80
                    pl-10
                    pr-4
                    text-xs
                    text-slate-200
                    outline-none
                    transition
                    placeholder:text-slate-600
                    focus:border-violet-500/40
                    focus:ring-4
                    focus:ring-violet-500/[0.06]
                  "
                />
              </div>


              <button
                type="button"
                aria-label="Refresh queue"
                onClick={() => {
                  void loadQueue();
                }}
                className="
                  inline-flex
                  min-h-11
                  items-center
                  justify-center
                  gap-2
                  rounded-[13px]
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
                <RefreshCw
                  className={`
                    size-3.5
                    ${
                      loading
                        ? "animate-spin"
                        : ""
                    }
                  `}
                  aria-hidden="true"
                />

                Refresh
              </button>
            </div>


            <div
              className="
                flex
                flex-wrap
                items-center
                gap-2
                border-t
                border-white/[0.055]
                pt-4
              "
            >
              <div
                className="
                  mr-1
                  flex
                  items-center
                  gap-1.5
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-[0.08em]
                  text-slate-600
                "
              >
                <Filter
                  className="size-3"
                  aria-hidden="true"
                />

                Status
              </div>


              {STATUS_FILTERS.map(
                (filter) => {
                  const active =
                    statuses.includes(
                      filter.status,
                    );

                  return (
                    <button
                      key={
                        filter.status
                      }
                      type="button"
                      aria-pressed={
                        active
                      }
                      onClick={() => {
                        toggleStatus(
                          filter.status,
                        );
                      }}
                      className={`
                        min-h-9
                        rounded-xl
                        border
                        px-3
                        py-2
                        text-[10px]
                        font-semibold
                        transition
                        ${
                          active
                            ? `
                                border-violet-500/30
                                bg-violet-500/10
                                text-violet-300
                              `
                            : `
                                border-white/[0.06]
                                bg-white/[0.025]
                                text-slate-500
                                hover:bg-white/[0.05]
                                hover:text-slate-300
                              `
                        }
                      `}
                    >
                      {filter.label}
                    </button>
                  );
                },
              )}


              {statuses.length >
                0 && (
                <button
                  type="button"
                  onClick={() => {
                    setStatuses(
                      [],
                    );
                  }}
                  className="
                    min-h-9
                    px-2
                    text-[9px]
                    font-semibold
                    text-slate-600
                    transition
                    hover:text-slate-300
                  "
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </section>


        {error && (
          <div
            role="alert"
            className="
              rounded-[16px]
              border
              border-red-500/20
              bg-red-500/[0.07]
              px-4
              py-3
              text-xs
              leading-5
              text-red-300
            "
          >
            {error}
          </div>
        )}


        <div
          className="
            overflow-hidden
            rounded-[22px]
            border
            border-white/[0.07]
            bg-[#0a111c]/60
            shadow-[0_28px_90px_rgba(0,0,0,0.2)]
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
              bg-white/[0.016]
              px-4
              py-3
              sm:px-5
            "
          >
            <div>
              <div
                className="
                  text-[10px]
                  font-bold
                  text-slate-300
                "
              >
                Review cases
              </div>

              <div
                className="
                  mt-0.5
                  text-[9px]
                  text-slate-600
                "
              >
                Claim queued cases only when ready to begin review.
              </div>
            </div>

            {loading && (
              <LoaderCircle
                className="
                  size-4
                  animate-spin
                  text-violet-400
                "
                aria-label="Refreshing queue"
              />
            )}
          </div>


          <div className="overflow-x-auto">
            <table
              className="
                w-full
                min-w-[1180px]
                border-collapse
              "
            >
              <thead>
                <tr
                  className="
                    border-b
                    border-white/[0.06]
                    bg-white/[0.018]
                  "
                >
                  {[
                    "Discord account",
                    "Status",
                    "Waiting",
                    "Created",
                    "Expires",
                    "Created by",
                    "Reviewer",
                    "Last activity",
                    "",
                  ].map(
                    (
                      heading,
                      index,
                    ) => (
                      <th
                        key={`${heading}-${index}`}
                        scope="col"
                        className="
                          px-4
                          py-3.5
                          text-left
                          text-[9px]
                          font-bold
                          uppercase
                          tracking-[0.11em]
                          text-slate-600
                        "
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>


              <tbody>
                {loading &&
                items.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={
                        9
                      }
                      className="
                        py-24
                        text-center
                      "
                    >
                      <LoaderCircle
                        className="
                          mx-auto
                          size-6
                          animate-spin
                          text-violet-400
                        "
                        aria-hidden="true"
                      />

                      <div
                        className="
                          mt-3
                          text-[10px]
                          text-slate-600
                        "
                      >
                        Loading verification queue
                      </div>
                    </td>
                  </tr>
                ) : items.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={
                        9
                      }
                    >
                      <EmptyQueue
                        filtered={
                          Boolean(
                            search.trim(),
                          ) ||
                          statuses.length >
                            0
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  items.map(
                    (item) => (
                      <QueueRow
                        key={
                          item.request_id
                        }
                        item={
                          item
                        }
                        claiming={
                          claimingId ===
                          item.request_id
                        }
                        onClaim={() => {
                          void claim(
                            item.request_id,
                          );
                        }}
                        onOpen={() => {
                          router.push(
                            `/admin/verification-requests/${item.request_id}`,
                          );
                        }}
                      />
                    ),
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}


function QueueRow({
  item,
  claiming,
  onClaim,
  onOpen,
}: {
  item: AdminQueueItem;
  claiming: boolean;
  onClaim: () => void;
  onOpen: () => void;
}) {
  const isQueued =
    item.status ===
    "queued";


  return (
    <tr
      className={`
        border-b
        border-white/[0.045]
        transition
        last:border-0
        hover:bg-white/[0.025]
        ${
          isQueued
            ? "bg-violet-500/[0.012]"
            : ""
        }
      `}
    >
      <td className="px-4 py-4">
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
              rounded-[11px]
              bg-violet-500/10
              font-mono
              text-[10px]
              font-bold
              text-violet-300
            "
          >
            DC
          </div>

          <div className="min-w-0">
            <div
              className="
                max-w-[180px]
                truncate
                text-xs
                font-semibold
                text-slate-200
              "
              title={
                item.discord_username_snapshot ??
                undefined
              }
            >
              {item.discord_username_snapshot
                ? `@${item.discord_username_snapshot}`
                : "Unknown username"}
            </div>

            <div
              className="
                mt-1
                max-w-[190px]
                truncate
                font-mono
                text-[9px]
                text-slate-600
              "
              title={
                item.assigned_discord_user_id
              }
            >
              {item.assigned_discord_user_id}
            </div>
          </div>
        </div>
      </td>


      <td className="px-4 py-4">
        <AdminStatusBadge
          status={
            item.status
          }
        />
      </td>


      <td
        className="
          px-4
          py-4
        "
      >
        <div
          className={`
            flex
            items-center
            gap-2
            text-xs
            font-semibold
            ${
              isQueued
                ? "text-violet-200"
                : "text-slate-400"
            }
          `}
        >
          <Clock3
            className={`
              size-3.5
              ${
                isQueued
                  ? "text-violet-400"
                  : "text-slate-600"
              }
            `}
            aria-hidden="true"
          />

          {formatWaitingDuration(
            item.queue_entered_at,
          )}
        </div>
      </td>


      <td
        className="
          px-4
          py-4
          text-[10px]
          text-slate-500
        "
      >
        {formatDateTime(
          item.created_at,
        )}
      </td>


      <td
        className="
          px-4
          py-4
          text-[10px]
          text-slate-500
        "
      >
        {formatDateTime(
          item.expires_at,
        )}
      </td>


      <td
        className="
          px-4
          py-4
          text-[11px]
          text-slate-400
        "
      >
        {item.created_by_admin_name ??
          "—"}
      </td>


      <td
        className="
          px-4
          py-4
          text-[11px]
          text-slate-400
        "
      >
        {item.assigned_reviewer_name ??
          "Unassigned"}
      </td>


      <td
        className="
          px-4
          py-4
          text-[10px]
          text-slate-600
        "
      >
        {formatDateTime(
          item.last_activity_at,
        )}
      </td>


      <td
        className="
          px-4
          py-4
          text-right
        "
      >
        {isQueued ? (
          <button
            type="button"
            disabled={
              claiming
            }
            onClick={
              onClaim
            }
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
              shadow-[0_8px_24px_rgba(110,84,235,0.22)]
              transition
              hover:bg-violet-400
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {claiming ? (
              <LoaderCircle
                className="
                  size-3.5
                  animate-spin
                "
                aria-hidden="true"
              />
            ) : (
              <UserRoundCheck
                className="size-3.5"
                aria-hidden="true"
              />
            )}

            {claiming
              ? "Claiming"
              : "Claim"}
          </button>
        ) : (
          <button
            type="button"
            onClick={
              onOpen
            }
            className="
              inline-flex
              min-h-9
              items-center
              gap-2
              rounded-xl
              border
              border-white/[0.07]
              bg-white/[0.03]
              px-3
              text-[10px]
              font-semibold
              text-slate-400
              transition
              hover:bg-white/[0.07]
              hover:text-white
            "
          >
            Open

            <ArrowRight
              className="size-3"
              aria-hidden="true"
            />
          </button>
        )}
      </td>
    </tr>
  );
}


function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="
        min-w-[116px]
        rounded-[17px]
        border
        border-white/[0.07]
        bg-white/[0.025]
        px-4
        py-3
      "
    >
      <div
        className="
          text-[8px]
          font-bold
          uppercase
          tracking-[0.1em]
          text-slate-600
        "
      >
        {label}
      </div>

      <div
        className="
          mt-1
          text-xl
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


function EmptyQueue({
  filtered,
}: {
  filtered: boolean;
}) {
  return (
    <div
      className="
        flex
        flex-col
        items-center
        justify-center
        px-6
        py-24
        text-center
      "
    >
      <div
        className="
          flex
          size-14
          items-center
          justify-center
          rounded-[18px]
          bg-white/[0.04]
          text-slate-600
        "
      >
        <FileSearch
          className="size-6"
          aria-hidden="true"
        />
      </div>

      <div
        className="
          mt-4
          text-sm
          font-bold
          text-slate-300
        "
      >
        {filtered
          ? "No matching cases"
          : "No verification cases"}
      </div>

      <p
        className="
          mt-2
          max-w-[360px]
          text-[11px]
          leading-5
          text-slate-600
        "
      >
        {filtered
          ? "No verification requests match the current search and status filters."
          : "There are currently no verification cases available in this queue."}
      </p>
    </div>
  );
}