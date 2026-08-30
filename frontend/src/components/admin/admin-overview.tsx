"use client";

import type {
  ElementType,
} from "react";

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  LoaderCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  AdminShell,
} from "@/components/admin/admin-shell";

import {
  getAdminQueue,
} from "@/lib/admin-api";


interface OverviewMetrics {
  queued: number;
  inReview: number;
  approved: number;
  moreInfo: number;
}


const EMPTY_METRICS:
  OverviewMetrics = {
    queued: 0,
    inReview: 0,
    approved: 0,
    moreInfo: 0,
  };


export function AdminOverview() {
  const router =
    useRouter();

  const [
    metrics,
    setMetrics,
  ] =
    useState<OverviewMetrics>(
      EMPTY_METRICS,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );


  const loadMetrics =
    useCallback(
      async (): Promise<void> => {
        setLoading(
          true,
        );

        setError(
          null,
        );

        try {
          const [
            queuedResult,
            reviewResult,
            approvedResult,
            moreInfoResult,
          ] =
            await Promise.all([
              getAdminQueue({
                statuses: [
                  "queued",
                ],
                limit: 1,
              }),

              getAdminQueue({
                statuses: [
                  "in_review",
                ],
                limit: 1,
              }),

              getAdminQueue({
                statuses: [
                  "approved",
                ],
                limit: 1,
              }),

              getAdminQueue({
                statuses: [
                  "more_info",
                ],
                limit: 1,
              }),
            ]);


          setMetrics({
            queued:
              queuedResult.total,

            inReview:
              reviewResult.total,

            approved:
              approvedResult.total,

            moreInfo:
              moreInfoResult.total,
          });
        } catch {
          setError(
            "Unable to refresh operational metrics.",
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [],
    );


  useEffect(() => {
  const timeout =
    window.setTimeout(
      () => {
        void loadMetrics();
      },
      0,
    );

  return () => {
    window.clearTimeout(
      timeout,
    );
  };
}, [
  loadMetrics,
]);


  const activeWork =
    metrics.queued +
    metrics.inReview +
    metrics.moreInfo;


  return (
    <AdminShell>
      <div
        className="
          flex
          flex-col
          gap-7
          xl:gap-8
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

              Operations overview
            </div>

            <h1
              className="
                mt-2
                text-[30px]
                font-bold
                tracking-[-0.045em]
                text-white
                sm:text-[36px]
              "
            >
              Verification operations
            </h1>

            <p
              className="
                mt-2
                max-w-[620px]
                text-sm
                leading-6
                text-slate-500
              "
            >
              Monitor manual-review workload, outstanding applicant actions, and completed approvals.
            </p>
          </div>


          <div
            className="
              flex
              flex-wrap
              gap-2
            "
          >
            <button
              type="button"
              aria-label="Refresh overview"
              onClick={() => {
                void loadMetrics();
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
                bg-white/[0.03]
                px-4
                text-[10px]
                font-bold
                text-slate-400
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

            <button
              type="button"
              onClick={() => {
                router.push(
                  "/admin/verification-requests/new",
                );
              }}
              className="
                inline-flex
                min-h-11
                items-center
                justify-center
                gap-2
                rounded-[13px]
                bg-violet-500
                px-4
                text-[10px]
                font-bold
                text-white
                shadow-[0_10px_30px_rgba(109,83,235,0.2)]
                transition
                hover:bg-violet-400
              "
            >
              <Plus
                className="size-3.5"
                aria-hidden="true"
              />

              Create request
            </button>
          </div>
        </div>


        {error && (
          <div
            role="alert"
            className="
              flex
              items-start
              gap-3
              rounded-[16px]
              border
              border-red-500/20
              bg-red-500/[0.07]
              px-4
              py-3
              text-xs
              text-red-300
            "
          >
            <AlertCircle
              className="
                mt-0.5
                size-4
                shrink-0
              "
              aria-hidden="true"
            />

            {error}
          </div>
        )}


        <div
          className="
            grid
            gap-4
            sm:grid-cols-2
            xl:grid-cols-4
          "
        >
          <OverviewCard
            icon={
              Clock3
            }
            label="Waiting"
            value={
              metrics.queued
            }
            description="Queued for review"
            emphasized={
              metrics.queued > 0
            }
            loading={
              loading
            }
          />

          <OverviewCard
            icon={
              Users
            }
            label="In Review"
            value={
              metrics.inReview
            }
            description="Cases currently claimed"
            loading={
              loading
            }
          />

          <OverviewCard
            icon={
              FileCheck2
            }
            label="More Info"
            value={
              metrics.moreInfo
            }
            description="Waiting on applicants"
            loading={
              loading
            }
          />

          <OverviewCard
            icon={
              CheckCircle2
            }
            label="Approved"
            value={
              metrics.approved
            }
            description="Approved requests"
            loading={
              loading
            }
          />
        </div>


        <div
          className="
            grid
            gap-5
            xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.55fr)]
          "
        >
          <section
            className="
              overflow-hidden
              rounded-[24px]
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
                py-5
                sm:px-6
              "
            >
              <div
                className="
                  flex
                  flex-col
                  gap-5
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                "
              >
                <div>
                  <div
                    className="
                      text-[9px]
                      font-bold
                      uppercase
                      tracking-[0.1em]
                      text-slate-600
                    "
                  >
                    Primary workstream
                  </div>

                  <h2
                    className="
                      mt-1
                      text-lg
                      font-bold
                      tracking-[-0.025em]
                      text-white
                    "
                  >
                    Manual review queue
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    router.push(
                      "/admin/verification-queue",
                    );
                  }}
                  className="
                    inline-flex
                    min-h-11
                    items-center
                    justify-center
                    gap-2
                    rounded-[13px]
                    bg-violet-500
                    px-4
                    text-[10px]
                    font-bold
                    text-white
                    transition
                    hover:bg-violet-400
                  "
                >
                  Open queue

                  <ArrowRight
                    className="size-3.5"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>


            <div
              className="
                grid
                gap-4
                p-5
                sm:grid-cols-3
                sm:p-6
              "
            >
              <WorkloadBlock
                label="Waiting to start"
                value={
                  metrics.queued
                }
                description="Prioritize oldest queued cases first."
              />

              <WorkloadBlock
                label="Being reviewed"
                value={
                  metrics.inReview
                }
                description="Already claimed by a reviewer."
              />

              <WorkloadBlock
                label="Applicant action"
                value={
                  metrics.moreInfo
                }
                description="Additional information requested."
              />
            </div>
          </section>


          <aside
            className="
              rounded-[24px]
              border
              border-white/[0.07]
              bg-[linear-gradient(145deg,rgba(124,92,255,0.07),rgba(255,255,255,0.018))]
              p-5
              sm:p-6
            "
          >
            <div
              className="
                flex
                size-10
                items-center
                justify-center
                rounded-[13px]
                bg-violet-500/10
                text-violet-300
              "
            >
              <ShieldCheck
                className="size-4"
                aria-hidden="true"
              />
            </div>

            <div
              className="
                mt-5
                text-[9px]
                font-bold
                uppercase
                tracking-[0.11em]
                text-slate-600
              "
            >
              Active workload
            </div>

            <div
              className="
                mt-1
                text-[32px]
                font-bold
                tracking-[-0.045em]
                text-white
              "
            >
              {loading
                ? "—"
                : activeWork}
            </div>

            <p
              className="
                mt-2
                text-[11px]
                leading-5
                text-slate-500
              "
            >
              Queued, actively reviewed, and additional-information cases currently requiring workflow attention.
            </p>

            <div
              className="
                mt-5
                rounded-[15px]
                border
                border-white/[0.06]
                bg-black/10
                p-4
              "
            >
              <div
                className="
                  text-[10px]
                  font-semibold
                  text-slate-300
                "
              >
                Review principle
              </div>

              <p
                className="
                  mt-1.5
                  text-[10px]
                  leading-5
                  text-slate-600
                "
              >
                Claim a case only when ready to review it. Queue age should remain the primary prioritization signal.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </AdminShell>
  );
}


function OverviewCard({
  icon: Icon,
  label,
  value,
  description,
  emphasized = false,
  loading,
}: {
  icon: ElementType;
  label: string;
  value: number;
  description: string;
  emphasized?: boolean;
  loading: boolean;
}) {
  return (
    <div
      className={`
        rounded-[21px]
        border
        p-5
        ${
          emphasized
            ? `
                border-violet-500/20
                bg-violet-500/[0.055]
              `
            : `
                border-white/[0.07]
                bg-white/[0.025]
              `
        }
      `}
    >
      <div
        className="
          flex
          items-start
          justify-between
          gap-4
        "
      >
        <div
          className="
            flex
            size-10
            items-center
            justify-center
            rounded-[13px]
            bg-violet-500/10
            text-violet-300
          "
        >
          <Icon
            className="size-4"
            aria-hidden="true"
          />
        </div>

        {loading && (
          <LoaderCircle
            className="
              size-3.5
              animate-spin
              text-slate-700
            "
            aria-hidden="true"
          />
        )}
      </div>


      <div
        className="
          mt-5
          text-[9px]
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
          text-[31px]
          font-bold
          tracking-[-0.045em]
          text-white
        "
      >
        {loading
          ? "—"
          : value}
      </div>

      <p
        className="
          mt-1
          text-[10px]
          text-slate-600
        "
      >
        {description}
      </p>
    </div>
  );
}


function WorkloadBlock({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div
      className="
        rounded-[17px]
        border
        border-white/[0.06]
        bg-black/10
        p-4
      "
    >
      <div
        className="
          text-[9px]
          font-bold
          uppercase
          tracking-[0.09em]
          text-slate-600
        "
      >
        {label}
      </div>

      <div
        className="
          mt-2
          text-2xl
          font-bold
          tracking-[-0.04em]
          text-slate-100
        "
      >
        {value}
      </div>

      <p
        className="
          mt-2
          text-[10px]
          leading-5
          text-slate-600
        "
      >
        {description}
      </p>
    </div>
  );
}