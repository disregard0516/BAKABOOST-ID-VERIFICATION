"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { VerificationShell } from "@/components/verification/verification-shell";
import { apiFetch } from "@/lib/api";

import type { DiscordAccountConfirmation } from "@/types/verification";

function passthroughImageLoader({
  src,
}: {
  src: string;
}) {
  return src;
}

function BackgroundPattern() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div
        className="
          absolute left-1/2 top-[-28rem]
          h-[54rem] w-[54rem]
          -translate-x-1/2
          rounded-full
          bg-[radial-gradient(circle,rgba(99,102,241,0.12)_0%,rgba(139,92,246,0.055)_37%,transparent_70%)]
          blur-3xl
        "
      />

      <div
        className="
          absolute -left-32 top-[28%]
          h-[28rem] w-[28rem]
          rounded-full
          bg-[radial-gradient(circle,rgba(56,189,248,0.08)_0%,transparent_70%)]
          blur-3xl
        "
      />

      <div
        className="
          absolute -right-40 bottom-[-8rem]
          h-[34rem] w-[34rem]
          rounded-full
          bg-[radial-gradient(circle,rgba(167,139,250,0.09)_0%,transparent_70%)]
          blur-3xl
        "
      />

      <div
        className="
          absolute inset-0 opacity-[0.42]
          [background-image:radial-gradient(circle_at_center,rgba(71,67,92,0.13)_1px,transparent_1px)]
          [background-size:22px_22px]
          [mask-image:linear-gradient(to_bottom,black,transparent_88%)]
        "
      />

      <div
        className="
          absolute inset-x-0 top-0 h-52
          bg-gradient-to-b
          from-white
          via-white/75
          to-transparent
        "
      />
    </div>
  );
}

