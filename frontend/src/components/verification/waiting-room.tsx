"use client";

import type {
  ReactNode,
} from "react";

import {
  useEffect,
  useState,
} from "react";

import {
  Check,
  Clock3,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

import {
  VerificationShell,
} from "@/components/verification/verification-shell";

import {
  apiFetch,
} from "@/lib/api";

import {
  getVerificationStatusPath,
} from "@/lib/status-routing";

import type {
  VerificationStatusResponse,
} from "@/types/verification";


const REFRESH_INTERVAL_MS =
  15_000;


export function WaitingRoom() {
  const [
    status,
    setStatus,
  ] =
    useState<VerificationStatusResponse | null>(
      null,
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(true);

  const [
    lastCheckedAt,
    setLastCheckedAt,
  ] =
    useState<Date | null>(
      null,
    );


  useEffect(() => {
    let active =
      true;

    let timer:
      number | null =
      null;


    async function refresh(): Promise<void> {
      if (!active) {
        return;
      }

      setRefreshing(
        true,
      );

      try {
        const result =
          await apiFetch<VerificationStatusResponse>(
            "/verification/status",
          );

        if (!active) {
          return;
        }

        setStatus(
          result,
        );

        setError(
          null,
        );

        setLastCheckedAt(
          new Date(),
        );


        if (
          ![
            "queued",
            "in_review",
          ].includes(
            result.status,
          )
        ) {
          window.location.assign(
            getVerificationStatusPath(
              result.status,
            ),
          );

          return;
        }
      } catch {
        if (!active) {
          return;
        }

        setError(
          "We could not refresh your verification status. Your submission has not been changed.",
        );
      } finally {
        if (active) {
          setRefreshing(
            false,
          );
        }
      }


      if (active) {
        timer =
          window.setTimeout(
            () => {
              void refresh();
            },
            REFRESH_INTERVAL_MS,
          );
      }
    }


    void refresh();


    return () => {
      active =
        false;

      if (timer !== null) {
        window.clearTimeout(
          timer,
        );
      }
    };
  }, []);


  const isInReview =
    status?.status ===
    "in_review";


  const currentStep =
    isInReview
      ? "review"
      : "queue";


  return (
    <VerificationShell
      currentStep={
        currentStep
      }
    >
      <section
        className="
          glass-card
          mx-auto
          max-w-[840px]
          overflow-hidden
          rounded-[30px]
        "
      >
        <header
          className="
            border-b
            border-[#ece9f1]
            px-6
            py-8
            text-center
            sm:px-10
            sm:py-10
          "
        >
          <div
            className="
              relative
              mx-auto
              flex
              size-[68px]
              items-center
              justify-center
              rounded-[22px]
              bg-[#efedff]
              text-[#6657f5]
            "
          >
            {isInReview ? (
              <UserRoundCheck
                className="size-7"
                aria-hidden="true"
              />
            ) : (
              <Clock3
                className="size-7"
                aria-hidden="true"
              />
            )}

            <span
              className="
                absolute
                -right-0.5
                -top-0.5
                flex
                size-[18px]
                items-center
                justify-center
                rounded-full
                border-[3px]
                border-white
                bg-[#8b7af3]
              "
            >
              <span
                className="
                  size-1.5
                  animate-pulse
                  rounded-full
                  bg-white
                "
              />
            </span>
          </div>


          <div
            className="
              mt-5
              text-[10px]
              font-bold
              uppercase
              tracking-[0.12em]
              text-[#776ad2]
            "
          >
            {isInReview
              ? "Administrator review"
              : "Review queue"}
          </div>


          <h1
            className="
              mt-2
              text-[29px]
              font-bold
              tracking-[-0.045em]
              text-[#171522]
              sm:text-[36px]
            "
          >
            {isInReview
              ? "Your verification is being reviewed"
              : "Your verification is in the queue"}
          </h1>


          <p
            className="
              mx-auto
              mt-4
              max-w-[570px]
              text-[12px]
              leading-6
              text-[#777486]
              sm:text-sm
            "
          >
            {isInReview
              ? (
                  <>
                    An authorized administrator has
                    opened your case and is reviewing
                    the information and evidence you
                    submitted.
                  </>
                )
              : (
                  <>
                    Your submission was received
                    successfully and is waiting for an
                    authorized administrator to begin
                    review.
                  </>
                )}
          </p>


          <div
            className="
              mt-6
              flex
              flex-wrap
              items-center
              justify-center
              gap-2
            "
          >
            <StatusPill
              active={
                !isInReview
              }
              complete={
                isInReview
              }
            >
              Submitted
            </StatusPill>

            <div
              aria-hidden="true"
              className="
                hidden
                h-px
                w-5
                bg-[#ddd9e7]
                sm:block
              "
            />

            <StatusPill
              active={
                isInReview
              }
              complete={false}
            >
              Admin review
            </StatusPill>

            <div
              aria-hidden="true"
              className="
                hidden
                h-px
                w-5
                bg-[#ddd9e7]
                sm:block
              "
            />

            <StatusPill
              active={false}
              complete={false}
            >
              Decision
            </StatusPill>
          </div>
        </header>


        <div
          className="
            grid
            gap-5
            px-6
            py-7
            sm:px-10
            sm:py-8
            lg:grid-cols-[minmax(0,1fr)_250px]
          "
        >
          <div
            className="
              min-w-0
              space-y-4
            "
          >
            <div
              className="
                rounded-[20px]
                border
                border-[#e7e3ef]
                bg-white/75
                p-5
              "
            >
              <div
                className="
                  flex
                  items-start
                  gap-3.5
                "
              >
                <div
                  className="
                    flex
                    size-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-[13px]
                    bg-[#f0edff]
                    text-[#6657f5]
                  "
                >
                  {isInReview ? (
                    <UserRoundCheck
                      className="size-4"
                      aria-hidden="true"
                    />
                  ) : (
                    <Clock3
                      className="size-4"
                      aria-hidden="true"
                    />
                  )}
                </div>


                <div>
                  <h2
                    className="
                      text-xs
                      font-bold
                      text-[#302c38]
                    "
                  >
                    {isInReview
                      ? "Review has started"
                      : "Waiting for a reviewer"}
                  </h2>

                  <p
                    className="
                      mt-1
                      text-[11px]
                      leading-5
                      text-[#7e7a89]
                    "
                  >
                    {isInReview
                      ? "No action is required from you while the administrator reviews your case. If more information is needed, your status will update automatically."
                      : "You do not need to submit the form again. Your place in the verification queue is already recorded."}
                  </p>
                </div>
              </div>
            </div>


            <div
              className="
                rounded-[20px]
                border
                border-[#e7e3ef]
                bg-[#faf9fd]
                p-5
              "
            >
              <div
                className="
                  flex
                  items-start
                  gap-3.5
                "
              >
                <div
                  className="
                    flex
                    size-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-[13px]
                    bg-[#f0edff]
                    text-[#6657f5]
                  "
                >
                  <LockKeyhole
                    className="size-4"
                    aria-hidden="true"
                  />
                </div>


                <div>
                  <h2
                    className="
                      text-xs
                      font-bold
                      text-[#302c38]
                    "
                  >
                    Discord access remains locked
                  </h2>

                  <p
                    className="
                      mt-1
                      text-[11px]
                      leading-5
                      text-[#7e7a89]
                    "
                  >
                    Submitting verification does not
                    grant access to the protected
                    server. Access can be released
                    only after an administrator
                    explicitly approves this
                    verification.
                  </p>
                </div>
              </div>
            </div>


            {status?.user_message && (
              <div
                className="
                  rounded-[20px]
                  border
                  border-[#ded9ff]
                  bg-[linear-gradient(145deg,#faf9ff,#f5f2ff)]
                  p-5
                "
              >
                <div
                  className="
                    flex
                    items-start
                    gap-3.5
                  "
                >
                  <div
                    className="
                      flex
                      size-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-[13px]
                      bg-white
                      text-[#6657f5]
                      shadow-sm
                    "
                  >
                    <MessageSquareText
                      className="size-4"
                      aria-hidden="true"
                    />
                  </div>

                  <div>
                    <div
                      className="
                        text-[9px]
                        font-bold
                        uppercase
                        tracking-[0.09em]
                        text-[#8b81d3]
                      "
                    >
                      Administrator message
                    </div>

                    <p
                      className="
                        mt-2
                        text-[11px]
                        leading-5
                        text-[#625e6c]
                      "
                    >
                      {status.user_message}
                    </p>
                  </div>
                </div>
              </div>
            )}


            {error && (
              <div
                role="alert"
                className="
                  rounded-[17px]
                  border
                  border-[#ffd8dd]
                  bg-[#fff5f6]
                  px-4
                  py-3
                  text-[11px]
                  leading-5
                  text-[#b94452]
                "
              >
                {error}
              </div>
            )}
          </div>


          <aside
            className="
              h-fit
              rounded-[20px]
              border
              border-[#e7e3ef]
              bg-[#faf9fd]
              p-5
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
              <div
                className="
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-[0.1em]
                  text-[#aaa5b3]
                "
              >
                Live status
              </div>

              <div
                className="
                  flex
                  size-7
                  items-center
                  justify-center
                  rounded-[9px]
                  bg-white
                  text-[#7467ce]
                "
              >
                {refreshing ? (
                  <LoaderCircle
                    className="
                      size-3
                      animate-spin
                    "
                    aria-hidden="true"
                  />
                ) : (
                  <RefreshCw
                    className="size-3"
                    aria-hidden="true"
                  />
                )}
              </div>
            </div>


            <div
              className="
                mt-4
                text-base
                font-bold
                tracking-[-0.025em]
                text-[#34303b]
              "
            >
              {isInReview
                ? "In review"
                : status
                  ? "Queued"
                  : "Checking…"}
            </div>


            <p
              className="
                mt-1
                text-[10px]
                leading-5
                text-[#8a8594]
              "
            >
              This page checks for status changes automatically.
            </p>


            <div
              className="
                mt-4
                border-t
                border-[#e7e3ec]
                pt-4
              "
            >
              <div
                className="
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-[0.08em]
                  text-[#aaa5b3]
                "
              >
                Last checked
              </div>

              <div
                className="
                  mt-1
                  text-[10px]
                  font-semibold
                  text-[#6f6a78]
                "
              >
                {lastCheckedAt
                  ? lastCheckedAt.toLocaleTimeString(
                      [],
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      },
                    )
                  : "Checking now"}
              </div>
            </div>


            <div
              className="
                mt-5
                flex
                items-start
                gap-2.5
                rounded-[14px]
                bg-white
                p-3.5
              "
            >
              <ShieldCheck
                className="
                  mt-0.5
                  size-3.5
                  shrink-0
                  text-[#7770b8]
                "
                aria-hidden="true"
              />

              <p
                className="
                  text-[9px]
                  font-medium
                  leading-5
                  text-[#8b8797]
                "
              >
                You can safely close this page and
                return later. We do not show an
                estimated review time unless one can
                be calculated reliably.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </VerificationShell>
  );
}


function StatusPill({
  active,
  complete,
  children,
}: {
  active: boolean;

  complete: boolean;

  children: ReactNode;
}) {
  return (
    <div
      className={`
        inline-flex
        min-h-8
        items-center
        gap-1.5
        rounded-full
        px-3
        text-[9px]
        font-bold
        ${
          complete
            ? "bg-emerald-50 text-emerald-700"
            : active
              ? "bg-[#efedff] text-[#6657f5]"
              : "bg-[#f5f3f7] text-[#aaa5b2]"
        }
      `}
    >
      {complete ? (
        <Check
          className="size-3"
          aria-hidden="true"
        />
      ) : active ? (
        <LoaderCircle
          className="
            size-3
            animate-spin
          "
          aria-hidden="true"
        />
      ) : (
        <span
          className="
            size-1.5
            rounded-full
            bg-current
          "
        />
      )}

      {children}
    </div>
  );
}