"use client";

import {
  LogOut,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  apiFetch,
} from "@/lib/api";


export function VerificationLogoutButton() {
  const router =
    useRouter();


  async function logout() {
    try {
      await apiFetch<void>(
        "/verification/logout",
        {
          method: "POST",
        },
      );
    } finally {
      router.replace("/");
    }
  }


  return (
    <button
      type="button"
      onClick={() => {
        void logout();
      }}
      className="
        focus-ring
        inline-flex
        items-center gap-2
        rounded-xl
        px-3 py-2
        text-[11px]
        font-semibold
        text-[#85818f]
        transition
        hover:bg-black/[0.04]
        hover:text-[#3a3642]
      "
    >
      <LogOut
        className="size-3.5"
      />

      End verification session
    </button>
  );
}