import {
  redirect,
} from "next/navigation";

import {
  VerificationEntry,
} from "@/components/verification/verification-entry";

interface VerificationPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function VerificationPage({
  params,
}: VerificationPageProps) {
  const { token } =
    await params;

  if (!token) {
    redirect("/");
  }

  return (
    <VerificationEntry
      token={token}
    />
  );
}