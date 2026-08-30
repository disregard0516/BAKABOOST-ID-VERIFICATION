"use client";

import {
  useEffect,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  ADMIN_SESSION_EXPIRED_EVENT,
} from "@/lib/admin-api";

import {
  VERIFICATION_SESSION_EXPIRED_EVENT,
} from "@/lib/api";


export function SessionNavigationBridge() {
  const router =
    useRouter();

  useEffect(() => {
    function handleAdminExpired() {
      router.replace(
        "/admin/login?reason=session-expired",
      );
    }

    function handleVerificationExpired() {
      router.replace(
        "/verification/session-expired",
      );
    }

    window.addEventListener(
      ADMIN_SESSION_EXPIRED_EVENT,
      handleAdminExpired,
    );

    window.addEventListener(
      VERIFICATION_SESSION_EXPIRED_EVENT,
      handleVerificationExpired,
    );

    return () => {
      window.removeEventListener(
        ADMIN_SESSION_EXPIRED_EVENT,
        handleAdminExpired,
      );

      window.removeEventListener(
        VERIFICATION_SESSION_EXPIRED_EVENT,
        handleVerificationExpired,
      );
    };
  }, [router]);

  return null;
}