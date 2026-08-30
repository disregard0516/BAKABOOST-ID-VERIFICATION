"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import {
  VerificationShell,
} from "@/components/verification/verification-shell";

import {
  apiFetch,
} from "@/lib/api";

import {
  formatDateTime,
  getTimeRemaining,
} from "@/lib/date";

import type {
  VerificationAccessResponse,
} from "@/types/verification";


const ACCESS_REFRESH_MS =
  12_000;


export function ApprovedAccess() {
  const [
    access,
    setAccess,
  ] =
    useState<VerificationAccessResponse | null>(
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

  const [
    lastCheckedAt,
    setLastCheckedAt,
  ] =
    useState<Date | null>(
      null,
    );


  const loadAccess =
    useCallback(
      async (
        initial = false,
      ): Promise<boolean> => {
        if (initial) {
          setLoading(
            true,
          );
        } else {
          setRefreshing(
            true,
          );
        }

        try {
          const result =
            await apiFetch<VerificationAccessResponse>(
              "/verification/access",
            );

          setAccess(
            result,
          );

          setError(
            null,
          );

          setLastCheckedAt(
            new Date(),
          );

          return Boolean(
            result.access_available &&
            result.discord_invite_url,
          );
        } catch {
          setError(
            "We could not refresh your Discord access grant. Your verification approval has not been changed.",
          );

          return false;
        } finally {
          if (initial) {
            setLoading(
              false,
            );
          } else {
            setRefreshing(
              false,
            );
          }
        }
      },
      [],
    );


  useEffect(() => {
  let active =
    true;

  let timer:
    number | null =
    null;

  let firstRequest =
    true;


  async function refresh(): Promise<void> {
    if (!active) {
      return;
    }

    const grantReady =
      await loadAccess(
        firstRequest,
      );

    firstRequest =
      false;

    if (
      active &&
      !grantReady
    ) {
      timer =
        window.setTimeout(
          () => {
            void refresh();
          },
          ACCESS_REFRESH_MS,
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
}, [
  loadAccess,
]);


  if (loading) {
    return (
      <VerificationShell
        currentStep="access"
      >
        <div
          className="
            glass-card
            mx-auto
            flex
            min-h-[420px]
            max-w-[800px]
            items-center
            justify-center
            rounded-[30px]
            px-6
          "
        >
          <div
            className="
              flex
              flex-col
              items-center
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
                bg-emerald-50
                text-[#178b63]
              "
            >
              <LoaderCircle
                className="
                  size-6
                  animate-spin
                "
                aria-hidden="true"
              />
            </div>

            <h1
              className="
                mt-5
                text-lg
                font-bold
                tracking-[-0.03em]
                text-[#28242f]
              "
            >
              Checking your access
            </h1>

            <p
              className="
                mt-2
                max-w-[340px]
                text-[11px]
                leading-5
                text-[#918c9c]
              "
            >
              Your verification is approved. We’re checking whether the controlled Discord entry grant is ready.
            </p>
          </div>
        </div>
      </VerificationShell>
    );
  }


  const accessReady =
    Boolean(
      access?.access_available &&
      access.discord_invite_url,
    );


  return (
    <VerificationShell
      currentStep="access"
    >
      <section
        className="
          glass-card
          mx-auto
          max-w-[820px]
          overflow-hidden
          rounded-[30px]
        "
      >
        <div
          className="
            relative
            overflow-hidden
            border-b
            border-[#e9eee9]
            px-6
            py-10
            text-center
            sm:px-12
            sm:py-12
          "
        >
          <div
            aria-hidden="true"
            className="
              absolute
              left-1/2
              top-[-150px]
              h-[320px]
              w-[620px]
              -translate-x-1/2
              rounded-full
              bg-emerald-300/15
              blur-[80px]
            "
          />

          <div className="relative">
            <div
              className="
                mx-auto
                flex
                size-[74px]
                items-center
                justify-center
                rounded-[24px]
                bg-[#e8f8f0]
                text-[#178b63]
                shadow-[0_14px_40px_rgba(23,139,99,0.13)]
              "
            >
              <CheckCircle2
                className="size-8"
                aria-hidden="true"
              />
            </div>


            <div
              className="
                mt-5
                text-[10px]
                font-bold
                uppercase
                tracking-[0.12em]
                text-[#438d72]
              "
            >
              Verification approved
            </div>


            <h1
              className="
                mt-2
                text-[34px]
                font-bold
                tracking-[-0.05em]
                text-[#171522]
                sm:text-[42px]
              "
            >
              {accessReady
                ? "Your Discord access is ready"
                : "Your verification is complete"}
            </h1>


            <p
              className="
                mx-auto
                mt-4
                max-w-[550px]
                text-[12px]
                leading-6
                text-[#777486]
                sm:text-sm
              "
            >
              Your verification was approved for the Discord account bound to this request. Approval and server entry are handled as separate steps.
            </p>
          </div>
        </div>


        <div
          className="
            px-6
            py-7
            sm:px-10
            sm:py-9
          "
        >
          {accessReady &&
          access?.discord_invite_url ? (
            <div
              className="
                mx-auto
                max-w-[610px]
              "
            >
              <div
                className="
                  rounded-[22px]
                  border
                  border-[#dcefe6]
                  bg-[linear-gradient(145deg,#f9fdfa,#f2faf6)]
                  p-5
                  sm:p-6
                "
              >
                <div
                  className="
                    flex
                    items-start
                    gap-4
                  "
                >
                  <div
                    className="
                      flex
                      size-11
                      shrink-0
                      items-center
                      justify-center
                      rounded-[14px]
                      bg-white
                      text-[#178b63]
                      shadow-sm
                    "
                  >
                    <ShieldCheck
                      className="size-4.5"
                      aria-hidden="true"
                    />
                  </div>


                  <div>
                    <div
                      className="
                        flex
                        flex-wrap
                        items-center
                        gap-2
                      "
                    >
                      <h2
                        className="
                          text-sm
                          font-bold
                          text-[#264338]
                        "
                      >
                        Controlled server-entry grant
                      </h2>

                      <span
                        className="
                          rounded-full
                          bg-emerald-100
                          px-2.5
                          py-1
                          text-[8px]
                          font-bold
                          uppercase
                          tracking-[0.08em]
                          text-emerald-700
                        "
                      >
                        Active
                      </span>
                    </div>


                    <p
                      className="
                        mt-2
                        text-[11px]
                        leading-5
                        text-[#70867d]
                      "
                    >
                      This entry grant is intended only for the approved Discord identity. It may be short-lived, single-use, or otherwise validated when you join.
                    </p>
                  </div>
                </div>


                {access.expires_at && (
                  <div
                    className="
                      mt-5
                      grid
                      gap-3
                      sm:grid-cols-2
                    "
                  >
                    <AccessInfo
                      label="Grant expires"
                      value={
                        formatDateTime(
                          access.expires_at,
                        )
                      }
                    />

                    <AccessInfo
                      label="Time remaining"
                      value={
                        getTimeRemaining(
                          access.expires_at,
                        )
                      }
                    />
                  </div>
                )}
              </div>


              <a
                href={
                  access.discord_invite_url
                }
                rel="noreferrer"
                className="
                  focus-ring
                  group
                  mt-6
                  inline-flex
                  min-h-14
                  w-full
                  items-center
                  justify-center
                  gap-3
                  rounded-[17px]
                  bg-[#178b63]
                  px-6
                  text-sm
                  font-bold
                  text-white
                  shadow-[0_14px_38px_rgba(23,139,99,0.24)]
                  transition
                  hover:-translate-y-0.5
                  hover:bg-[#137a57]
                "
              >
                Enter Discord server

                <ArrowUpRight
                  className="
                    size-4
                    transition-transform
                    group-hover:-translate-y-0.5
                    group-hover:translate-x-0.5
                  "
                  aria-hidden="true"
                />
              </a>


              <div
                className="
                  mt-5
                  flex
                  items-start
                  gap-3
                  rounded-[17px]
                  border
                  border-[#e7e5ea]
                  bg-white/70
                  p-4
                "
              >
                <LockKeyhole
                  className="
                    mt-0.5
                    size-4
                    shrink-0
                    text-[#6861a2]
                  "
                  aria-hidden="true"
                />

                <p
                  className="
                    text-[10px]
                    leading-5
                    text-[#827e8d]
                  "
                >
                  Do not share this access action. It is intended for the same Discord account that completed verification.
                </p>
              </div>
            </div>
          ) : (
            <div
              className="
                mx-auto
                max-w-[610px]
              "
            >
              <div
                className="
                  rounded-[22px]
                  border
                  border-[#e3dfff]
                  bg-[linear-gradient(145deg,#fbfaff,#f5f2ff)]
                  p-6
                  text-center
                "
              >
                <div
                  className="
                    mx-auto
                    flex
                    size-12
                    items-center
                    justify-center
                    rounded-[16px]
                    bg-white
                    text-[#7062cf]
                    shadow-sm
                  "
                >
                  <Clock3
                    className="size-5"
                    aria-hidden="true"
                  />
                </div>


                <div
                  className="
                    mt-4
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.1em]
                    text-[#8276d0]
                  "
                >
                  Approval complete
                </div>


                <h2
                  className="
                    mt-2
                    text-lg
                    font-bold
                    tracking-[-0.03em]
                    text-[#37323f]
                  "
                >
                  Preparing your server-entry grant
                </h2>


                <p
                  className="
                    mx-auto
                    mt-2
                    max-w-[430px]
                    text-[11px]
                    leading-5
                    text-[#827e8c]
                  "
                >
                  Your identity verification is already approved. An active Discord entry grant is not available yet, so this page is checking automatically.
                </p>


                <div
                  className="
                    mt-5
                    inline-flex
                    items-center
                    gap-2
                    rounded-full
                    bg-white
                    px-3.5
                    py-2
                    text-[9px]
                    font-bold
                    text-[#7266c5]
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

                  Checking access automatically
                </div>


                {lastCheckedAt && (
                  <div
                    className="
                      mt-3
                      text-[9px]
                      text-[#aaa5b3]
                    "
                  >
                    Last checked{" "}
                    {lastCheckedAt.toLocaleTimeString(
                      [],
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      },
                    )}
                  </div>
                )}
              </div>


              <div
                className="
                  mt-5
                  flex
                  items-start
                  gap-3
                  rounded-[17px]
                  border
                  border-[#e8e5ee]
                  bg-[#faf9fd]
                  p-4
                "
              >
                <Sparkles
                  className="
                    mt-0.5
                    size-4
                    shrink-0
                    text-[#7062cf]
                  "
                  aria-hidden="true"
                />

                <p
                  className="
                    text-[10px]
                    leading-5
                    text-[#827e8d]
                  "
                >
                  You do not need to submit verification again. Approval is already recorded; only the controlled server-entry step is pending.
                </p>
              </div>
            </div>
          )}


          {error && (
            <div
              role="alert"
              className="
                mx-auto
                mt-5
                max-w-[610px]
                rounded-[16px]
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


          <div
            className="
              mx-auto
              mt-7
              max-w-[610px]
              border-t
              border-[#ece9ef]
              pt-6
            "
          >
            <div
              className="
                grid
                gap-3
                sm:grid-cols-3
              "
            >
              <CompletedStage
                label="Verification"
              />

              <CompletedStage
                label="Admin approval"
              />

              <FinalStage
                ready={
                  accessReady
                }
              />
            </div>
          </div>
        </div>
      </section>
    </VerificationShell>
  );
}


function CompletedStage({
  label,
}: {
  label: string;
}) {
  return (
    <div
      className="
        flex
        items-center
        gap-2
        rounded-[13px]
        bg-emerald-50
        px-3
        py-3
      "
    >
      <div
        className="
          flex
          size-5
          shrink-0
          items-center
          justify-center
          rounded-full
          bg-emerald-100
          text-emerald-700
        "
      >
        <Check
          className="size-3"
          aria-hidden="true"
        />
      </div>

      <span
        className="
          text-[9px]
          font-bold
          text-emerald-800
        "
      >
        {label}
      </span>
    </div>
  );
}


function FinalStage({
  ready,
}: {
  ready: boolean;
}) {
  return (
    <div
      className={`
        flex
        items-center
        gap-2
        rounded-[13px]
        px-3
        py-3
        ${
          ready
            ? "bg-emerald-50"
            : "bg-[#f3f0ff]"
        }
      `}
    >
      <div
        className={`
          flex
          size-5
          shrink-0
          items-center
          justify-center
          rounded-full
          ${
            ready
              ? "bg-emerald-100 text-emerald-700"
              : "bg-white text-[#7062cf]"
          }
        `}
      >
        {ready ? (
          <Check
            className="size-3"
            aria-hidden="true"
          />
        ) : (
          <LoaderCircle
            className="
              size-3
              animate-spin
            "
            aria-hidden="true"
          />
        )}
      </div>

      <span
        className={`
          text-[9px]
          font-bold
          ${
            ready
              ? "text-emerald-800"
              : "text-[#7062cf]"
          }
        `}
      >
        Discord access
      </span>
    </div>
  );
}


function AccessInfo({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div
      className="
        rounded-[14px]
        border
        border-[#e8f1ec]
        bg-white
        px-4
        py-3
      "
    >
      <div
        className="
          flex
          items-center
          gap-1.5
          text-[8px]
          font-bold
          uppercase
          tracking-[0.09em]
          text-[#9ba9a2]
        "
      >
        <Check
          className="size-2.5"
          aria-hidden="true"
        />

        {label}
      </div>

      <div
        className="
          mt-1.5
          text-[11px]
          font-semibold
          text-[#435047]
        "
      >
        {value}
      </div>
    </div>
  );
}