"use client";

import type {
  ReactNode,
} from "react";

import {
  LoaderCircle,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  apiFetch,
} from "@/lib/api";

import {
  getVerificationStatusPath,
} from "@/lib/status-routing";

import type {
  VerificationStatus,
  VerificationStatusResponse,
} from "@/types/verification";


interface VerificationStatusGuardProps {
  allowed:
    VerificationStatus[];

  children:
    ReactNode;
}


export function VerificationStatusGuard({
  allowed,
  children,
}: VerificationStatusGuardProps) {
  const router =
    useRouter();

  const [
    ready,
    setReady,
  ] = useState(false);

  const [
    failed,
    setFailed,
  ] = useState(false);


  /*
   * Convert allowed states to a stable key so an
   * inline array prop does not continuously
   * retrigger the effect.
   */
  const allowedKey =
    useMemo(
      () =>
        [...allowed]
          .sort()
          .join("|"),
      [allowed],
    );


  useEffect(() => {
    let active =
      true;


    async function check(): Promise<void> {
      setReady(false);
      setFailed(false);

      try {
        const result =
          await apiFetch<VerificationStatusResponse>(
            "/verification/status",
          );

        if (!active) {
          return;
        }

        const allowedStatuses =
          allowedKey
            .split("|")
            .filter(
              (
                item,
              ): item is VerificationStatus =>
                item.length > 0,
            );


        if (
          !allowedStatuses.includes(
            result.status,
          )
        ) {
          router.replace(
            getVerificationStatusPath(
              result.status,
            ),
          );

          return;
        }

        setReady(true);
      } catch {
        if (!active) {
          return;
        }

        /*
         * A 401 is already handled by the
         * SessionNavigationBridge in api.ts.
         * This fallback avoids showing protected
         * content if some other request error occurs.
         */
        setFailed(true);
      }
    }


    void check();


    return () => {
      active = false;
    };
  }, [
    allowedKey,
    router,
  ]);


  if (failed) {
    return (
      <div
        className="
          mx-auto
          flex min-h-[300px]
          max-w-[680px]
          items-center
          justify-center
          px-6
          text-center
        "
      >
        <div>
          <div
            className="
              text-sm
              font-bold
              text-[#302d39]
            "
          >
            Verification status unavailable
          </div>

          <p
            className="
              mt-2
              text-xs
              leading-5
              text-[#817d8c]
            "
          >
            We could not safely determine the current
            verification state. Refresh the page or
            reopen your private verification link.
          </p>
        </div>
      </div>
    );
  }


  if (!ready) {
    return (
      <div
        className="
          flex min-h-[300px]
          items-center
          justify-center
        "
      >
        <div
          className="
            flex flex-col
            items-center
            gap-3
          "
        >
          <LoaderCircle
            className="
              size-6
              animate-spin
              text-[#6657f5]
            "
            aria-hidden="true"
          />

          <span
            className="
              text-[11px]
              font-medium
              text-[#9995a5]
            "
          >
            Checking verification status…
          </span>
        </div>
      </div>
    );
  }


  return children;
}