"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  CheckCircle2,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
} from "lucide-react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import {
  exchangeMobileHandoff,
} from "@/lib/mobile-handoff-api";


export function MobileHandoffExchange() {
  const router =
    useRouter();

  const params =
    useParams<{
      handoffToken: string;
    }>();

  const handoffToken =
    params.handoffToken;

  const started =
    useRef(false);

  const [
    failed,
    setFailed,
  ] =
    useState(false);

  const [
    connected,
    setConnected,
  ] =
    useState(false);


  useEffect(() => {
    if (
      !handoffToken ||
      started.current
    ) {
      return;
    }

    started.current =
      true;

    let active =
      true;


    async function exchange(): Promise<void> {
      try {
        await exchangeMobileHandoff(
          handoffToken,
        );


        if (!active) {
          return;
        }


        setConnected(
          true,
        );


        /*
         * Remove the one-time QR secret from
         * the browser URL and history.
         *
         * The phone now authenticates using
         * the short-lived HttpOnly cookie
         * issued by the backend.
         */
        router.replace(
          "/mobile/capture",
        );
      } catch {
        if (!active) {
          return;
        }


        setFailed(
          true,
        );
      }
    }


    void exchange();


    return () => {
      active =
        false;
    };
  }, [
    handoffToken,
    router,
  ]);


  const unavailable =
    !handoffToken ||
    failed;


  return (
    <main
      className="
        relative
        flex
        min-h-dvh
        items-center
        justify-center
        overflow-hidden
        bg-[#080910]
        px-5
        py-10
        text-white
      "
    >
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          left-1/2
          top-[-160px]
          size-[420px]
          -translate-x-1/2
          rounded-full
          bg-violet-600/20
          blur-[100px]
        "
      />


      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -bottom-36
          -right-28
          size-[340px]
          rounded-full
          bg-indigo-500/10
          blur-[110px]
        "
      />


      <section
        className="
          relative
          w-full
          max-w-[390px]
          rounded-[30px]
          border
          border-white/10
          bg-white/[0.055]
          p-6
          shadow-2xl
          shadow-black/50
          backdrop-blur-2xl
        "
      >
        <div
          className={`
            flex
            size-14
            items-center
            justify-center
            rounded-[18px]
            border
            ${
              unavailable
                ? `
                    border-red-300/15
                    bg-red-400/10
                    text-red-300
                  `
                : connected
                  ? `
                      border-emerald-300/15
                      bg-emerald-400/10
                      text-emerald-300
                    `
                  : `
                      border-violet-300/15
                      bg-violet-400/10
                      text-violet-200
                    `
            }
          `}
        >
          {unavailable ? (
            <TriangleAlert
              className="size-6"
              aria-hidden="true"
            />
          ) : connected ? (
            <CheckCircle2
              className="size-6"
              aria-hidden="true"
            />
          ) : (
            <Smartphone
              className="size-6"
              aria-hidden="true"
            />
          )}
        </div>


        <div
          className="
            mt-7
          "
        >
          <div
            className="
              flex
              items-center
              gap-2
              text-[10px]
              font-bold
              uppercase
              tracking-[0.18em]
              text-violet-300
            "
          >
            <LockKeyhole
              className="size-3.5"
              aria-hidden="true"
            />

            Secure handoff
          </div>


          <h1
            className="
              mt-3
              text-[25px]
              font-semibold
              tracking-[-0.04em]
            "
          >
            {unavailable
              ? "This QR session is unavailable"
              : connected
                ? "Phone connected"
                : "Connecting your phone…"}
          </h1>


          <p
            className="
              mt-3
              text-sm
              leading-6
              text-white/55
            "
          >
            {unavailable
              ? "The QR code may have expired, already been used, or been revoked. Return to your computer and generate a new QR code."
              : connected
                ? "The secure phone session has been established. Opening evidence capture now."
                : "We are exchanging the temporary QR credential for a private evidence-only phone session."}
          </p>
        </div>


        {!unavailable &&
          !connected && (
            <div
              className="
                mt-7
                flex
                items-center
                gap-3
                rounded-[18px]
                border
                border-white/[0.08]
                bg-black/20
                px-4
                py-4
              "
            >
              <LoaderCircle
                className="
                  size-5
                  shrink-0
                  animate-spin
                  text-violet-300
                "
                aria-hidden="true"
              />


              <div>
                <div
                  className="
                    text-xs
                    font-semibold
                  "
                >
                  Establishing secure capture
                </div>


                <div
                  className="
                    mt-1
                    text-[10px]
                    leading-4
                    text-white/40
                  "
                >
                  The QR secret can only be
                  exchanged once.
                </div>
              </div>
            </div>
          )}


        {connected && (
          <div
            className="
              mt-7
              flex
              items-center
              gap-3
              rounded-[18px]
              border
              border-emerald-300/10
              bg-emerald-400/[0.06]
              px-4
              py-4
            "
          >
            <CheckCircle2
              className="
                size-5
                shrink-0
                text-emerald-300
              "
              aria-hidden="true"
            />


            <div>
              <div
                className="
                  text-xs
                  font-semibold
                  text-emerald-100
                "
              >
                Secure session created
              </div>


              <div
                className="
                  mt-1
                  text-[10px]
                  leading-4
                  text-emerald-100/45
                "
              >
                Removing the QR secret and
                opening camera capture.
              </div>
            </div>
          </div>
        )}


        <div
          className="
            mt-7
            flex
            items-start
            gap-3
            border-t
            border-white/[0.08]
            pt-5
          "
        >
          <ShieldCheck
            className="
              mt-0.5
              size-4
              shrink-0
              text-emerald-300
            "
            aria-hidden="true"
          />


          <p
            className="
              text-[10px]
              leading-5
              text-white/40
            "
          >
            Mobile capture can only upload
            requested verification evidence.
            It cannot approve verification,
            reject a request, or grant Discord
            server access.
          </p>
        </div>
      </section>
    </main>
  );
}