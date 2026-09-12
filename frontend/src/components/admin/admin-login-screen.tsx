"use client";

import type { ReactNode } from "react";

import {
  ArrowRight,
  BadgeCheck,
  Check,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  ScanFace,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";


export function AdminLoginScreen() {
  return (
    <main
      className="
        relative
        min-h-screen
        overflow-hidden
        bg-[#05070B]
        px-4
        py-5
        text-white
        sm:px-7
        sm:py-7
      "
    >
      {/* Background */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          bg-[radial-gradient(circle_at_50%_-10%,rgba(124,58,237,0.15),transparent_34%)]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          bg-[linear-gradient(to_right,rgba(255,255,255,0.022)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.022)_1px,transparent_1px)]
          bg-[size:48px_48px]
          [mask-image:linear-gradient(to_bottom,black,transparent_92%)]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -right-52
          bottom-[-260px]
          size-[620px]
          rounded-full
          bg-sky-500/[0.07]
          blur-[150px]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -left-52
          top-[45%]
          size-[520px]
          rounded-full
          bg-violet-500/[0.07]
          blur-[150px]
        "
      />


      {/* Header */}

      <header
        className="
          relative
          z-20
          mx-auto
          flex
          w-full
          max-w-[1220px]
          items-center
          justify-between
        "
      >
        <div className="flex items-center gap-3">
          <div
            className="
              flex
              size-10
              items-center
              justify-center
              rounded-[12px]
              bg-white
              text-[#090B10]
              shadow-[0_10px_35px_rgba(255,255,255,0.07)]
            "
          >
            <Fingerprint
              className="size-5"
              strokeWidth={2.1}
              aria-hidden="true"
            />
          </div>

          <div>
            <div
              className="
                text-[17px]
                font-black
                tracking-[-0.045em]
                text-white
              "
            >
              SCANLY
            </div>

            <div
              className="
                mt-0.5
                text-[8px]
                font-semibold
                uppercase
                tracking-[0.18em]
                text-slate-600
              "
            >
              Verification Administration
            </div>
          </div>
        </div>


        <div
          className="
            hidden
            items-center
            gap-2
            rounded-full
            border
            border-white/[0.07]
            bg-white/[0.025]
            px-3.5
            py-2
            text-[10px]
            font-semibold
            text-slate-400
            backdrop-blur-xl
            sm:flex
          "
        >
          <span
            aria-hidden="true"
            className="
              size-1.5
              rounded-full
              bg-emerald-400
              shadow-[0_0_10px_rgba(52,211,153,0.65)]
            "
          />

          Secure administrator portal
        </div>
      </header>


      {/* Main */}

      <div
        className="
          relative
          z-10
          mx-auto
          flex
          min-h-[calc(100vh-70px)]
          w-full
          max-w-[1220px]
          items-center
          justify-center
          py-8
          sm:py-12
        "
      >
        <div
          className="
            grid
            w-full
            max-w-[1030px]
            overflow-hidden
            rounded-[30px]
            border
            border-white/[0.075]
            bg-[#090D15]/90
            shadow-[0_45px_150px_rgba(0,0,0,0.58)]
            backdrop-blur-2xl
            lg:grid-cols-[0.92fr_1.08fr]
          "
        >
          {/* Left panel */}

          <aside
            className="
              relative
              hidden
              min-h-[620px]
              overflow-hidden
              border-r
              border-white/[0.06]
              bg-[linear-gradient(145deg,#111827_0%,#0C1220_48%,#080C14_100%)]
              p-10
              lg:block
              xl:p-12
            "
          >
            <div
              aria-hidden="true"
              className="
                absolute
                -left-24
                -top-24
                size-[330px]
                rounded-full
                bg-violet-500/[0.16]
                blur-[105px]
              "
            />

            <div
              aria-hidden="true"
              className="
                absolute
                -bottom-28
                -right-28
                size-[320px]
                rounded-full
                bg-blue-500/[0.08]
                blur-[100px]
              "
            />


            <div
              className="
                relative
                z-10
                flex
                h-full
                flex-col
                justify-between
              "
            >
              <div>
                <div
                  className="
                    inline-flex
                    items-center
                    gap-2
                    rounded-full
                    border
                    border-violet-400/[0.14]
                    bg-violet-400/[0.06]
                    px-3
                    py-1.5
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-[0.13em]
                    text-violet-300
                  "
                >
                  <Sparkles
                    className="size-3"
                    aria-hidden="true"
                  />

                  Verification operations
                </div>


                <h2
                  className="
                    mt-7
                    max-w-[360px]
                    text-[39px]
                    font-extrabold
                    leading-[1.04]
                    tracking-[-0.055em]
                    text-white
                  "
                >
                  Verify people.
                  <br />

                  <span className="text-slate-400">
                    Protect access.
                  </span>
                </h2>


                <p
                  className="
                    mt-5
                    max-w-[355px]
                    text-[12px]
                    leading-[1.9]
                    text-slate-400
                  "
                >
                  Manage SCANLY verification requests,
                  inspect submitted evidence, review account
                  identity and control access after a final
                  administrator decision.
                </p>


                <div
                  className="
                    mt-8
                    grid
                    grid-cols-2
                    gap-3
                  "
                >
                  <MiniCapability
                    icon={
                      <ScanFace
                        className="size-4"
                        aria-hidden="true"
                      />
                    }
                    title="Identity review"
                    description="Review submitted verification evidence."
                  />

                  <MiniCapability
                    icon={
                      <UserCheck
                        className="size-4"
                        aria-hidden="true"
                      />
                    }
                    title="Access control"
                    description="Release access only after approval."
                  />
                </div>
              </div>


              <div>
                <div
                  className="
                    mb-4
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-[0.15em]
                    text-slate-600
                  "
                >
                  Administrator protection
                </div>

                <div className="space-y-3">
                  <SecurityPoint>
                    Cloudflare Access protected sign-in
                  </SecurityPoint>

                  <SecurityPoint>
                    MFA-protected administrator access
                  </SecurityPoint>

                  <SecurityPoint>
                    Role-based and auditable review actions
                  </SecurityPoint>
                </div>
              </div>
            </div>
          </aside>


          {/* Authentication panel */}

          <section
            className="
              relative
              flex
              min-h-[570px]
              items-center
              p-6
              sm:p-10
              lg:min-h-[620px]
              lg:p-12
              xl:p-14
            "
          >
            <div
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                -right-24
                -top-24
                size-[270px]
                rounded-full
                bg-violet-500/[0.06]
                blur-[90px]
              "
            />

            <div
              className="
                relative
                mx-auto
                w-full
                max-w-[420px]
              "
            >
              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-4
                "
              >
                <div
                  className="
                    flex
                    size-[54px]
                    items-center
                    justify-center
                    rounded-[17px]
                    border
                    border-violet-400/[0.14]
                    bg-violet-500/[0.09]
                    text-violet-300
                    shadow-[0_15px_45px_rgba(124,58,237,0.10)]
                  "
                >
                  <KeyRound
                    className="size-[22px]"
                    strokeWidth={1.9}
                    aria-hidden="true"
                  />
                </div>


                <div
                  className="
                    inline-flex
                    items-center
                    gap-2
                    rounded-full
                    border
                    border-emerald-400/[0.13]
                    bg-emerald-400/[0.05]
                    px-3
                    py-1.5
                    text-[9px]
                    font-bold
                    text-emerald-300
                  "
                >
                  <BadgeCheck
                    className="size-3.5"
                    aria-hidden="true"
                  />

                  Protected sign-in
                </div>
              </div>


              <div className="mt-9">
                <div
                  className="
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-[0.17em]
                    text-violet-400
                  "
                >
                  SCANLY Admin
                </div>

                <h1
                  className="
                    mt-3
                    text-[34px]
                    font-extrabold
                    leading-[1.07]
                    tracking-[-0.055em]
                    text-white
                    sm:text-[40px]
                  "
                >
                  Welcome back.
                  <br />

                  <span className="text-slate-400">
                    Continue to review.
                  </span>
                </h1>

                <p
                  className="
                    mt-5
                    max-w-[390px]
                    text-[12px]
                    leading-[1.85]
                    text-slate-400
                  "
                >
                  Administrator access is protected by
                  Cloudflare Access and restricted to approved
                  identities. Continue to enter the SCANLY
                  verification workspace.
                </p>
              </div>


              {/*
               * Cloudflare Access protects the /admin boundary.
               *
               * This link intentionally uses normal browser
               * navigation. It never requests, reads, stores,
               * or exposes the Cloudflare Access JWT to
               * client-side JavaScript.
               */}
              <a
                href="/admin"
                className="
                  group
                  relative
                  mt-8
                  inline-flex
                  min-h-[54px]
                  w-full
                  items-center
                  justify-center
                  gap-3
                  overflow-hidden
                  rounded-[15px]
                  bg-violet-500
                  px-5
                  text-[12px]
                  font-bold
                  text-white
                  shadow-[0_15px_40px_rgba(124,58,237,0.25)]
                  transition-all
                  duration-300
                  hover:-translate-y-0.5
                  hover:bg-violet-400
                  hover:shadow-[0_20px_50px_rgba(124,58,237,0.32)]
                  active:translate-y-0
                  active:scale-[0.985]
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-violet-400
                  focus-visible:ring-offset-2
                  focus-visible:ring-offset-[#090D15]
                "
              >
                <span
                  aria-hidden="true"
                  className="
                    absolute
                    inset-y-0
                    left-[-35%]
                    w-[30%]
                    -skew-x-12
                    bg-white/[0.13]
                    opacity-0
                    blur
                    transition-all
                    duration-700
                    group-hover:left-[115%]
                    group-hover:opacity-100
                  "
                />

                <KeyRound
                  className="relative size-4"
                  strokeWidth={2}
                  aria-hidden="true"
                />

                <span className="relative">
                  Continue to SCANLY
                </span>

                <ArrowRight
                  className="
                    relative
                    size-4
                    transition-transform
                    duration-300
                    group-hover:translate-x-1
                  "
                  aria-hidden="true"
                />
              </a>


              <div
                className="
                  mt-5
                  flex
                  items-center
                  justify-center
                  gap-2
                  text-center
                  text-[9px]
                  font-medium
                  text-slate-600
                "
              >
                <ShieldCheck
                  className="size-3"
                  aria-hidden="true"
                />

                Authentication is enforced by the protected
                administrator access boundary
              </div>


              <div
                className="
                  mt-7
                  rounded-[17px]
                  border
                  border-white/[0.055]
                  bg-white/[0.022]
                  p-4
                "
              >
                <div className="flex items-start gap-3">
                  <div
                    className="
                      mt-0.5
                      flex
                      size-8
                      shrink-0
                      items-center
                      justify-center
                      rounded-[10px]
                      bg-white/[0.035]
                      text-slate-500
                    "
                  >
                    <LockKeyhole
                      className="size-4"
                      aria-hidden="true"
                    />
                  </div>

                  <div>
                    <div
                      className="
                        text-[10px]
                        font-semibold
                        text-slate-300
                      "
                    >
                      Authorized administrators only
                    </div>

                    <p
                      className="
                        mt-1
                        text-[9px]
                        leading-[1.7]
                        text-slate-600
                      "
                    >
                      Verification evidence and review
                      controls are restricted to approved
                      administrator identities. Sensitive
                      operations may require additional
                      authentication.
                    </p>
                  </div>
                </div>
              </div>


              <div
                className="
                  mt-7
                  border-t
                  border-white/[0.05]
                  pt-5
                  text-center
                  text-[9px]
                  leading-5
                  text-slate-600
                "
              >
                SCANLY Identity Verification

                <span
                  className="
                    mx-2
                    text-slate-800
                  "
                >
                  &bull;
                </span>

                Secure administration
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}


function SecurityPoint({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div
      className="
        flex
        items-center
        gap-3
        rounded-[13px]
        border
        border-white/[0.045]
        bg-white/[0.018]
        px-3
        py-2.5
        text-[10px]
        font-medium
        text-slate-300
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
          bg-violet-500/[0.09]
          text-violet-300
        "
      >
        <Check
          className="size-3.5"
          strokeWidth={2.2}
          aria-hidden="true"
        />
      </div>

      <span>
        {children}
      </span>
    </div>
  );
}


function MiniCapability({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      className="
        rounded-[15px]
        border
        border-white/[0.05]
        bg-white/[0.02]
        p-3.5
      "
    >
      <div
        className="
          flex
          size-8
          items-center
          justify-center
          rounded-[10px]
          bg-violet-500/[0.08]
          text-violet-300
        "
      >
        {icon}
      </div>

      <div
        className="
          mt-3
          text-[10px]
          font-semibold
          text-slate-200
        "
      >
        {title}
      </div>

      <p
        className="
          mt-1
          text-[8px]
          leading-[1.6]
          text-slate-600
        "
      >
        {description}
      </p>
    </div>
  );
}