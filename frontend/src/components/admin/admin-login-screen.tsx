"use client";

import {
  ArrowRight,
  BadgeCheck,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export function AdminLoginScreen() {
  function startAdminLogin() {
    /*
     * This is intentionally a provider hook.
     *
     * When we connect Auth0 / Clerk / WorkOS /
     * another OIDC provider, this button starts
     * the provider's secure authentication flow.
     *
     * Do NOT build our own admin password form.
     */
    alert(
      "Admin identity provider is not connected yet.",
    );
  }

  return (
    <main
      className="
        relative
        min-h-screen
        overflow-hidden
        bg-[#070B14]
        px-5
        py-8
        text-white
        sm:px-8
      "
    >
      {/* Ambient background */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          bg-[linear-gradient(to_right,rgba(0, 0, 0, 0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(254, 248, 248, 0.03)_1px,transparent_1px)]
          bg-[size:44px_44px]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          left-1/2
          top-[-280px]
          h-[620px]
          w-[900px]
          -translate-x-1/2
          rounded-full
          bg-violet-500/15
          blur-[130px]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          bottom-[-220px]
          right-[-160px]
          size-[440px]
          rounded-full
          bg-sky-500/10
          blur-[110px]
        "
      />

      {/* Top brand */}
      <header
        className="
          relative
          z-20
          mx-auto
          flex
          w-full
          max-w-[1200px]
          items-center
          justify-between
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
              size-9
              items-center
              justify-center
              rounded-xl
              bg-white
              text-[#111827]
              shadow-[0_8px_30px_rgba(255,255,255,0.08)]
            "
          >
            <ShieldCheck
              className="size-[18px]"
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
              BAKABOOST
            </div>

            <div
              className="
                text-[9px]
                font-medium
                uppercase
                tracking-[0.12em]
                text-slate-500
              "
            >
              Admin console
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
            bg-white/[0.03]
            px-3
            py-2
            text-[10px]
            font-semibold
            text-slate-400
            sm:flex
          "
        >
          <LockKeyhole
            className="size-3.5"
            aria-hidden="true"
          />

          Restricted access
        </div>
      </header>

      {/* Main login content */}
      <div
        className="
          relative
          z-10
          mx-auto
          flex
          min-h-[calc(100vh-90px)]
          w-full
          max-w-[1200px]
          items-center
          justify-center
          py-10
        "
      >
        <div
          className="
            grid
            w-full
            max-w-[980px]
            overflow-hidden
            rounded-[30px]
            border
            border-white/[0.08]
            bg-[#0B1220]/90
            shadow-[0_35px_120px_rgba(0,0,0,0.45)]
            backdrop-blur-2xl
            lg:grid-cols-[0.9fr_1.1fr]
          "
        >
          {/* Left information panel */}
          <div
            className="
              relative
              hidden
              overflow-hidden
              border-r
              border-white/[0.06]
              bg-gradient-to-br
              from-[#111A2F]
              via-[#0E1526]
              to-[#0A0F1C]
              p-10
              lg:block
            "
          >
            <div
              aria-hidden="true"
              className="
                absolute
                -left-20
                -top-16
                size-[260px]
                rounded-full
                bg-violet-500/15
                blur-[80px]
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
                    border-violet-400/15
                    bg-violet-400/[0.06]
                    px-3
                    py-1.5
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-[0.12em]
                    text-violet-300
                  "
                >
                  <Sparkles
                    className="size-3"
                    aria-hidden="true"
                  />

                  Protected workspace
                </div>

                <h2
                  className="
                    mt-6
                    max-w-[320px]
                    text-[36px]
                    font-extrabold
                    leading-[1.05]
                    tracking-[-0.05em]
                    text-white
                  "
                >
                  Secure review.
                  <br />
                  Controlled access.
                </h2>

                <p
                  className="
                    mt-5
                    max-w-[320px]
                    text-[12px]
                    leading-6
                    text-slate-400
                  "
                >
                  The administrator console is reserved
                  for authorized reviewers managing
                  verification requests, evidence and
                  final access decisions.
                </p>
              </div>

              <div
                className="
                  space-y-3
                "
              >
                <SecurityPoint>
                  Strong administrator authentication
                </SecurityPoint>

                <SecurityPoint>
                  MFA and recent re-authentication
                </SecurityPoint>

                <SecurityPoint>
                  Sensitive actions remain auditable
                </SecurityPoint>
              </div>
            </div>
          </div>

          {/* Login panel */}
          <section
            className="
              relative
              p-7
              sm:p-10
              lg:p-12
            "
          >
            <div
              className="
                mx-auto
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
                    size-12
                    items-center
                    justify-center
                    rounded-2xl
                    border
                    border-violet-400/15
                    bg-violet-500/10
                    text-violet-300
                    shadow-[0_12px_35px_rgba(139,92,246,0.10)]
                  "
                >
                  <KeyRound
                    className="size-5"
                    aria-hidden="true"
                  />
                </div>

                <div
                  className="
                    flex
                    items-center
                    gap-2
                    rounded-full
                    border
                    border-emerald-400/15
                    bg-emerald-400/[0.06]
                    px-3
                    py-1.5
                    text-[9px]
                    font-semibold
                    text-emerald-300
                  "
                >
                  <BadgeCheck
                    className="size-3"
                    aria-hidden="true"
                  />

                  Secure entry
                </div>
              </div>

              <div
                className="
                  mt-8
                "
              >
                <div
                  className="
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.14em]
                    text-violet-400
                  "
                >
                  Administrator authentication
                </div>

                <h1
                  className="
                    mt-3
                    text-[34px]
                    font-extrabold
                    leading-tight
                    tracking-[-0.05em]
                    text-white
                    sm:text-[38px]
                  "
                >
                  Sign in to the
                  <br />
                  admin workspace
                </h1>

                <p
                  className="
                    mt-4
                    max-w-[380px]
                    text-[12px]
                    leading-6
                    text-slate-400
                  "
                >
                  Continue through your authorized
                  identity provider to review and manage
                  verification requests.
                </p>
              </div>

              <button
                type="button"
                onClick={startAdminLogin}
                className="
                  group
                  mt-8
                  inline-flex
                  min-h-12
                  w-full
                  items-center
                  justify-center
                  gap-3
                  rounded-[14px]
                  bg-violet-500
                  px-5
                  text-[12px]
                  font-bold
                  text-white
                  shadow-[0_14px_34px_rgba(139,92,246,0.24)]
                  transition-all
                  duration-300
                  hover:-translate-y-0.5
                  hover:bg-violet-400
                  hover:shadow-[0_18px_40px_rgba(139,92,246,0.30)]
                  active:translate-y-0
                  active:scale-[0.98]
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-violet-400
                  focus-visible:ring-offset-2
                  focus-visible:ring-offset-[#0B1220]
                "
              >
                <KeyRound
                  className="size-4"
                  aria-hidden="true"
                />

                Continue securely

                <ArrowRight
                  className="
                    size-4
                    transition-transform
                    duration-300
                    group-hover:translate-x-1
                  "
                  aria-hidden="true"
                />
              </button>

              <div
                className="
                  mt-6
                  rounded-[16px]
                  border
                  border-white/[0.06]
                  bg-white/[0.025]
                  p-4
                "
              >
                <div
                  className="
                    flex
                    items-start
                    gap-3
                  "
                >
                  <LockKeyhole
                    className="
                      mt-0.5
                      size-4
                      shrink-0
                      text-slate-500
                    "
                    aria-hidden="true"
                  />

                  <p
                    className="
                      text-[10px]
                      leading-5
                      text-slate-500
                    "
                  >
                    Sensitive evidence access can require
                    MFA and recent re-authentication. All
                    sensitive review actions are auditable.
                  </p>
                </div>
              </div>

              <div
                className="
                  mt-6
                  border-t
                  border-white/[0.05]
                  pt-5
                  text-center
                  text-[9px]
                  leading-5
                  text-slate-600
                "
              >
                Access is limited to authorized staff.
                Unauthorized attempts may be recorded.
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
  children: React.ReactNode;
}) {
  return (
    <div
      className="
        flex
        items-center
        gap-3
        text-[11px]
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
          bg-violet-500/10
          text-violet-300
        "
      >
        <ShieldCheck
          className="size-3.5"
          aria-hidden="true"
        />
      </div>

      {children}
    </div>
  );
}