"use client";

import {
  type ReactNode,
  useEffect,
  useState,
} from "react";

import {
  Fingerprint,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  AdminApiError,
  ensureAdminSession,
} from "@/lib/admin-api";


interface AdminAccessGateProps {
  children: ReactNode;
}


type AccessState =
  | "checking"
  | "authorized"
  | "denied";


export function AdminAccessGate({
  children,
}: AdminAccessGateProps) {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const [
    accessState,
    setAccessState,
  ] = useState<AccessState>(
    "checking",
  );


  const isLoginPage =
    pathname === "/admin/login";


  useEffect(() => {
    if (isLoginPage) {
      return;
    }


    let cancelled = false;


    async function verifyAdministrator():
      Promise<void> {
      try {
        await ensureAdminSession();

        if (cancelled) {
          return;
        }

        setAccessState(
          "authorized",
        );
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        setAccessState(
          "denied",
        );


        if (
          error instanceof AdminApiError &&
          error.status === 403
        ) {
          router.replace(
            "/admin/login?reason=unauthorized",
          );

          return;
        }


        router.replace(
          "/admin/login?reason=authentication-required",
        );
      }
    }


    void verifyAdministrator();


    return () => {
      cancelled = true;
    };
  }, [
    isLoginPage,
    router,
  ]);


  if (isLoginPage) {
    return children;
  }


  if (
    accessState ===
    "authorized"
  ) {
    return children;
  }


  return (
    <AdminSecurityCheckpoint
      denied={
        accessState ===
        "denied"
      }
    />
  );
}


function AdminSecurityCheckpoint({
  denied,
}: {
  denied: boolean;
}) {
  return (
    <main
      className="
        relative
        flex
        min-h-screen
        items-center
        justify-center
        overflow-hidden
        bg-[#05070B]
        px-5
        text-white
      "
    >
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          bg-[radial-gradient(circle_at_50%_30%,rgba(124,58,237,0.12),transparent_32rem)]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          bg-[linear-gradient(to_right,rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.018)_1px,transparent_1px)]
          bg-[size:48px_48px]
          [mask-image:radial-gradient(circle_at_center,black,transparent_75%)]
        "
      />

      <section
        className="
          relative
          z-10
          w-full
          max-w-[390px]
          rounded-[26px]
          border
          border-white/[0.07]
          bg-[#0A0F18]/90
          px-7
          py-8
          text-center
          shadow-[0_35px_120px_rgba(0,0,0,0.5)]
          backdrop-blur-2xl
        "
      >
        <div
          className="
            mx-auto
            flex
            size-14
            items-center
            justify-center
            rounded-[17px]
            border
            border-violet-400/[0.13]
            bg-violet-500/[0.08]
            text-violet-300
          "
        >
          {denied ? (
            <ShieldCheck
              className="size-5"
              aria-hidden="true"
            />
          ) : (
            <Fingerprint
              className="size-5"
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
            tracking-[0.18em]
            text-violet-400
          "
        >
          SCANLY Security
        </div>

        <h1
          className="
            mt-3
            text-[22px]
            font-extrabold
            tracking-[-0.04em]
            text-white
          "
        >
          {denied
            ? "Access not authorized"
            : "Verifying administrator"}
        </h1>

        <p
          className="
            mx-auto
            mt-3
            max-w-[310px]
            text-[10px]
            leading-5
            text-slate-500
          "
        >
          {denied
            ? "This administrator session cannot access the requested workspace."
            : "SCANLY is validating your protected administrator session before loading sensitive verification data."}
        </p>

        {!denied ? (
          <div
            className="
              mt-6
              flex
              items-center
              justify-center
              gap-2
              text-[9px]
              font-semibold
              text-slate-500
            "
          >
            <LoaderCircle
              className="
                size-3.5
                animate-spin
                text-violet-400
              "
              aria-hidden="true"
            />

            Secure session verification
          </div>
        ) : null}
      </section>
    </main>
  );
}