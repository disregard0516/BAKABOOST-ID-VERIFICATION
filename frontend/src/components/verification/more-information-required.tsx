"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  ShieldAlert,
} from "lucide-react";

import {
  VerificationShell,
} from "@/components/verification/verification-shell";

import {
  apiFetch,
} from "@/lib/api";

import type {
  VerificationStatusResponse,
} from "@/types/verification";


export function MoreInformationRequired() {
  const router =
    useRouter();

  const [
    status,
    setStatus,
  ] =
    useState<VerificationStatusResponse | null>(
      null,
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


  useEffect(() => {
    let active =
      true;


    async function load(): Promise<void> {
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
      } catch {
        if (!active) {
          return;
        }

        setError(
          "We could not load the latest administrator message. You can still continue to update your verification.",
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
  }, []);


  return (
    <VerificationShell
      currentStep="identity"
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
        <header
          className="
            relative
            overflow-hidden
            border-b
            border-[#eee8dc]
            px-6
            py-10
            text-center
            sm:px-11
            sm:py-12
          "
        >
          <div
            aria-hidden="true"
            className="
              absolute
              left-1/2
              top-[-150px]
              h-[300px]
              w-[580px]
              -translate-x-1/2
              rounded-full
              bg-amber-200/20
              blur-[80px]
            "
          />

          <div className="relative">
            <div
              className="
                mx-auto
                flex
                size-[70px]
                items-center
                justify-center
                rounded-[22px]
                bg-[#fff7e8]
                text-[#ad7a16]
                shadow-[0_14px_40px_rgba(173,122,22,0.10)]
              "
            >
              <ShieldAlert
                className="size-7"
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
                text-[#9a782d]
              "
            >
              Additional action required
            </div>


            <h1
              className="
                mt-2
                text-[31px]
                font-bold
                tracking-[-0.045em]
                text-[#171522]
                sm:text-[38px]
              "
            >
              We need a little more information
            </h1>


            <p
              className="
                mx-auto
                mt-4
                max-w-[540px]
                text-[12px]
                leading-6
                text-[#777486]
                sm:text-sm
              "
            >
              An authorized administrator reviewed your submission and needs corrected or additional information before making a final decision.
            </p>
          </div>
        </header>


        <div
          className="
            mx-auto
            max-w-[620px]
            px-6
            py-7
            sm:px-8
            sm:py-9
          "
        >
          <div
            className="
              grid
              gap-3
              sm:grid-cols-3
            "
          >
            <ProgressItem
              label="Submitted"
              complete
            />

            <ProgressItem
              label="Admin review"
              complete
            />

            <ProgressItem
              label="Update needed"
              active
            />
          </div>


          {loading ? (
            <div
              className="
                mt-6
                flex
                min-h-[130px]
                items-center
                justify-center
                rounded-[20px]
                border
                border-[#ece8df]
                bg-[#fffdf8]
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-2
                  text-[11px]
                  font-semibold
                  text-[#94752e]
                "
              >
                <LoaderCircle
                  className="
                    size-4
                    animate-spin
                  "
                  aria-hidden="true"
                />

                Loading review details
              </div>
            </div>
          ) : status?.user_message ? (
            <div
              className="
                mt-6
                rounded-[20px]
                border
                border-[#ece5cf]
                bg-[linear-gradient(145deg,#fffdf8,#fff9ec)]
                p-5
                sm:p-6
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
                    text-[#a8771c]
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
                      text-[#94752e]
                    "
                  >
                    Administrator message
                  </div>

                  <p
                    className="
                      mt-2
                      whitespace-pre-wrap
                      text-[12px]
                      leading-6
                      text-[#625d50]
                    "
                  >
                    {status.user_message}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="
                mt-6
                rounded-[20px]
                border
                border-[#ebe8f0]
                bg-[#faf9fd]
                p-5
              "
            >
              <p
                className="
                  text-[11px]
                  leading-5
                  text-[#807c8b]
                "
              >
                No additional administrator message is available. Open your verification form to review and update the information requested.
              </p>
            </div>
          )}


          {error && (
            <div
              role="alert"
              className="
                mt-4
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
              mt-5
              flex
              items-start
              gap-3
              rounded-[18px]
              border
              border-[#ebe8f0]
              bg-[#faf9fd]
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

            <div>
              <div
                className="
                  text-[11px]
                  font-bold
                  text-[#45404d]
                "
              >
                Discord access is still locked
              </div>

              <p
                className="
                  mt-1
                  text-[10px]
                  leading-5
                  text-[#827e8d]
                "
              >
                Updating your submission does not grant server access. The new information must return to review and be explicitly approved.
              </p>
            </div>
          </div>


          <button
            type="button"
            onClick={() => {
              router.push(
                "/verification/identity",
              );
            }}
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
              bg-[#6252ed]
              px-6
              text-sm
              font-bold
              text-white
              shadow-[0_14px_38px_rgba(88,70,219,0.27)]
              transition
              hover:-translate-y-0.5
              hover:bg-[#5747df]
            "
          >
            Update verification

            <ArrowRight
              className="
                size-4
                transition-transform
                group-hover:translate-x-1
              "
              aria-hidden="true"
            />
          </button>


          <p
            className="
              mt-4
              text-center
              text-[9px]
              leading-5
              text-[#aaa5b3]
            "
          >
            Your existing request remains bound to the same authenticated Discord identity.
          </p>
        </div>
      </section>
    </VerificationShell>
  );
}


function ProgressItem({
  label,
  complete = false,
  active = false,
}: {
  label: string;
  complete?: boolean;
  active?: boolean;
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
          complete
            ? "bg-emerald-50"
            : active
              ? "bg-[#fff7e8]"
              : "bg-[#f5f3f7]"
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
            complete
              ? "bg-emerald-100 text-emerald-700"
              : active
                ? "bg-white text-[#ad7a16]"
                : "bg-white text-[#aaa5b3]"
          }
        `}
      >
        {complete ? (
          <CheckCircle2
            className="size-3"
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
      </div>

      <span
        className={`
          text-[9px]
          font-bold
          ${
            complete
              ? "text-emerald-800"
              : active
                ? "text-[#906d26]"
                : "text-[#9994a1]"
          }
        `}
      >
        {label}
      </span>
    </div>
  );
}