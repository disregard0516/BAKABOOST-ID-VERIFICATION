"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  ArrowRight,
  BadgeCheck,
  Fingerprint,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  TriangleAlert,
  UserCheck,
} from "lucide-react";

import {
  acceptAdminInvitation,
  AdminApiError,
  ensureAdminSession,
} from "@/lib/admin-api";

import type {
  AcceptedAdminInvitationResponse,
  AdminRole,
} from "@/types/admin-team";


type InvitationState =
  | "loading"
  | "ready"
  | "accepting"
  | "accepted"
  | "invalid"
  | "error";


function roleLabel(
  role: AdminRole,
): string {
  switch (role) {
    case "super_admin":
      return "Super Admin";

    case "admin":
      return "Administrator";

    case "reviewer":
      return "Reviewer";
  }
}


export function AdminInvitationScreen() {
  const [
    invitationToken,
    setInvitationToken,
  ] = useState<string | null>(null);

  const [
    invitationState,
    setInvitationState,
  ] = useState<InvitationState>("loading");

  const [
    acceptedInvitation,
    setAcceptedInvitation,
  ] = useState<
    AcceptedAdminInvitationResponse | null
  >(null);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(null);

  const [
    sessionReady,
    setSessionReady,
  ] = useState(false);


  useEffect(() => {
    /*
     * Keep the one-time token in the URL until acceptance
     * succeeds.
     *
     * The token is removed from the address bar immediately
     * after successful acceptance.
     */
    const url = new URL(window.location.href);

    const rawToken =
      url.searchParams
        .get("token")
        ?.trim() ?? "";

    let active = true;

    queueMicrotask(() => {
      if (!active) {
        return;
      }

      if (
        rawToken.length < 32 ||
        rawToken.length > 1024
      ) {
        setInvitationToken(null);
        setErrorMessage(
          "This administrator invitation link is invalid or incomplete.",
        );
        setInvitationState("invalid");
        return;
      }

      setInvitationToken(rawToken);
      setInvitationState("ready");
    });

    return () => {
      active = false;
    };
  }, []);


  async function handleAcceptInvitation():
    Promise<void> {
    if (
      !invitationToken ||
      invitationState !== "ready"
    ) {
      return;
    }

    setErrorMessage(null);
    setInvitationState("accepting");

    let accepted:
      AcceptedAdminInvitationResponse;

    try {
      accepted =
        await acceptAdminInvitation(
          invitationToken,
        );
    } catch (error: unknown) {
      setInvitationToken(null);

      if (error instanceof AdminApiError) {
        setErrorMessage(
          error.message ||
            "Administrator invitation could not be accepted.",
        );
      } else {
        setErrorMessage(
          "Administrator invitation could not be accepted.",
        );
      }

      setInvitationState("error");

      return;
    }

    /*
     * The invitation is now consumed.
     *
     * Remove the one-time token from the visible URL only now,
     * after the backend has successfully accepted it.
     */
    const acceptedUrl =
      new URL(window.location.href);

    acceptedUrl.searchParams.delete("token");

    window.history.replaceState(
      window.history.state,
      "",
      `${acceptedUrl.pathname}${acceptedUrl.search}${acceptedUrl.hash}`,
    );

    setInvitationToken(null);
    setAcceptedInvitation(accepted);
    setInvitationState("accepted");

    try {
      await ensureAdminSession();
      setSessionReady(true);
    } catch {
      /*
       * Invitation acceptance already succeeded.
       *
       * Do not incorrectly report the invitation as failed if
       * automatic session establishment encounters a separate
       * problem. The administrator can continue through the
       * normal protected /admin boundary.
       */
      setSessionReady(false);
    }
  }


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
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          bg-[radial-gradient(circle_at_50%_-10%,rgba(124,58,237,0.16),transparent_34%)]
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
          top-[42%]
          size-[520px]
          rounded-full
          bg-violet-500/[0.08]
          blur-[150px]
        "
      />


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
              Administrator Enrollment
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

          Protected administrator enrollment
        </div>
      </header>


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
          py-10
          sm:py-14
        "
      >
        <section
          className="
            w-full
            max-w-[610px]
            overflow-hidden
            rounded-[30px]
            border
            border-white/[0.075]
            bg-[#090D15]/90
            shadow-[0_45px_150px_rgba(0,0,0,0.58)]
            backdrop-blur-2xl
          "
        >
          <div
            className="
              border-b
              border-white/[0.06]
              bg-[linear-gradient(145deg,#111827_0%,#0C1220_48%,#080C14_100%)]
              px-6
              py-7
              sm:px-9
              sm:py-9
            "
          >
            <div
              className="
                flex
                size-12
                items-center
                justify-center
                rounded-[15px]
                border
                border-violet-400/[0.15]
                bg-violet-400/[0.08]
                text-violet-300
              "
            >
              <UserCheck
                className="size-5"
                strokeWidth={2}
                aria-hidden="true"
              />
            </div>

            <p
              className="
                mt-6
                text-[9px]
                font-bold
                uppercase
                tracking-[0.2em]
                text-violet-300
              "
            >
              Team &amp; Access
            </p>

            <h1
              className="
                mt-2
                text-[30px]
                font-extrabold
                leading-[1.08]
                tracking-[-0.05em]
                sm:text-[36px]
              "
            >
              Administrator invitation.
            </h1>

            <p
              className="
                mt-4
                max-w-[500px]
                text-[12px]
                leading-[1.8]
                text-slate-400
              "
            >
              This invitation is bound to the authenticated
              identity that received it. Accepting it activates
              your assigned SCANLY administrator role.
            </p>
          </div>


          <div className="px-6 py-7 sm:px-9 sm:py-9">
            {invitationState === "loading" && (
              <div className="py-8 text-center">
                <LoaderCircle
                  className="
                    mx-auto
                    size-7
                    animate-spin
                    text-violet-300
                  "
                  aria-hidden="true"
                />

                <p
                  className="
                    mt-4
                    text-[12px]
                    font-semibold
                    text-slate-300
                  "
                >
                  Preparing secure invitation…
                </p>
              </div>
            )}


            {invitationState === "ready" && (
              <>
                <div
                  className="
                    rounded-[18px]
                    border
                    border-white/[0.07]
                    bg-white/[0.025]
                    p-5
                  "
                >
                  <div className="flex gap-4">
                    <div
                      className="
                        flex
                        size-10
                        shrink-0
                        items-center
                        justify-center
                        rounded-[12px]
                        bg-emerald-400/[0.08]
                        text-emerald-300
                      "
                    >
                      <ShieldCheck
                        className="size-5"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </div>

                    <div>
                      <p
                        className="
                          text-[12px]
                          font-bold
                          text-white
                        "
                      >
                        Identity protected
                      </p>

                      <p
                        className="
                          mt-1.5
                          text-[10px]
                          leading-[1.7]
                          text-slate-500
                        "
                      >
                        Your external identity is verified at
                        the protected access boundary. The
                        one-time invitation token has also been
                        removed from the visible address bar.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAcceptInvitation}
                  className="
                    group
                    relative
                    mt-6
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
                  <KeyRound
                    className="size-4"
                    strokeWidth={2}
                    aria-hidden="true"
                  />

                  Accept administrator invitation

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
              </>
            )}


            {invitationState === "accepting" && (
              <div className="py-8 text-center">
                <LoaderCircle
                  className="
                    mx-auto
                    size-7
                    animate-spin
                    text-violet-300
                  "
                  aria-hidden="true"
                />

                <p
                  className="
                    mt-4
                    text-[12px]
                    font-semibold
                    text-white
                  "
                >
                  Activating administrator access…
                </p>

                <p
                  className="
                    mx-auto
                    mt-2
                    max-w-[350px]
                    text-[10px]
                    leading-[1.7]
                    text-slate-500
                  "
                >
                  Keep this page open while SCANLY verifies
                  and consumes the one-time invitation.
                </p>
              </div>
            )}


            {invitationState === "accepted" &&
              acceptedInvitation && (
                <>
                  <div
                    className="
                      rounded-[18px]
                      border
                      border-emerald-400/[0.13]
                      bg-emerald-400/[0.055]
                      p-5
                    "
                  >
                    <div className="flex gap-4">
                      <div
                        className="
                          flex
                          size-11
                          shrink-0
                          items-center
                          justify-center
                          rounded-[13px]
                          bg-emerald-400/[0.1]
                          text-emerald-300
                        "
                      >
                        <BadgeCheck
                          className="size-5"
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                      </div>

                      <div>
                        <p
                          className="
                            text-[13px]
                            font-bold
                            text-white
                          "
                        >
                          Invitation accepted
                        </p>

                        <p
                          className="
                            mt-1.5
                            text-[10px]
                            leading-[1.7]
                            text-slate-400
                          "
                        >
                          Your SCANLY account is active as{" "}
                          <span className="font-semibold text-slate-200">
                            {roleLabel(
                              acceptedInvitation.role,
                            )}
                          </span>
                          .
                        </p>
                      </div>
                    </div>
                  </div>

                  <a
                    href="/admin"
                    className="
                      group
                      mt-6
                      inline-flex
                      min-h-[54px]
                      w-full
                      items-center
                      justify-center
                      gap-3
                      rounded-[15px]
                      bg-violet-500
                      px-5
                      text-[12px]
                      font-bold
                      text-white
                      transition-all
                      duration-300
                      hover:-translate-y-0.5
                      hover:bg-violet-400
                      active:translate-y-0
                    "
                  >
                    <LockKeyhole
                      className="size-4"
                      strokeWidth={2}
                      aria-hidden="true"
                    />

                    {sessionReady
                      ? "Open administrator workspace"
                      : "Continue to administrator portal"}

                    <ArrowRight
                      className="
                        size-4
                        transition-transform
                        duration-300
                        group-hover:translate-x-1
                      "
                      aria-hidden="true"
                    />
                  </a>
                </>
              )}


            {(invitationState === "invalid" ||
              invitationState === "error") && (
              <>
                <div
                  className="
                    rounded-[18px]
                    border
                    border-rose-400/[0.13]
                    bg-rose-400/[0.055]
                    p-5
                  "
                >
                  <div className="flex gap-4">
                    <div
                      className="
                        flex
                        size-11
                        shrink-0
                        items-center
                        justify-center
                        rounded-[13px]
                        bg-rose-400/[0.09]
                        text-rose-300
                      "
                    >
                      <TriangleAlert
                        className="size-5"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </div>

                    <div>
                      <p
                        className="
                          text-[13px]
                          font-bold
                          text-white
                        "
                      >
                        Invitation unavailable
                      </p>

                      <p
                        className="
                          mt-1.5
                          text-[10px]
                          leading-[1.7]
                          text-slate-400
                        "
                      >
                        {errorMessage ??
                          "This administrator invitation cannot be used."}
                      </p>
                    </div>
                  </div>
                </div>

                <p
                  className="
                    mt-5
                    text-center
                    text-[9px]
                    leading-[1.7]
                    text-slate-600
                  "
                >
                  Ask the SCANLY Super Admin to issue a new
                  invitation if this link has expired, already
                  been used, or was revoked.
                </p>
              </>
            )}


            <div
              className="
                mt-7
                flex
                items-start
                gap-3
                border-t
                border-white/[0.055]
                pt-5
              "
            >
              <ShieldCheck
                className="
                  mt-0.5
                  size-3.5
                  shrink-0
                  text-slate-600
                "
                strokeWidth={1.8}
                aria-hidden="true"
              />

              <p
                className="
                  text-[9px]
                  leading-[1.7]
                  text-slate-600
                "
              >
                Administrator enrollment is protected by
                Cloudflare Access, one-time invitation
                validation, immutable identity binding, and
                SCANLY server-managed sessions.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
