"use client";

import {
  ArrowLeft,
  CalendarClock,
  Clock3,
  Fingerprint,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  UserRoundCheck,
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
  AccessManagementPanel,
} from "@/components/admin/access-management-panel";

import {
  AdminShell,
} from "@/components/admin/admin-shell";

import {
  AdminStatusBadge,
} from "@/components/admin/status-badge";

import {
  AuditTimeline,
} from "@/components/admin/audit-timeline";

import {
  DecisionPanel,
} from "@/components/admin/decision-panel";

import {
  EvidenceDeletionPanel,
} from "@/components/admin/evidence-deletion-panel";

import {
  EvidenceReviewCard,
} from "@/components/admin/evidence-review-card";

import {
  InternalNotesPanel,
} from "@/components/admin/internal-notes-panel";

import {
  MetaPill,
} from "@/components/admin/meta-pill";

import {
  RequestActionsPanel,
} from "@/components/admin/request-actions-panel";

import {
  getReviewDetail,
} from "@/lib/admin-api";

import {
  formatDateTime,
  formatWaitingDuration,
} from "@/lib/date";

import type {
  ReviewDetailResponse,
} from "@/types/admin-review";


export function ReviewWorkspace({
  requestId,
}: {
  requestId: string;
}) {
  const router =
    useRouter();

  const [
    review,
    setReview,
  ] =
    useState<ReviewDetailResponse | null>(
      null,
    );

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


  const refreshReview =
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
            await getReviewDetail(
              requestId,
            );

          setReview(
            result,
          );

          setError(
            null,
          );
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to load case.",
          );
        } finally {
          if (background) {
            setRefreshing(
              false,
            );
          }
        }
      },
      [
        requestId,
      ],
    );


  useEffect(() => {
    let active =
      true;

    async function load(): Promise<void> {
      try {
        const result =
          await getReviewDetail(
            requestId,
          );

        if (!active) {
          return;
        }

        setReview(
          result,
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
            : "Unable to load case.",
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
  }, [
    requestId,
  ]);


  async function retry(): Promise<void> {
    setLoading(
      true,
    );

    setError(
      null,
    );

    try {
      await refreshReview(
        false,
      );
    } finally {
      setLoading(
        false,
      );
    }
  }


  if (loading) {
    return (
      <AdminShell>
        <div
          className="
            flex
            min-h-[520px]
            flex-col
            items-center
            justify-center
          "
        >
          <LoaderCircle
            className="
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
              font-semibold
              text-slate-600
            "
          >
            Loading verification case
          </div>
        </div>
      </AdminShell>
    );
  }


  if (!review) {
    return (
      <AdminShell>
        <div
          className="
            flex
            min-h-[520px]
            flex-col
            items-center
            justify-center
            px-4
            text-center
          "
        >
          <div
            className="
              flex
              size-12
              items-center
              justify-center
              rounded-[16px]
              bg-red-500/[0.08]
              text-red-300
            "
          >
            <ShieldCheck
              className="size-5"
              aria-hidden="true"
            />
          </div>

          <div
            className="
              mt-4
              text-sm
              font-semibold
              text-red-300
            "
          >
            Unable to load verification case
          </div>

          <p
            className="
              mt-2
              max-w-[460px]
              text-[11px]
              leading-5
              text-slate-600
            "
          >
            {error ??
              "The verification request could not be loaded."}
          </p>

          <div
            className="
              mt-5
              flex
              flex-wrap
              justify-center
              gap-2
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
                justify-center
                gap-2
                rounded-xl
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
              <ArrowLeft
                className="size-3.5"
                aria-hidden="true"
              />

              Back to queue
            </button>

            <button
              type="button"
              onClick={() => {
                void retry();
              }}
              className="
                inline-flex
                min-h-10
                items-center
                justify-center
                rounded-xl
                bg-violet-500
                px-4
                text-[10px]
                font-bold
                text-white
                transition
                hover:bg-violet-400
              "
            >
              Try again
            </button>
          </div>
        </div>
      </AdminShell>
    );
  }


  const hasSubmissions =
    review.submissions.length >
    0;

  const totalEvidence =
    review.submissions.reduce(
      (
        count,
        submission,
      ) =>
        count +
        submission.evidence.length,
      0,
    );


  return (
    <AdminShell>
      <div
        className="
          flex
          flex-col
          gap-6
        "
      >
        <div
          className="
            flex
            items-center
            justify-between
            gap-3
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

            Back to verification queue
          </button>

          <button
            type="button"
            disabled={
              refreshing
            }
            onClick={() => {
              void refreshReview();
            }}
            className="
              inline-flex
              min-h-10
              items-center
              gap-2
              rounded-xl
              border
              border-white/[0.07]
              bg-white/[0.03]
              px-3
              text-[9px]
              font-bold
              text-slate-500
              transition
              hover:bg-white/[0.06]
              hover:text-white
              disabled:opacity-50
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

            Refresh case
          </button>
        </div>


        {error && (
          <div
            role="alert"
            className="
              rounded-[15px]
              border
              border-red-500/20
              bg-red-500/[0.07]
              px-4
              py-3
              text-[10px]
              leading-5
              text-red-300
            "
          >
            {error}
          </div>
        )}


        <section
          className="
            overflow-hidden
            rounded-[24px]
            border
            border-white/[0.07]
            bg-white/[0.025]
            shadow-[0_24px_80px_rgba(0,0,0,0.16)]
          "
        >
          <div
            className="
              flex
              flex-col
              gap-6
              border-b
              border-white/[0.06]
              p-5
              sm:p-6
              xl:flex-row
              xl:items-center
              xl:justify-between
            "
          >
            <div
              className="
                flex
                min-w-0
                items-start
                gap-4
              "
            >
              <div
                className="
                  flex
                  size-14
                  shrink-0
                  items-center
                  justify-center
                  rounded-[18px]
                  bg-violet-500/10
                  text-violet-300
                  shadow-[inset_0_0_0_1px_rgba(139,113,255,0.08)]
                "
              >
                <Fingerprint
                  className="size-6"
                  aria-hidden="true"
                />
              </div>

              <div className="min-w-0">
                <div
                  className="
                    flex
                    flex-wrap
                    items-center
                    gap-3
                  "
                >
                  <h1
                    className="
                      break-words
                      text-[24px]
                      font-bold
                      tracking-[-0.035em]
                      text-white
                      sm:text-[28px]
                    "
                  >
                    {review.discord_username_snapshot
                      ? `@${review.discord_username_snapshot}`
                      : "Discord applicant"}
                  </h1>

                  <AdminStatusBadge
                    status={
                      review.status
                    }
                  />
                </div>

                <div
                  className="
                    mt-2
                    flex
                    max-w-[760px]
                    items-start
                    gap-2
                    text-[10px]
                    leading-5
                    text-slate-600
                  "
                >
                  <ShieldCheck
                    className="
                      mt-0.5
                      size-3.5
                      shrink-0
                      text-violet-400
                    "
                    aria-hidden="true"
                  />

                  <div>
                    <span
                      className="
                        font-semibold
                        text-slate-500
                      "
                    >
                      Immutable Discord User ID
                    </span>

                    <div
                      className="
                        mt-0.5
                        break-all
                        font-mono
                        text-slate-300
                      "
                    >
                      {
                        review.assigned_discord_user_id
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>


            <div
              className="
                grid
                gap-2
                sm:grid-cols-3
              "
            >
              <MetaPill
                icon={
                  <Clock3
                    className="size-3"
                  />
                }
                label="Queue wait"
                value={
                  formatWaitingDuration(
                    review.queue_entered_at,
                  )
                }
              />

              <MetaPill
                icon={
                  <UserRoundCheck
                    className="size-3"
                  />
                }
                label="Reviewer"
                value={
                  review.assigned_reviewer_id ??
                  "Unassigned"
                }
              />

              <MetaPill
                icon={
                  <CalendarClock
                    className="size-3"
                  />
                }
                label="Review started"
                value={
                  review.review_started_at
                    ? formatDateTime(
                        review.review_started_at,
                      )
                    : "Not started"
                }
              />
            </div>
          </div>


          <div
            className="
              grid
              gap-px
              bg-white/[0.055]
              sm:grid-cols-3
            "
          >
            <CaseMeta
              label="Request ID"
              value={
                review.request_id
              }
              mono
            />

            <CaseMeta
              label="Submissions"
              value={String(
                review.submissions.length,
              )}
            />

            <CaseMeta
              label="Evidence objects"
              value={String(
                totalEvidence,
              )}
            />
          </div>
        </section>


        <div
          className="
            grid
            gap-6
            2xl:grid-cols-[minmax(0,1.55fr)_430px]
          "
        >
          <div
            className="
              min-w-0
              space-y-6
            "
          >
            {hasSubmissions ? (
              review.submissions.map(
                (
                  submission,
                  index,
                ) => (
                  <section
                    key={
                      submission.submission_id
                    }
                    className="
                      overflow-hidden
                      rounded-[22px]
                      border
                      border-white/[0.07]
                      bg-white/[0.025]
                    "
                  >
                    <div
                      className="
                        flex
                        flex-col
                        gap-3
                        border-b
                        border-white/[0.06]
                        px-5
                        py-4
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                      "
                    >
                      <div>
                        <div
                          className="
                            text-xs
                            font-bold
                            text-slate-200
                          "
                        >
                          Submission{" "}
                          {index + 1}
                        </div>

                        <div
                          className="
                            mt-1
                            text-[9px]
                            text-slate-600
                          "
                        >
                          Submitted{" "}
                          {formatDateTime(
                            submission.submitted_at,
                          )}
                        </div>
                      </div>

                      <div
                        className="
                          rounded-full
                          border
                          border-white/[0.06]
                          bg-white/[0.025]
                          px-3
                          py-1.5
                          text-[8px]
                          font-bold
                          uppercase
                          tracking-[0.08em]
                          text-slate-600
                        "
                      >
                        {submission.evidence.length}{" "}
                        evidence item
                        {submission.evidence.length ===
                        1
                          ? ""
                          : "s"}
                      </div>
                    </div>


                    <div
                      className="
                        p-5
                        sm:p-6
                      "
                    >
                      <div
                        className="
                          mb-3
                          text-[9px]
                          font-bold
                          uppercase
                          tracking-[0.1em]
                          text-slate-600
                        "
                      >
                        Submitted identity data
                      </div>

                      <div
                        className="
                          grid
                          gap-3
                          sm:grid-cols-2
                          xl:grid-cols-3
                        "
                      >
                        <ReviewField
                          label="Legal name"
                          value={
                            submission.legal_name
                          }
                        />

                        <ReviewField
                          label="Date of birth"
                          value={
                            submission.date_of_birth
                          }
                        />

                        <ReviewField
                          label="Age result"
                          value={
                            submission.age_result
                          }
                        />

                        <ReviewField
                          label="Issuing country"
                          value={
                            submission.issuing_country
                          }
                        />

                        <ReviewField
                          label="Document type"
                          value={
                            submission.document_type
                          }
                        />
                      </div>


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
                            flex
                            items-center
                            justify-between
                            gap-3
                          "
                        >
                          <div
                            className="
                              text-[9px]
                              font-bold
                              uppercase
                              tracking-[0.1em]
                              text-slate-600
                            "
                          >
                            Submitted evidence
                          </div>

                          <div
                            className="
                              text-[8px]
                              text-slate-700
                            "
                          >
                            Preview links are temporary
                          </div>
                        </div>


                        {submission.evidence.length >
                        0 ? (
                          <div
                            className="
                              grid
                              gap-3
                              xl:grid-cols-2
                            "
                          >
                            {submission.evidence.map(
                              (
                                evidence,
                              ) => (
                                <EvidenceReviewCard
                                  key={
                                    evidence.evidence_id
                                  }
                                  evidence={
                                    evidence
                                  }
                                />
                              ),
                            )}
                          </div>
                        ) : (
                          <div
                            className="
                              rounded-[15px]
                              border
                              border-white/[0.05]
                              bg-[#0b131e]
                              p-4
                              text-[10px]
                              text-slate-700
                            "
                          >
                            No evidence objects are attached to this submission.
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                ),
              )
            ) : (
              <section
                className="
                  rounded-[22px]
                  border
                  border-white/[0.07]
                  bg-white/[0.025]
                  p-8
                  text-center
                "
              >
                <div
                  className="
                    text-xs
                    font-semibold
                    text-slate-500
                  "
                >
                  No submission available
                </div>

                <p
                  className="
                    mx-auto
                    mt-2
                    max-w-[420px]
                    text-[10px]
                    leading-5
                    text-slate-700
                  "
                >
                  This verification request currently has no submitted identity information.
                </p>
              </section>
            )}


            <InternalNotesPanel
              requestId={
                requestId
              }
            />
          </div>


          <aside
            className="
              min-w-0
              space-y-6
              2xl:sticky
              2xl:top-[100px]
              2xl:self-start
            "
          >
            {review.status ===
              "in_review" && (
              <DecisionPanel
                requestId={
                  requestId
                }
                onCompleted={() => {
                  void refreshReview();
                }}
              />
            )}


            <AccessManagementPanel
              requestId={
                requestId
              }
              approved={
                review.status ===
                "approved"
              }
              onChanged={() => {
                void refreshReview();
              }}
            />


            <RequestActionsPanel
              requestId={
                requestId
              }
              onChanged={() => {
                void refreshReview();
              }}
            />


            <EvidenceDeletionPanel
              requestId={
                requestId
              }
              onChanged={() => {
                void refreshReview();
              }}
            />


            <AuditTimeline
              requestId={
                requestId
              }
            />
          </aside>
        </div>
      </div>
    </AdminShell>
  );
}


function CaseMeta({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div
      className="
        bg-[#0b131e]
        px-5
        py-4
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
        {label}
      </div>

      <div
        className={`
          mt-1.5
          break-all
          text-[10px]
          font-semibold
          text-slate-400
          ${
            mono
              ? "font-mono"
              : ""
          }
        `}
      >
        {value}
      </div>
    </div>
  );
}


function ReviewField({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  const hasValue =
    Boolean(
      value?.trim(),
    );

  return (
    <div
      className="
        rounded-[14px]
        border
        border-white/[0.055]
        bg-[#0b131e]
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
          text-slate-700
        "
      >
        {label}
      </div>

      <div
        className={`
          mt-2
          break-words
          text-[11px]
          font-semibold
          ${
            hasValue
              ? "text-slate-300"
              : "text-slate-700"
          }
        `}
      >
        {hasValue
          ? value
          : "Not provided"}
      </div>
    </div>
  );
}