"use client";

import {
  LoaderCircle,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  exchangeMobileHandoff,
} from "@/lib/mobile-handoff-api";


let pendingToken:
  string | null =
  null;

let pendingExchange:
  Promise<void> | null =
  null;


function readAndScrubToken(): string | null {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  if (pendingToken) {
    return pendingToken;
  }

  const rawHash =
    window.location.hash
      .slice(1)
      .trim();

  if (!rawHash) {
    return null;
  }

  let token:
    string;

  try {
    token =
      decodeURIComponent(
        rawHash,
      );
  } catch {
    return null;
  }

  if (!token) {
    return null;
  }

  pendingToken =
    token;

  /*
   * Remove the one-time credential from the
   * visible URL immediately after reading it.
   */
  window.history.replaceState(
    null,
    "",
    "/mobile",
  );

  return token;
}


function exchangeOnce(
  token: string,
): Promise<void> {
  if (pendingExchange) {
    return pendingExchange;
  }

  pendingExchange =
    exchangeMobileHandoff(
      token,
    ).then(
      () => undefined,
    );

  return pendingExchange;
}


export function MobileHandoffEntry() {
  const router =
    useRouter();

  const [
    failed,
    setFailed,
  ] =
    useState(false);

  const [
    missingToken,
    setMissingToken,
  ] =
    useState(false);


  useEffect(() => {
    let active =
      true;

    const token =
      readAndScrubToken();

    /*
     * Schedule this update outside the
     * synchronous effect body so it does not
     * violate react-hooks/set-state-in-effect.
     */
    if (!token) {
      queueMicrotask(
        () => {
          if (active) {
            setMissingToken(
              true,
            );
          }
        },
      );

      return () => {
        active =
          false;
      };
    }

    const handoffToken:
      string =
      token;


    async function connect(): Promise<void> {
      try {
        await exchangeOnce(
          handoffToken,
        );

        if (!active) {
          return;
        }

        pendingToken =
          null;

        router.replace(
          "/mobile/capture",
        );
      } catch {
        if (!active) {
          return;
        }

        pendingToken =
          null;

        pendingExchange =
          null;

        setFailed(
          true,
        );
      }
    }

    void connect();

    return () => {
      active =
        false;
    };
  }, [
    router,
  ]);


  const unavailable =
    failed ||
    missingToken;


  return (
    <main
      className="
        relative
        flex
        min-h-dvh
        items-center
        justify-center
        overflow-hidden
        bg-[#080d16]
        px-5
        py-12
        text-white
      "
    >
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -top-40
          left-1/2
          size-[430px]
          -translate-x-1/2
          rounded-full
          bg-violet-600/15
          blur-[110px]
        "
      />

      <div
        className="
          relative
          w-full
          max-w-[390px]
          rounded-[30px]
          border
          border-white/[0.08]
          bg-white/[0.045]
          p-7
          text-center
          shadow-2xl
          shadow-black/30
          backdrop-blur-xl
        "
      >
        <div
          className={`
            mx-auto
            flex
            size-14
            items-center
            justify-center
            rounded-[18px]
            ${
              unavailable
                ? "bg-red-400/10 text-red-300"
                : "bg-violet-400/10 text-violet-300"
            }
          `}
        >
          {unavailable ? (
            <ShieldAlert
              className="size-6"
              aria-hidden="true"
            />
          ) : (
            <ShieldCheck
              className="size-6"
              aria-hidden="true"
            />
          )}
        </div>

        <h1
          className="
            mt-5
            text-[24px]
            font-bold
            tracking-[-0.04em]
          "
        >
          {unavailable
            ? "QR session unavailable"
            : "Securing your phone"}
        </h1>

        <p
          className="
            mt-3
            text-xs
            leading-6
            text-slate-500
          "
        >
          {unavailable
            ? "This QR code may have expired or already been used. Return to your computer and generate a new one."
            : "Exchanging the one-time QR credential for a private evidence-only phone session."}
        </p>

        {!unavailable && (
          <div
            className="
              mt-6
              inline-flex
              items-center
              gap-2
              rounded-full
              border
              border-white/[0.07]
              bg-white/[0.04]
              px-4
              py-2
              text-[10px]
              font-semibold
              text-violet-200
            "
          >
            <LoaderCircle
              className="
                size-3.5
                animate-spin
              "
              aria-hidden="true"
            />

            Establishing secure capture
          </div>
        )}
      </div>
    </main>
  );
}