function LoadingState() {
  return (
    <VerificationShell currentStep="account">
      <main
        className="
          relative
          flex min-h-[calc(100vh-120px)]
          items-center
          justify-center
          overflow-hidden
          px-5 py-12
        "
      >
        <BackgroundPattern />

        <section
          className="
            relative z-10
            flex w-full max-w-[560px]
            flex-col items-center
            rounded-[32px]
            border border-[#e9e8ef]
            bg-white/80
            px-8 py-14
            text-center
            shadow-[0_24px_80px_rgba(38,32,72,0.08)]
            backdrop-blur-2xl
          "
        >
          <div
            className="
              relative
              flex size-16
              items-center
              justify-center
              rounded-[20px]
              border border-[#eceaf5]
              bg-[#f8f7fc]
            "
          >
            <div
              className="
                absolute inset-2
                animate-ping
                rounded-[14px]
                bg-[#6757ef]/10
              "
            />

            <LoaderCircle
              className="
                relative z-10
                size-7
                animate-spin
                text-[#6252ed]
              "
            />
          </div>

          <p
            className="
              mt-6
              text-[11px]
              font-bold
              uppercase
              tracking-[0.16em]
              text-[#8c87a0]
            "
          >
            Secure verification
          </p>

          <h1
            className="
              mt-2
              text-[27px]
              font-semibold
              tracking-[-0.045em]
              text-[#17151f]
            "
          >
            Confirming your Discord account
          </h1>

          <p
            className="
              mt-3 max-w-[390px]
              text-sm
              leading-6
              text-[#777384]
            "
          >
            Please wait while we securely load the Discord
            account connected to this verification session.
          </p>
        </section>
      </main>
    </VerificationShell>
  );
}

function ErrorState({
  message,
}: {
  message: string;
}) {
  return (
    <VerificationShell currentStep="account">
      <main
        className="
          relative
          flex min-h-[calc(100vh-120px)]
          items-center
          justify-center
          overflow-hidden
          px-5 py-12
        "
      >
        <BackgroundPattern />

        <section
          className="
            relative z-10
            w-full max-w-[600px]
            rounded-[32px]
            border border-[#eee8ea]
            bg-white/85
            px-7 py-12
            text-center
            shadow-[0_24px_80px_rgba(38,32,72,0.08)]
            backdrop-blur-2xl
            sm:px-10
          "
        >
          <div
            className="
              mx-auto
              flex size-14
              items-center
              justify-center
              rounded-[18px]
              border border-[#f2dadd]
              bg-[#fff6f7]
              text-[#b24050]
            "
          >
            <ShieldCheck className="size-6" />
          </div>

          <p
            className="
              mt-6
              text-[11px]
              font-bold
              uppercase
              tracking-[0.15em]
              text-[#b07e86]
            "
          >
            Account confirmation
          </p>

          <h1
            className="
              mt-2
              text-[28px]
              font-semibold
              tracking-[-0.045em]
              text-[#1d1820]
            "
          >
            We couldn&apos;t confirm your account
          </h1>

          <p
            className="
              mx-auto mt-3
              max-w-[430px]
              text-sm
              leading-6
              text-[#7c747a]
            "
          >
            {message}
          </p>
        </section>
      </main>
    </VerificationShell>
  );
}

export function AccountConfirmation() {
  const router = useRouter();

  const [account, setAccount] =
    useState<DiscordAccountConfirmation | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data =
          await apiFetch<DiscordAccountConfirmation>(
            "/verification/account",
          );

        if (!active) {
          return;
        }

        setAccount(data);
      } catch {
        if (!active) {
          return;
        }

        setError(
          "We could not confirm your Discord account.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <LoadingState />;
  }

  if (error || !account) {
    return (
      <ErrorState
        message={
          error ??
          "Discord account confirmation is unavailable."
        }
      />
    );
  }

  return (
    <VerificationShell currentStep="account">
      <main
        className="
          relative
          flex min-h-[calc(100vh-120px)]
          items-center
          justify-center
          overflow-hidden
          px-4 py-8
          sm:px-6
          sm:py-12
        "
      >
        <BackgroundPattern />

        <section
          className="
            relative z-10
            grid w-full max-w-[1080px]
            overflow-hidden
            rounded-[34px]
            border border-[#e9e7ef]
            bg-white/80
            shadow-[0_28px_90px_rgba(34,28,66,0.09)]
            backdrop-blur-2xl
            lg:grid-cols-[0.9fr_1.1fr]
          "
        >
          <aside
            className="
              relative
              hidden min-h-[650px]
              overflow-hidden
              border-r border-[#ebe9f0]
              bg-[#f8f8fb]
              p-10
              lg:flex
              lg:flex-col
            "
          >
            <div
              aria-hidden="true"
              className="
                absolute -left-28 -top-28
                h-80 w-80
                rounded-full
                bg-[radial-gradient(circle,rgba(99,82,237,0.13)_0%,transparent_70%)]
                blur-2xl
              "
            />

            <div
              aria-hidden="true"
              className="
                absolute -bottom-24 -right-24
                h-72 w-72
                rounded-full
                bg-[radial-gradient(circle,rgba(88,201,231,0.1)_0%,transparent_70%)]
                blur-2xl
              "
            />

            <div
              className="
                absolute inset-0
                opacity-[0.34]
                [background-image:radial-gradient(circle_at_center,rgba(86,80,114,0.15)_1px,transparent_1px)]
                [background-size:20px_20px]
                [mask-image:linear-gradient(to_bottom,black,transparent)]
              "
            />

            <div className="relative z-10">
              <div
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  border border-[#e2dfed]
                  bg-white/75
                  px-3 py-1.5
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.14em]
                  text-[#625b75]
                  shadow-sm
                  backdrop-blur-xl
                "
              >
                <ShieldCheck className="size-3.5 text-[#6354ec]" />

                Secure identity check
              </div>

              <h2
                className="
                  mt-8
                  max-w-[340px]
                  text-[41px]
                  font-semibold
                  leading-[1.04]
                  tracking-[-0.055em]
                  text-[#17151f]
                "
              >
                Your Discord account is connected.
              </h2>

              <p
                className="
                  mt-5 max-w-[345px]
                  text-[14px]
                  leading-6
                  text-[#747080]
                "
              >
                We use your immutable Discord User ID to
                keep this verification request tied to the
                correct account.
              </p>
            </div>

            <div
              className="
                relative z-10
                mt-auto
                space-y-3
              "
            >
              <div
                className="
                  flex items-start
                  gap-3
                  rounded-[18px]
                  border border-[#e8e5ef]
                  bg-white/65
                  p-4
                  backdrop-blur-xl
                "
              >
                <div
                  className="
                    mt-0.5
                    flex size-7
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-[#ece9ff]
                    text-[#6152e8]
                  "
                >
                  <Check className="size-3.5 stroke-[2.5]" />
                </div>

                <div>
                  <p
                    className="
                      text-xs
                      font-semibold
                      text-[#292532]
                    "
                  >
                    Account authenticated
                  </p>

                  <p
                    className="
                      mt-1 text-[11px]
                      leading-5
                      text-[#827e8d]
                    "
                  >
                    Discord OAuth has successfully
                    identified the account in this session.
                  </p>
                </div>
              </div>

              <div
                className="
                  flex items-start
                  gap-3
                  rounded-[18px]
                  border border-[#e8e5ef]
                  bg-white/65
                  p-4
                  backdrop-blur-xl
                "
              >
                <div
                  className="
                    mt-0.5
                    flex size-7
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-[#eaf8f3]
                    text-[#198362]
                  "
                >
                  <LockKeyhole className="size-3.5 stroke-[2.3]" />
                </div>

                <div>
                  <p
                    className="
                      text-xs
                      font-semibold
                      text-[#292532]
                    "
                  >
                    Bound to this request
                  </p>

                  <p
                    className="
                      mt-1 text-[11px]
                      leading-5
                      text-[#827e8d]
                    "
                  >
                    Another Discord account cannot replace
                    the account already confirmed here.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <div
            className="
              relative
              flex min-h-[610px]
              flex-col
              bg-white/78
              px-5 py-7
              sm:px-9
              sm:py-9
              lg:min-h-[650px]
              lg:px-12
              lg:py-11
            "
          >
            <div
              className="
                flex items-center
                justify-between
                gap-4
              "
            >
              <div
                className="
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  border border-[#dcefe7]
                  bg-[#f3fbf7]
                  px-3 py-1.5
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[0.13em]
                  text-[#338068]
                "
              >
                <span
                  className="
                    relative flex size-2
                  "
                >
                  <span
                    className="
                      absolute inline-flex
                      size-full
                      animate-ping
                      rounded-full
                      bg-[#45aa84]
                      opacity-40
                    "
                  />

                  <span
                    className="
                      relative inline-flex
                      size-2
                      rounded-full
                      bg-[#2b9b73]
                    "
                  />
                </span>

                Discord authenticated
              </div>

              <div
                className="
                  hidden items-center
                  gap-1.5
                  text-[10px]
                  font-semibold
                  uppercase
                  tracking-[0.1em]
                  text-[#a09cab]
                  sm:flex
                "
              >
                <LockKeyhole className="size-3" />

                Secure session
              </div>
            </div>

            <div className="mt-10">
              <div
                className="
                  flex size-14
                  items-center
                  justify-center
                  rounded-[18px]
                  border border-[#dcefe7]
                  bg-[#eefaf5]
                  text-[#16815d]
                  shadow-[0_8px_25px_rgba(36,142,103,0.1)]
                "
              >
                <CheckCircle2 className="size-7" />
              </div>

              <p
                className="
                  mt-7
                  text-[11px]
                  font-bold
                  uppercase
                  tracking-[0.14em]
                  text-[#898496]
                "
              >
                Account confirmation
              </p>

              <h1
                className="
                  mt-2
                  max-w-[520px]
                  text-[34px]
                  font-semibold
                  leading-[1.08]
                  tracking-[-0.052em]
                  text-[#17141e]
                  sm:text-[40px]
                "
              >
                Account confirmed
              </h1>

              <p
                className="
                  mt-4
                  max-w-[510px]
                  text-sm
                  leading-6
                  text-[#777282]
                "
              >
                Review the Discord account below before
                continuing to identity verification.
              </p>
            </div>

            <div
              className="
                mt-8
                overflow-hidden
                rounded-[24px]
                border border-[#e8e6ed]
                bg-[#fbfbfd]
                shadow-[0_12px_35px_rgba(29,24,53,0.045)]
              "
            >
              <div
                className="
                  flex items-center
                  gap-4
                  p-4
                  sm:p-5
                "
              >
                <div className="relative shrink-0">
                  {account.avatar_url ? (
                    <Image
                      loader={
                        passthroughImageLoader
                      }
                      unoptimized
                      src={account.avatar_url}
                      alt={`${account.username} Discord avatar`}
                      width={64}
                      height={64}
                      className="
                        size-16
                        rounded-[19px]
                        border border-white
                        object-cover
                        shadow-[0_8px_25px_rgba(34,29,56,0.12)]
                      "
                    />
                  ) : (
                    <div
                      className="
                        flex size-16
                        items-center
                        justify-center
                        rounded-[19px]
                        border border-[#e5e2f1]
                        bg-[#efedfb]
                        text-[#6657f5]
                      "
                    >
                      <ShieldCheck className="size-7" />
                    </div>
                  )}

                  <span
                    className="
                      absolute -bottom-1 -right-1
                      flex size-5
                      items-center
                      justify-center
                      rounded-full
                      border-2 border-white
                      bg-[#32a57d]
                      text-white
                    "
                  >
                    <Check className="size-2.5 stroke-[3]" />
                  </span>
                </div>

                <div
                  className="
                    min-w-0
                    flex-1
                  "
                >
                  <p
                    className="
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-[0.12em]
                      text-[#9c97a7]
                    "
                  >
                    You are verifying as
                  </p>

                  <p
                    className="
                      mt-1.5
                      truncate
                      text-[17px]
                      font-semibold
                      tracking-[-0.025em]
                      text-[#24202c]
                    "
                  >
                    @{account.username}
                  </p>

                  <p
                    className="
                      mt-1.5
                      truncate
                      font-mono
                      text-[10px]
                      tracking-[0.035em]
                      text-[#928d9d]
                    "
                  >
                    {account.discord_user_id}
                  </p>
                </div>

                <div
                  className="
                    hidden
                    rounded-full
                    border border-[#dceee7]
                    bg-[#f1faf6]
                    px-3 py-1.5
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.09em]
                    text-[#39816a]
                    sm:block
                  "
                >
                  Verified
                </div>
              </div>

              <div
                className="
                  border-t
                  border-[#ebe9ef]
                  bg-white
                  px-4 py-3.5
                  sm:px-5
                "
              >
                <div
                  className="
                    flex
                    items-start
                    gap-2.5
                  "
                >
                  <LockKeyhole
                    className="
                      mt-0.5
                      size-3.5
                      shrink-0
                      text-[#77718a]
                    "
                  />

                  <p
                    className="
                      text-[11px]
                      leading-[1.65]
                      text-[#7d7888]
                    "
                  >
                    This immutable Discord User ID is now
                    bound to your verification session. A
                    different Discord account cannot
                    complete this request.
                  </p>
                </div>
              </div>
            </div>

            <div
              className="
                mt-auto
                pt-8
              "
            >
              <button
                type="button"
                onClick={() => {
                  router.push(
                    "/verification/identity",
                  );
                }}
                className="
                  group
                  relative
                  flex h-[58px]
                  w-full
                  items-center
                  justify-center
                  overflow-hidden
                  rounded-[18px]
                  bg-[#17151d]
                  px-6
                  text-sm
                  font-semibold
                  text-white
                  shadow-[0_15px_35px_rgba(23,21,29,0.18)]
                  transition-all
                  duration-300
                  hover:-translate-y-0.5
                  hover:bg-[#24212d]
                  hover:shadow-[0_18px_42px_rgba(23,21,29,0.23)]
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-[#6657f5]
                  focus-visible:ring-offset-2
                  active:translate-y-0
                "
              >
                <span
                  aria-hidden="true"
                  className="
                    absolute
                    -left-24 top-0
                    h-full w-20
                    -skew-x-[24deg]
                    bg-white/10
                    transition-transform
                    duration-700
                    group-hover:translate-x-[32rem]
                  "
                />

                <span
                  className="
                    relative z-10
                    flex items-center
                    gap-2.5
                  "
                >
                  Continue to identity

                  <ArrowRight
                    className="
                      size-4
                      transition-transform
                      duration-300
                      group-hover:translate-x-1
                    "
                  />
                </span>
              </button>

              <div
                className="
                  mt-4
                  flex items-center
                  justify-center
                  gap-2
                  text-[10px]
                  leading-5
                  text-[#9893a1]
                "
              >
                <Sparkles
                  className="
                    size-3
                    text-[#8277d9]
                  "
                />

                Your account is ready for the next step.
              </div>
            </div>
          </div>
        </section>
      </main>
    </VerificationShell>
  );
}

export default function AccountConfirmedPage() {
  return <AccountConfirmation />;
}