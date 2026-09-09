"use client";

import {
  Activity,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getAdminAuditActivity,
} from "@/lib/admin-api";

import type {
  AdminAuditActivityQuery,
  AdminAuditActivityResponse,
  AdminAuditEvent,
} from "@/types/admin-audit";

import {
  AdminShell,
} from "@/components/admin/admin-shell";


const PAGE_SIZE = 25;


interface AuditFilters {
  action: string;
  outcome: string;
  actorType: string;
  actorId: string;
  verificationRequestId: string;
  requestId: string;
}


const EMPTY_FILTERS: AuditFilters = {
  action: "",
  outcome: "",
  actorType: "",
  actorId: "",
  verificationRequestId: "",
  requestId: "",
};


function formatDateTime(
  value: string,
): string {
  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return value;
  }

  return parsed.toLocaleString(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "medium",
    },
  );
}


function humanizeAction(
  value: string,
): string {
  return value
    .replaceAll("_", " ")
    .replaceAll(".", " ")
    .replaceAll(":", " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    );
}


function outcomeClasses(
  outcome: string,
): string {
  const normalized =
    outcome.toLowerCase();

  if (normalized === "success") {
    return [
      "border-emerald-400/15",
      "bg-emerald-400/[0.08]",
      "text-emerald-300",
    ].join(" ");
  }

  if (
    normalized === "denied"
    || normalized === "failure"
    || normalized === "failed"
    || normalized === "error"
  ) {
    return [
      "border-red-400/15",
      "bg-red-400/[0.08]",
      "text-red-300",
    ].join(" ");
  }

  return [
    "border-amber-400/15",
    "bg-amber-400/[0.08]",
    "text-amber-200",
  ].join(" ");
}


function shortIdentifier(
  value: string | null,
): string {
  if (!value) {
    return "—";
  }

  if (value.length <= 18) {
    return value;
  }

  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}


function metadataPreview(
  metadata: Record<string, unknown>,
): string {
  const keys =
    Object.keys(metadata);

  if (keys.length === 0) {
    return "No additional metadata";
  }

  const preview =
    keys
      .slice(0, 3)
      .map(
        (key) => {
          const raw =
            metadata[key];

          if (
            typeof raw === "string"
            || typeof raw === "number"
            || typeof raw === "boolean"
          ) {
            return `${key}: ${String(raw)}`;
          }

          return key;
        },
      )
      .join(" · ");

  if (keys.length <= 3) {
    return preview;
  }

  return `${preview} · +${keys.length - 3} more`;
}


function AuditRow({
  event,
}: {
  event: AdminAuditEvent;
}) {
  return (
    <tr
      className="
        border-b
        border-white/[0.055]
        transition-colors
        last:border-b-0
        hover:bg-white/[0.025]
      "
    >
      <td
        className="
          whitespace-nowrap
          px-5
          py-4
          align-top
        "
      >
        <div
          className="
            text-[13px]
            font-medium
            text-white/85
          "
        >
          {formatDateTime(
            event.timestamp,
          )}
        </div>

        {event.request_id ? (
          <div
            className="
              mt-1
              font-mono
              text-[10px]
              text-white/30
            "
            title={event.request_id}
          >
            req{" "}
            {shortIdentifier(
              event.request_id,
            )}
          </div>
        ) : null}
      </td>

      <td
        className="
          min-w-[220px]
          px-5
          py-4
          align-top
        "
      >
        <div
          className="
            text-[13px]
            font-semibold
            text-white/90
          "
        >
          {humanizeAction(
            event.action,
          )}
        </div>

        <div
          className="
            mt-1.5
            max-w-[360px]
            truncate
            text-[11px]
            text-white/35
          "
          title={metadataPreview(
            event.metadata,
          )}
        >
          {metadataPreview(
            event.metadata,
          )}
        </div>
      </td>

      <td
        className="
          px-5
          py-4
          align-top
        "
      >
        <span
          className={`
            inline-flex
            rounded-full
            border
            px-2.5
            py-1
            text-[10px]
            font-semibold
            uppercase
            tracking-[0.12em]
            ${outcomeClasses(
              event.outcome,
            )}
          `}
        >
          {event.outcome}
        </span>
      </td>

      <td
        className="
          px-5
          py-4
          align-top
        "
      >
        <div
          className="
            text-[12px]
            font-medium
            capitalize
            text-white/70
          "
        >
          {event.actor_type}
        </div>

        <div
          className="
            mt-1
            font-mono
            text-[10px]
            text-white/30
          "
          title={
            event.actor_id ?? undefined
          }
        >
          {shortIdentifier(
            event.actor_id,
          )}
        </div>
      </td>

      <td
        className="
          px-5
          py-4
          align-top
        "
      >
        <div
          className="
            font-mono
            text-[11px]
            text-white/45
          "
          title={
            event.verification_request_id
              ?? undefined
          }
        >
          {shortIdentifier(
            event.verification_request_id,
          )}
        </div>
      </td>
    </tr>
  );
}


export function AdminAuditActivity() {
  const [
    data,
    setData,
  ] = useState<
    AdminAuditActivityResponse | null
  >(null);

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    filters,
    setFilters,
  ] = useState<AuditFilters>(
    EMPTY_FILTERS,
  );

  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState<AuditFilters>(
    EMPTY_FILTERS,
  );

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


  const loadAudit =
    useCallback(
      async (
        targetPage: number,
        activeFilters: AuditFilters,
      ): Promise<void> => {
        setLoading(true);
        setError(null);

        const query:
          AdminAuditActivityQuery = {
            page: targetPage,
            page_size: PAGE_SIZE,

            action:
              activeFilters.action
                || undefined,

            outcome:
              activeFilters.outcome
                || undefined,

            actor_type:
              activeFilters.actorType
                || undefined,

            actor_id:
              activeFilters.actorId
                || undefined,

            verification_request_id:
              activeFilters
                .verificationRequestId
                || undefined,

            request_id:
              activeFilters.requestId
                || undefined,
          };

        try {
          const response =
            await getAdminAuditActivity(
              query,
            );

          setData(
            response,
          );
        } catch (caught) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load audit activity.",
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
          void loadAudit(
            page,
            appliedFilters,
          );
        },
        0,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [
    appliedFilters,
    loadAudit,
    page,
  ]);


  function updateFilter(
    key: keyof AuditFilters,
    value: string,
  ): void {
    setFilters(
      (current) => ({
        ...current,
        [key]: value,
      }),
    );
  }


  function applyFilters(): void {
    setPage(1);

    setAppliedFilters({
      action:
        filters.action.trim(),
      outcome:
        filters.outcome.trim(),
      actorType:
        filters.actorType.trim(),
      actorId:
        filters.actorId.trim(),
      verificationRequestId:
        filters
          .verificationRequestId
          .trim(),
      requestId:
        filters.requestId.trim(),
    });
  }


  function clearFilters(): void {
    setFilters(
      EMPTY_FILTERS,
    );

    setAppliedFilters(
      EMPTY_FILTERS,
    );

    setPage(1);
  }


  const activeFilterCount =
    Object.values(
      appliedFilters,
    ).filter(Boolean).length;


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
            max-w-[1500px]
          "
        >
          <section
            className="
              mb-7
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
                <ShieldCheck
                  size={13}
                />
                Security log
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
                Audit Activity
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
                Review security-sensitive
                activity across verification,
                administration and access
                workflows.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                void loadAudit(
                  page,
                  appliedFilters,
                );
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
          </section>


          <section
            className="
              mb-5
              rounded-[22px]
              border
              border-white/[0.065]
              bg-white/[0.025]
              p-4
              shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]
              sm:p-5
            "
          >
            <div
              className="
                mb-4
                flex
                items-center
                justify-between
                gap-3
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-2
                  text-xs
                  font-semibold
                  text-white/70
                "
              >
                <Filter
                  size={14}
                />
                Filters

                {activeFilterCount > 0 ? (
                  <span
                    className="
                      rounded-full
                      bg-violet-400/10
                      px-2
                      py-0.5
                      text-[10px]
                      text-violet-200
                    "
                  >
                    {activeFilterCount}
                  </span>
                ) : null}
              </div>

              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="
                    text-[11px]
                    font-medium
                    text-white/40
                    transition
                    hover:text-white/70
                  "
                >
                  Clear all
                </button>
              ) : null}
            </div>

            <div
              className="
                grid
                gap-3
                md:grid-cols-2
                xl:grid-cols-3
              "
            >
              <label>
                <span
                  className="
                    mb-1.5
                    block
                    text-[10px]
                    font-medium
                    uppercase
                    tracking-[0.12em]
                    text-white/30
                  "
                >
                  Action
                </span>

                <input
                  value={filters.action}
                  onChange={(event) => {
                    updateFilter(
                      "action",
                      event.target.value,
                    );
                  }}
                  placeholder="Exact audit action"
                  className="
                    h-10
                    w-full
                    rounded-xl
                    border
                    border-white/[0.07]
                    bg-black/20
                    px-3
                    text-xs
                    text-white/80
                    outline-none
                    transition
                    placeholder:text-white/20
                    focus:border-violet-400/25
                  "
                />
              </label>

              <label>
                <span
                  className="
                    mb-1.5
                    block
                    text-[10px]
                    font-medium
                    uppercase
                    tracking-[0.12em]
                    text-white/30
                  "
                >
                  Outcome
                </span>

                <select
                  value={filters.outcome}
                  onChange={(event) => {
                    updateFilter(
                      "outcome",
                      event.target.value,
                    );
                  }}
                  className="
                    h-10
                    w-full
                    rounded-xl
                    border
                    border-white/[0.07]
                    bg-black/20
                    px-3
                    text-xs
                    text-white/80
                    outline-none
                    transition
                    focus:border-violet-400/25
                  "
                >
                  <option value="">
                    All outcomes
                  </option>
                  <option value="success">
                    Success
                  </option>
                  <option value="denied">
                    Denied
                  </option>
                  <option value="failure">
                    Failure
                  </option>
                </select>
              </label>

              <label>
                <span
                  className="
                    mb-1.5
                    block
                    text-[10px]
                    font-medium
                    uppercase
                    tracking-[0.12em]
                    text-white/30
                  "
                >
                  Actor type
                </span>

                <input
                  value={filters.actorType}
                  onChange={(event) => {
                    updateFilter(
                      "actorType",
                      event.target.value,
                    );
                  }}
                  placeholder="admin / system"
                  className="
                    h-10
                    w-full
                    rounded-xl
                    border
                    border-white/[0.07]
                    bg-black/20
                    px-3
                    text-xs
                    text-white/80
                    outline-none
                    transition
                    placeholder:text-white/20
                    focus:border-violet-400/25
                  "
                />
              </label>

              <label>
                <span
                  className="
                    mb-1.5
                    block
                    text-[10px]
                    font-medium
                    uppercase
                    tracking-[0.12em]
                    text-white/30
                  "
                >
                  Actor ID
                </span>

                <input
                  value={filters.actorId}
                  onChange={(event) => {
                    updateFilter(
                      "actorId",
                      event.target.value,
                    );
                  }}
                  placeholder="Exact actor ID"
                  className="
                    h-10
                    w-full
                    rounded-xl
                    border
                    border-white/[0.07]
                    bg-black/20
                    px-3
                    text-xs
                    text-white/80
                    outline-none
                    transition
                    placeholder:text-white/20
                    focus:border-violet-400/25
                  "
                />
              </label>

              <label>
                <span
                  className="
                    mb-1.5
                    block
                    text-[10px]
                    font-medium
                    uppercase
                    tracking-[0.12em]
                    text-white/30
                  "
                >
                  Verification request
                </span>

                <input
                  value={
                    filters
                      .verificationRequestId
                  }
                  onChange={(event) => {
                    updateFilter(
                      "verificationRequestId",
                      event.target.value,
                    );
                  }}
                  placeholder="Request UUID"
                  className="
                    h-10
                    w-full
                    rounded-xl
                    border
                    border-white/[0.07]
                    bg-black/20
                    px-3
                    text-xs
                    text-white/80
                    outline-none
                    transition
                    placeholder:text-white/20
                    focus:border-violet-400/25
                  "
                />
              </label>

              <label>
                <span
                  className="
                    mb-1.5
                    block
                    text-[10px]
                    font-medium
                    uppercase
                    tracking-[0.12em]
                    text-white/30
                  "
                >
                  Correlation ID
                </span>

                <div
                  className="relative"
                >
                  <Search
                    size={13}
                    className="
                      absolute
                      left-3
                      top-1/2
                      -translate-y-1/2
                      text-white/25
                    "
                  />

                  <input
                    value={
                      filters.requestId
                    }
                    onChange={(event) => {
                      updateFilter(
                        "requestId",
                        event.target.value,
                      );
                    }}
                    placeholder="HTTP request ID"
                    className="
                      h-10
                      w-full
                      rounded-xl
                      border
                      border-white/[0.07]
                      bg-black/20
                      pl-9
                      pr-3
                      text-xs
                      text-white/80
                      outline-none
                      transition
                      placeholder:text-white/20
                      focus:border-violet-400/25
                    "
                  />
                </div>
              </label>
            </div>

            <div
              className="
                mt-4
                flex
                justify-end
              "
            >
              <button
                type="button"
                onClick={applyFilters}
                className="
                  inline-flex
                  h-10
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-white
                  px-5
                  text-xs
                  font-semibold
                  text-black
                  transition
                  hover:bg-white/90
                "
              >
                <Search
                  size={14}
                />
                Apply filters
              </button>
            </div>
          </section>


          <section
            className="
              overflow-hidden
              rounded-[22px]
              border
              border-white/[0.065]
              bg-white/[0.02]
              shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]
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
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-violet-400/10
                    bg-violet-400/[0.065]
                    text-violet-200
                  "
                >
                  <Activity
                    size={16}
                  />
                </div>

                <div>
                  <div
                    className="
                      text-sm
                      font-semibold
                      text-white/85
                    "
                  >
                    Security events
                  </div>

                  <div
                    className="
                      mt-0.5
                      text-[11px]
                      text-white/30
                    "
                  >
                    {data
                      ? `${data.total.toLocaleString()} recorded events`
                      : "Loading event count"}
                  </div>
                </div>
              </div>

              {data ? (
                <div
                  className="
                    text-[11px]
                    text-white/30
                  "
                >
                  Page {data.page}
                  {data.total_pages > 0
                    ? ` of ${data.total_pages}`
                    : ""}
                </div>
              ) : null}
            </div>


            {error ? (
              <div
                className="
                  flex
                  items-start
                  gap-3
                  border-b
                  border-red-400/10
                  bg-red-400/[0.035]
                  px-5
                  py-4
                  text-sm
                  text-red-200/80
                "
              >
                <CircleAlert
                  size={16}
                  className="
                    mt-0.5
                    shrink-0
                  "
                />

                <span>
                  {error}
                </span>
              </div>
            ) : null}


            <div
              className="
                overflow-x-auto
              "
            >
              <table
                className="
                  w-full
                  min-w-[900px]
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
                      "Timestamp",
                      "Activity",
                      "Outcome",
                      "Actor",
                      "Verification Request",
                    ].map(
                      (heading) => (
                        <th
                          key={heading}
                          className="
                            px-5
                            py-3
                            text-left
                            text-[10px]
                            font-semibold
                            uppercase
                            tracking-[0.13em]
                            text-white/25
                          "
                        >
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="
                          px-5
                          py-16
                          text-center
                          text-sm
                          text-white/35
                        "
                      >
                        <RefreshCw
                          size={18}
                          className="
                            mx-auto
                            mb-3
                            animate-spin
                            text-violet-300/70
                          "
                        />

                        Loading audit
                        activity…
                      </td>
                    </tr>
                  ) : data
                    && data.items.length > 0 ? (
                    data.items.map(
                      (event) => (
                        <AuditRow
                          key={event.id}
                          event={event}
                        />
                      ),
                    )
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="
                          px-5
                          py-16
                          text-center
                        "
                      >
                        <ShieldCheck
                          size={23}
                          className="
                            mx-auto
                            mb-3
                            text-white/20
                          "
                        />

                        <div
                          className="
                            text-sm
                            font-medium
                            text-white/55
                          "
                        >
                          No audit events
                          found
                        </div>

                        <div
                          className="
                            mt-1
                            text-xs
                            text-white/25
                          "
                        >
                          Try removing some
                          filters.
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>


            <div
              className="
                flex
                flex-col
                gap-3
                border-t
                border-white/[0.06]
                px-5
                py-4
                sm:flex-row
                sm:items-center
                sm:justify-between
              "
            >
              <div
                className="
                  text-[11px]
                  text-white/30
                "
              >
                {data && data.total > 0
                  ? `Showing ${((data.page - 1) * data.page_size) + 1}–${Math.min(data.page * data.page_size, data.total)} of ${data.total}`
                  : "No results"}
              </div>

              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >
                <button
                  type="button"
                  disabled={
                    loading
                    || page <= 1
                  }
                  onClick={() => {
                    setPage(
                      (current) =>
                        Math.max(
                          1,
                          current - 1,
                        ),
                    );
                  }}
                  className="
                    inline-flex
                    h-9
                    items-center
                    gap-1.5
                    rounded-xl
                    border
                    border-white/[0.07]
                    bg-white/[0.035]
                    px-3
                    text-[11px]
                    font-semibold
                    text-white/60
                    transition
                    hover:bg-white/[0.07]
                    disabled:cursor-not-allowed
                    disabled:opacity-30
                  "
                >
                  <ChevronLeft
                    size={13}
                  />
                  Previous
                </button>

                <button
                  type="button"
                  disabled={
                    loading
                    || !data
                    || data.total_pages === 0
                    || page >= data.total_pages
                  }
                  onClick={() => {
                    setPage(
                      (current) =>
                        current + 1,
                    );
                  }}
                  className="
                    inline-flex
                    h-9
                    items-center
                    gap-1.5
                    rounded-xl
                    border
                    border-white/[0.07]
                    bg-white/[0.035]
                    px-3
                    text-[11px]
                    font-semibold
                    text-white/60
                    transition
                    hover:bg-white/[0.07]
                    disabled:cursor-not-allowed
                    disabled:opacity-30
                  "
                >
                  Next
                  <ChevronRight
                    size={13}
                  />
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </AdminShell>
  );
}
