"use client";

import {
  AlertCircle,
  LoaderCircle,
  UserRoundCog,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  getReviewers,
} from "@/lib/admin-api";

import type {
  ReviewerSummary,
} from "@/types/reviewer";


export function ReviewerPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (
    value: string,
  ) => void;
}) {
  const [
    reviewers,
    setReviewers,
  ] =
    useState<
      ReviewerSummary[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState(false);


  useEffect(() => {
    let active =
      true;

    async function load(): Promise<void> {
      try {
        const result =
          await getReviewers();

        if (!active) {
          return;
        }

        setReviewers(
          result.items.filter(
            (reviewer) =>
              reviewer.is_active,
          ),
        );

        setError(
          false,
        );
      } catch {
        if (active) {
          setError(
            true,
          );
        }
      } finally {
        if (active) {
          setLoading(
            false,
          );
        }
      }
    }

    void load();

    return () => {
      active =
        false;
    };
  }, []);


  return (
    <div
      className="
        flex-1
      "
    >
      <div className="relative">
        <UserRoundCog
          className="
            pointer-events-none
            absolute
            left-3
            top-1/2
            size-3.5
            -translate-y-1/2
            text-slate-700
          "
          aria-hidden="true"
        />

        <select
          aria-label="Assigned reviewer"
          value={
            value
          }
          onChange={(
            event,
          ) => {
            onChange(
              event.target.value,
            );
          }}
          disabled={
            loading ||
            error
          }
          className="
            h-10
            w-full
            rounded-[12px]
            border
            border-white/[0.07]
            bg-[#0a111c]
            pl-9
            pr-9
            text-[10px]
            text-slate-300
            outline-none
            transition
            focus:border-violet-500/40
            focus:ring-4
            focus:ring-violet-500/[0.04]
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          <option value="">
            {loading
              ? "Loading reviewers..."
              : error
                ? "Unable to load reviewers"
                : reviewers.length ===
                    0
                  ? "No active reviewers"
                  : "Select reviewer"}
          </option>

          {reviewers.map(
            (
              reviewer,
            ) => (
              <option
                key={
                  reviewer.id
                }
                value={
                  reviewer.id
                }
              >
                {
                  reviewer.display_name
                }
                {reviewer.email
                  ? ` · ${reviewer.email}`
                  : ""}
              </option>
            ),
          )}
        </select>


        {loading && (
          <LoaderCircle
            className="
              pointer-events-none
              absolute
              right-3
              top-1/2
              size-3
              -translate-y-1/2
              animate-spin
              text-slate-600
            "
            aria-hidden="true"
          />
        )}

        {error && (
          <AlertCircle
            className="
              pointer-events-none
              absolute
              right-3
              top-1/2
              size-3
              -translate-y-1/2
              text-red-400
            "
            aria-hidden="true"
          />
        )}
      </div>


      {error && (
        <div
          role="alert"
          className="
            mt-1.5
            text-[8px]
            text-red-300
          "
        >
          Reviewer list could not be loaded.
        </div>
      )}
    </div>
  );
}