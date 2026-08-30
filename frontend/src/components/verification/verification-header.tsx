"use client";

import {
  CircleHelp,
  LockKeyhole,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  useState,
} from "react";

export function VerificationHeader() {
  const [
    helpOpen,
    setHelpOpen,
  ] =
    useState(false);

  return (
    <>
      <header
        className="
          sticky
          top-0
          z-40
          border-b
          border-slate-200/80
          bg-white/90
          backdrop-blur-xl
          supports-[backdrop-filter]:bg-white/80
        "
      >
        <div
          className="
            mx-auto
            flex
            h-[72px]
            w-full
            max-w-[1280px]
            items-center
            justify-between
            gap-4
            px-4
            sm:px-6
            lg:px-8
          "
        >
          {/* Brand */}
          <div
            className="
              flex
              min-w-0
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
                rounded-lg
                bg-slate-950
                shadow-sm
              "
              aria-hidden="true"
            >
              <ShieldCheck
                className="
                  size-[18px]
                  text-white
                "
              />
            </div>

            <div
              className="
                min-w-0
              "
            >
              <div
                className="
                  truncate
                  text-[18px]
                  font-black
                  tracking-[-0.045em]
                  text-black
                  sm:text-[20px]
                "
              >
                BAKABOOST
              </div>

              <div
                className="
                  hidden
                  text-[10px]
                  font-medium
                  tracking-[0.01em]
                  text-slate-400
                  sm:block
                "
              >
                Identity verification
              </div>
            </div>
          </div>

          {/* Header actions */}
          <div
            className="
              flex
              shrink-0
              items-center
              gap-2
              sm:gap-3
            "
          >
            {/* Security status */}
            <div
              className="
                hidden
                items-center
                gap-2
                rounded-lg
                border
                border-slate-200
                bg-slate-50
                px-3
                py-2
                text-[11px]
                font-medium
                text-slate-600
                md:flex
              "
            >
              <span
                className="
                  relative
                  flex
                  size-2
                "
                aria-hidden="true"
              >
                <span
                  className="
                    absolute
                    inline-flex
                    h-full
                    w-full
                    animate-ping
                    rounded-full
                    bg-emerald-400
                    opacity-40
                  "
                />

                <span
                  className="
                    relative
                    inline-flex
                    size-2
                    rounded-full
                    bg-emerald-500
                  "
                />
              </span>

              Secure session
            </div>

            <div
              className="
                hidden
                h-6
                w-px
                bg-slate-200
                md:block
              "
              aria-hidden="true"
            />

            <button
              type="button"
              onClick={() => {
                setHelpOpen(
                  true,
                );
              }}
              className="
                group
                inline-flex
                min-h-9
                items-center
                justify-center
                gap-2
                rounded-lg
                border
                border-slate-200
                bg-white
                px-3
                text-xs
                font-semibold
                text-slate-600
                shadow-sm
                transition-all
                duration-200
                hover:-translate-y-0.5
                hover:border-blue-200
                hover:bg-blue-50/60
                hover:text-blue-700
                hover:shadow-md
                active:translate-y-0
                active:scale-[0.97]
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-blue-500
                focus-visible:ring-offset-2
              "
              aria-haspopup="dialog"
              aria-expanded={
                helpOpen
              }
            >
              <CircleHelp
                className="
                  size-4
                  transition-transform
                  duration-200
                  group-hover:scale-110
                "
                aria-hidden="true"
              />

              <span
                className="
                  hidden
                  sm:inline
                "
              >
                Need help?
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Help panel */}
      {helpOpen && (
        <div
          className="
            fixed
            inset-0
            z-[150]
            flex
            items-center
            justify-center
            bg-slate-950/35
            p-4
            backdrop-blur-[3px]
          "
          role="dialog"
          aria-modal="true"
          aria-labelledby="verification-help-title"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setHelpOpen(
                false,
              );
            }
          }}
        >
          <div
            className="
              w-full
              max-w-[420px]
              overflow-hidden
              rounded-2xl
              border
              border-slate-200
              bg-white
              shadow-[0_24px_80px_rgba(15,23,42,0.18)]
            "
          >
            <div
              className="
                flex
                items-start
                justify-between
                gap-4
                border-b
                border-slate-100
                px-5
                py-4
              "
            >
              <div
                className="
                  flex
                  items-start
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
                    rounded-lg
                    bg-blue-50
                    text-blue-600
                  "
                >
                  <CircleHelp
                    className="size-4"
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <h2
                    id="verification-help-title"
                    className="
                      text-sm
                      font-semibold
                      text-slate-950
                    "
                  >
                    Verification help
                  </h2>

                  <p
                    className="
                      mt-1
                      text-xs
                      leading-5
                      text-slate-500
                    "
                  >
                    Having trouble completing
                    verification?
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setHelpOpen(
                    false,
                  );
                }}
                className="
                  flex
                  size-8
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  text-slate-400
                  transition
                  hover:bg-slate-100
                  hover:text-slate-700
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-blue-500
                  focus-visible:ring-offset-2
                "
                aria-label="Close help"
              >
                <X
                  className="size-4"
                  aria-hidden="true"
                />
              </button>
            </div>

            <div
              className="
                space-y-4
                p-5
              "
            >
              <HelpItem
                number="1"
                title="Check your account"
              >
                Make sure you signed in with the
                Discord account that received this
                verification request.
              </HelpItem>

              <HelpItem
                number="2"
                title="Allow camera access"
              >
                For selfie or live capture, allow
                camera permission when your browser
                asks for it.
              </HelpItem>

              <HelpItem
                number="3"
                title="Use clear evidence"
              >
                Keep documents fully visible and
                readable, and use clear lighting for
                face capture.
              </HelpItem>

              <div
                className="
                  flex
                  items-start
                  gap-2.5
                  rounded-lg
                  border
                  border-blue-100
                  bg-blue-50/70
                  p-3
                "
              >
                <LockKeyhole
                  className="
                    mt-0.5
                    size-4
                    shrink-0
                    text-blue-600
                  "
                  aria-hidden="true"
                />

                <p
                  className="
                    text-[11px]
                    leading-5
                    text-slate-600
                  "
                >
                  For your security, submit
                  verification evidence only through
                  this verification portal.
                </p>
              </div>
            </div>

            <div
              className="
                border-t
                border-slate-100
                bg-slate-50/70
                p-4
              "
            >
              <button
                type="button"
                onClick={() => {
                  setHelpOpen(
                    false,
                  );
                }}
                className="
                  inline-flex
                  min-h-10
                  w-full
                  items-center
                  justify-center
                  rounded-lg
                  bg-blue-600
                  px-4
                  text-xs
                  font-semibold
                  text-white
                  shadow-sm
                  transition-all
                  duration-200
                  hover:-translate-y-0.5
                  hover:bg-blue-700
                  hover:shadow-md
                  active:translate-y-0
                  active:scale-[0.98]
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-blue-500
                  focus-visible:ring-offset-2
                "
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function HelpItem({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="
        flex
        items-start
        gap-3
      "
    >
      <div
        className="
          flex
          size-6
          shrink-0
          items-center
          justify-center
          rounded-full
          bg-slate-100
          text-[10px]
          font-bold
          text-slate-600
        "
      >
        {number}
      </div>

      <div>
        <div
          className="
            text-xs
            font-semibold
            text-slate-900
          "
        >
          {title}
        </div>

        <p
          className="
            mt-1
            text-[11px]
            leading-5
            text-slate-500
          "
        >
          {children}
        </p>
      </div>
    </div>
  );
}