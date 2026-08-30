"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  VerificationResultState,
} from "@/components/verification/verification-result-state";

import {
  apiFetch,
} from "@/lib/api";

import type {
  VerificationStatusResponse,
} from "@/types/verification";

export default function RejectedPage() {
  const [
    status,
    setStatus,
  ] =
    useState<VerificationStatusResponse | null>(
      null,
    );

  useEffect(() => {
    async function load() {
      try {
        const result =
          await apiFetch<VerificationStatusResponse>(
            "/verification/status",
          );

        setStatus(result);
      } catch {
        // Keep generic presentation.
      }
    }

    void load();
  }, []);

  return (
    <VerificationResultState
      type="rejected"
      title="Verification not approved"
      description="
        Your submitted verification was
        reviewed but was not approved.
        Protected Discord server access
        remains locked.
      "
      message={
        status?.user_message
      }
    />
  );
}