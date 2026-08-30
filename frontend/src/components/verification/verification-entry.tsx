"use client";

import Image from "next/image";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Code2,
  FileCheck2,
  Globe2,
  LoaderCircle,
  LockKeyhole,
  ScanFace,
  ShieldCheck,
  ShieldEllipsis,
  Sparkles,
  Timer,
  UserCheck,
  XCircle,
  Zap,
} from "lucide-react";

import {
  VerificationShell,
} from "@/components/verification/verification-shell";

import {
  appConfig,
} from "@/lib/config";

import {
  formatDateTime,
  getTimeRemaining,
} from "@/lib/date";

import {
  createEntryContext,
  getPublicVerificationRequest,
} from "@/lib/verification-api";

import {
  verificationStatusPresentation,
} from "@/lib/verification-status";

import type {
  PublicVerificationRequest,
} from "@/types/verification";


interface VerificationEntryProps {
  token: string;
}


type LoadingState =
  | "loading"
  | "ready"
  | "error";


export function VerificationEntry({
  token,
}: VerificationEntryProps) {
  const [
    request,
    setRequest,
  ] = useState<PublicVerificationRequest | null>(
    null,
  );

  const [
    state,
    setState,
  ] = useState<LoadingState>(
    "loading",
  );

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    continuing,
    setContinuing,
  ] = useState(false);


  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const result =
          await getPublicVerificationRequest(
            token,
          );

        if (!active) {
          return;
        }

        setRequest(result);
        setState("ready");
      } catch {
        if (!active) {
          return;
        }

        setError(
          "This verification request is unavailable.",
        );

        setState("error");
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [token]);


  async function continueWithDiscord() {
    if (continuing) {
      return;
    }

    setContinuing(true);
    setError(null);

    try {
      const context =
        await createEntryContext(
          token,
        );

      const url =
        new URL(
          `${appConfig.apiBaseUrl}/auth/discord/start`,
        );

      url.searchParams.set(
        "entry_context",
        context.entry_context,
      );

      window.location.assign(
        url.toString(),
      );
    } catch {
      setContinuing(false);

      setError(
        "We could not start Discord authentication. Please try again.",
      );
    }
  }


  if (state === "loading") {
    return (
      <VerificationHeroLoader />
    );
  }


  if (
    state === "error" ||
    !request
  ) {
    return (
      <VerificationShell
        currentStep="account"
      >
        <UnavailableCard
          message={
            error ??
            "Verification request unavailable."
          }
        />
      </VerificationShell>
    );
  }


  const presentation =
    verificationStatusPresentation[
      request.status
    ];

  const canAuthenticate =
    request.status ===
    "pending";

  const isTerminal = [
    "expired",
    "revoked",
    "rejected",
  ].includes(
    request.status,
  );


  if (!canAuthenticate) {
    return (
      <VerificationShell
        currentStep={
          presentation.step
        }
      >
        <ExistingStatusCard
          request={request}
          isTerminal={
            isTerminal
          }
        />
      </VerificationShell>
    );
  }


  return (
    <main
      className="
        min-h-screen
        overflow-hidden
        bg-white
        text-[#1A1A40]
      "
      style={{
        fontFamily:
          "'Inter', sans-serif",
      }}
    >
      <SiteHeader
        continuing={continuing}
        onContinue={
          continueWithDiscord
        }
      />

      <HeroSection
        request={request}
        continuing={continuing}
        error={error}
        onContinue={
          continueWithDiscord
        }
      />

      <TrustStrip />

      <MetricsSection />

      <CapabilitiesSection />

      <ProcessSection />

      <VerificationInsightsSection />

      <SecuritySection />

      <DeveloperSection />

      <FinalCta
        continuing={continuing}
        onContinue={
          continueWithDiscord
        }
      />

      <SiteFooter />
    </main>
  );
}


function SiteHeader({
  continuing,
  onContinue,
}: {
  continuing: boolean;
  onContinue: () => void;
}) {
  return (
    <header
      className="
        sticky
        top-0
        z-50
        border-b
        border-[#1A1A40]/[0.06]
        bg-white/90
        backdrop-blur-xl
      "
    >
      <div
        className="
          mx-auto
          flex
          h-[72px]
          w-full
          max-w-[1440px]
          items-center
          justify-between
          px-5
          sm:px-8
          lg:px-12
        "
      >
        <a
          href="#top"
          className="
            group
            flex
            items-center
            gap-2.5
          "
        >
          <div
            className="
              flex
              size-8
              items-center
              justify-center
              rounded-[10px]
              bg-[#1A1A40]
              text-white
              shadow-sm
              transition-transform
              duration-300
              group-hover:-rotate-3
              group-hover:scale-105
            "
          >
            <ShieldCheck
              className="size-4"
              strokeWidth={2.2}
            />
          </div>

          <span
            className="
              text-[17px]
              font-extrabold
              tracking-[-0.045em]
              text-[#11112D]
            "
          >
            BAKABOOST
          </span>
        </a>


        <nav
          className="
            hidden
            items-center
            gap-7
            lg:flex
          "
          aria-label="Primary navigation"
        >
          <HeaderLink href="#features">
            Features
          </HeaderLink>

          <HeaderLink href="#process">
            How it works
          </HeaderLink>

          <HeaderLink href="#security">
            Security
          </HeaderLink>

          <HeaderLink href="#developers">
            Developers
          </HeaderLink>
        </nav>


        <div
          className="
            flex
            items-center
            gap-2
          "
        >
          <div
            className="
              hidden
              items-center
              gap-2
              rounded-full
              border
              border-[#1A1A40]/10
              px-3
              py-2
              text-[11px]
              font-semibold
              text-[#65657A]
              md:flex
            "
          >
            <LockKeyhole
              className="
                size-3.5
                text-[#00A8E8]
              "
            />

            Private request
          </div>

          <button
            type="button"
            disabled={continuing}
            onClick={onContinue}
            className="
              group
              inline-flex
              h-10
              items-center
              justify-center
              gap-2
              rounded-[11px]
              bg-[#1A1A40]
              px-4
              text-[12px]
              font-bold
              text-white
              shadow-[0_8px_24px_rgba(26,26,64,0.16)]
              transition-all
              duration-300
              hover:-translate-y-0.5
              hover:bg-[#25255B]
              hover:shadow-[0_12px_28px_rgba(26,26,64,0.22)]
              disabled:pointer-events-none
              disabled:opacity-60
            "
          >
            {continuing ? (
              <LoaderCircle
                className="
                  size-3.5
                  animate-spin
                "
              />
            ) : (
              <>
                Get verified

                <ArrowRight
                  className="
                    size-3.5
                    transition-transform
                    duration-300
                    group-hover:translate-x-0.5
                  "
                />
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}


function HeaderLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="
        text-[12px]
        font-semibold
        text-[#66667A]
        transition-colors
        duration-200
        hover:text-[#00A8E8]
      "
    >
      {children}
    </a>
  );
}


function HeroSection({
  request,
  continuing,
  error,
  onContinue,
}: {
  request: PublicVerificationRequest;
  continuing: boolean;
  error: string | null;
  onContinue: () => void;
}) {
  const animatedTitles =
    useMemo(
      () => [
        "securely.",
        "privately.",
        "confidently.",
        "safely.",
        "seamlessly.",
      ],
      [],
    );

  const [
    titleNumber,
    setTitleNumber,
  ] =
    useState(0);

  useEffect(
    () => {
      const timeoutId =
        window.setTimeout(
          () => {
            setTitleNumber(
              (current) =>
                (
                  current +
                  1
                ) %
                animatedTitles.length,
            );
          },
          2200,
        );

      return () => {
        window.clearTimeout(
          timeoutId,
        );
      };
    },
    [
      titleNumber,
      animatedTitles,
    ],
  ); 
  return (
    <section
      id="top"
      className="
        relative
        overflow-hidden
        border-b
        border-[#1A1A40]/[0.05]
      "
    >
      <div
        aria-hidden="true"
        className="
          absolute
          left-[62%]
          top-[-160px]
          size-[620px]
          rounded-full
          bg-[#00A8E8]/[0.08]
          blur-[100px]
        "
      />

      <div
        aria-hidden="true"
        className="
          absolute
          -left-[220px]
          bottom-[-300px]
          size-[520px]
          rounded-full
          bg-[#1A1A40]/[0.04]
          blur-[100px]
        "
      />


      <div
        className="
          relative
          mx-auto
          grid
          min-h-[calc(100svh-72px)]
          w-full
          max-w-[1380px]
          items-center
          gap-12
          px-5
          py-16
          sm:px-8
          sm:py-20
          lg:grid-cols-[0.9fr_1.1fr]
          lg:gap-8
          lg:px-12
          lg:py-12
        "
      >
        <div
          className="
            relative
            z-10
            mx-auto
            max-w-[610px]
            text-center
            lg:mx-0
            lg:text-left
          "
        >
          <div
            className="
              mb-6
              inline-flex
              items-center
              gap-2
              rounded-full
              border
              border-[#00A8E8]/20
              bg-[#00A8E8]/[0.055]
              px-3.5
              py-2
              text-[10px]
              font-bold
              uppercase
              tracking-[0.1em]
              text-[#087EAC]
            "
          >
            <Sparkles
              className="size-3.5"
            />

            Secure identity verification
          </div>


          <h1
  className="
    text-[44px]
    font-extrabold
    leading-[0.98]
    tracking-[-0.06em]
    text-[#11112D]
    sm:text-[58px]
    lg:text-[72px]
    xl:text-[78px]
  "
>
  <span
    className="
      block
    "
  >
    Build trust.
  </span>

  <span
    className="
      mt-[0.04em]
      flex
      flex-wrap
      items-baseline
      justify-center
      gap-x-[0.22em]
      lg:justify-start
    "
  >
    <span>
      Verify
    </span>

    <span
      className="
        relative
        inline-grid
        min-w-[11ch]
        overflow-hidden
        pb-[0.08em]
        text-left
        text-[#00A8E8]
      "
      aria-live="polite"
    >
      {animatedTitles.map(
        (
          title,
          index,
        ) => {
          const active =
            index ===
            titleNumber;

          const previous =
            index ===
            (
              titleNumber -
              1 +
              animatedTitles.length
            ) %
              animatedTitles.length;

          return (
            <span
              key={title}
              aria-hidden={
                !active
              }
              className={`
                col-start-1
                row-start-1
                whitespace-nowrap
                transition-all
                duration-700
                ease-[cubic-bezier(0.22,1,0.36,1)]
                will-change-[transform,opacity]
                ${
                  active
                    ? "translate-y-0 opacity-100 blur-0"
                    : previous
                      ? "-translate-y-[105%] opacity-0 blur-[2px]"
                      : "translate-y-[105%] opacity-0 blur-[2px]"
                }
              `}
            >
              {title}
            </span>
          );
        },
      )}
    </span>
  </span>
</h1>


          <p
            className="
              mx-auto
              mt-7
              max-w-[530px]
              text-[15px]
              leading-7
              text-[#69697E]
              lg:mx-0
              lg:text-[16px]
            "
          >
            Complete your private
            BAKABOOST verification
            before protected server
            access is released.
            Connect the Discord
            account assigned to this
            request and follow the
            secure verification
            steps.
          </p>


          <div
            className="
              mt-8
              flex
              flex-col
              items-stretch
              justify-center
              gap-3
              sm:flex-row
              sm:items-center
              lg:justify-start
            "
          >
            <button
              type="button"
              disabled={continuing}
              onClick={onContinue}
              className="
                group
                inline-flex
                min-h-12
                items-center
                justify-center
                gap-2.5
                rounded-[12px]
                bg-[#00A8E8]
                px-6
                text-[13px]
                font-bold
                text-white
                shadow-[0_12px_30px_rgba(0,168,232,0.22)]
                transition-all
                duration-300
                hover:-translate-y-0.5
                hover:bg-[#0098D2]
                hover:shadow-[0_16px_36px_rgba(0,168,232,0.28)]
                active:translate-y-0
                disabled:pointer-events-none
                disabled:opacity-60
              "
            >
              {continuing ? (
                <>
                  <LoaderCircle
                    className="
                      size-4
                      animate-spin
                    "
                  />

                  Connecting…
                </>
              ) : (
                <>
                  Continue with Discord

                  <ArrowRight
                    className="
                      size-4
                      transition-transform
                      duration-300
                      group-hover:translate-x-1
                    "
                  />
                </>
              )}
            </button>


            <a
              href="#process"
              className="
                inline-flex
                min-h-12
                items-center
                justify-center
                rounded-[12px]
                border
                border-[#1A1A40]/15
                bg-white
                px-6
                text-[13px]
                font-bold
                text-[#1A1A40]
                transition-all
                duration-300
                hover:-translate-y-0.5
                hover:border-[#00A8E8]/40
                hover:bg-[#F8FCFE]
              "
            >
              How verification works
            </a>
          </div>


          <div
            className="
              mt-7
              flex
              flex-wrap
              items-center
              justify-center
              gap-x-5
              gap-y-2
              text-[10px]
              font-semibold
              text-[#747487]
              lg:justify-start
            "
          >
            <MiniTrustItem
              icon={
                <LockKeyhole className="size-3.5" />
              }
            >
              Private request
            </MiniTrustItem>

            <MiniTrustItem
              icon={
                <UserCheck className="size-3.5" />
              }
            >
              Account bound
            </MiniTrustItem>

            <MiniTrustItem
              icon={
                <ShieldCheck className="size-3.5" />
              }
            >
              Manual review
            </MiniTrustItem>
          </div>


          <div
            className="
              mt-7
              inline-flex
              items-center
              gap-2
              rounded-[10px]
              bg-[#F7FAFC]
              px-3
              py-2.5
              text-[10px]
              font-medium
              text-[#737387]
            "
          >
            <Clock3
              className="
                size-3.5
                text-[#00A8E8]
              "
            />

            <span>
              {getTimeRemaining(
                request.expires_at,
              )}
            </span>

            <span
              className="
                text-[#C4C4CD]
              "
            >
              •
            </span>

            <span>
              Expires{" "}
              {formatDateTime(
                request.expires_at,
              )}
            </span>
          </div>


          {error && (
            <div
              role="alert"
              className="
                mt-5
                flex
                items-start
                gap-3
                rounded-[14px]
                border
                border-red-200
                bg-red-50
                p-4
                text-left
                text-xs
                leading-5
                text-red-700
              "
            >
              <AlertTriangle
                className="
                  mt-0.5
                  size-4
                  shrink-0
                "
              />

              {error}
            </div>
          )}
        </div>


        <HeroVisual />
      </div>
    </section>
  );
}


function HeroVisual() {
  return (
    <div
      className="
        relative
        mx-auto
        flex
        min-h-[560px]
        w-full
        max-w-[780px]
        items-center
        justify-center
        sm:min-h-[660px]
        lg:min-h-[720px]
        xl:min-h-[760px]
      "
      style={{
        perspective:
          "1500px",
      }}
    >
      {/* Background glow */}
      <div
        aria-hidden="true"
        className="
          absolute
          left-1/2
          top-1/2
          h-[72%]
          w-[72%]
          -translate-x-1/2
          -translate-y-1/2
          rounded-full
          bg-[#00A8E8]/[0.07]
          blur-[90px]
        "
      />

      {/* Orbit rings */}
      <div
        aria-hidden="true"
        className="
          absolute
          left-1/2
          top-1/2
          h-[72%]
          w-[72%]
          -translate-x-1/2
          -translate-y-1/2
          rounded-full
          border
          border-[#00A8E8]/10
        "
      />

      <div
        aria-hidden="true"
        className="
          absolute
          left-1/2
          top-1/2
          h-[55%]
          w-[55%]
          -translate-x-1/2
          -translate-y-1/2
          rounded-full
          border
          border-[#00A8E8]/10
        "
      />

      {/* Floating info cards */}
      <FloatingCard
        className="
          left-[0%]
          top-[13%]
          hidden
          sm:flex
          lg:left-[-2%]
        "
        icon={
          <FileCheck2
            className="size-4"
          />
        }
        title="Document"
        value="Ready to verify"
      />

      <FloatingCard
        className="
          right-[0%]
          top-[20%]
          hidden
          sm:flex
          lg:right-[-3%]
        "
        icon={
          <ScanFace
            className="size-4"
          />
        }
        title="Face capture"
        value="Live session"
      />

      <FloatingCard
        className="
          bottom-[18%]
          left-[0%]
          hidden
          sm:flex
          lg:left-[-1%]
        "
        icon={
          <ShieldCheck
            className="size-4"
          />
        }
        title="Review"
        value="Human verified"
      />

      <FloatingCard
        className="
          bottom-[11%]
          right-[0%]
          hidden
          sm:flex
          lg:right-[-2%]
        "
        icon={
          <Zap
            className="size-4"
          />
        }
        title="Access"
        value="After approval"
      />

      {/* Floor shadow */}
      <div
        aria-hidden="true"
        className="
          absolute
          bottom-[7%]
          left-1/2
          h-[60px]
          w-[48%]
          -translate-x-1/2
          rounded-[100%]
          bg-[#1A1A40]/20
          blur-[28px]
          sm:h-[75px]
          sm:w-[45%]
        "
      />

      {/* 3D Phone */}
      <div
        className="
          group
          relative
          z-10
          w-[94%]
          max-w-[560px]
          sm:w-[86%]
          sm:max-w-[620px]
          lg:w-[92%]
          lg:max-w-[690px]
          xl:max-w-[730px]
        "
        style={{
          transformStyle:
            "preserve-3d",
        }}
      >
        {/* Back depth / fake side extrusion */}
        <div
          aria-hidden="true"
          className="
            absolute
            inset-[7%]
            translate-x-[18px]
            translate-y-[24px]
            rounded-[42px]
            bg-[#10152D]/10
            blur-[12px]
            transition-all
            duration-700
            ease-out
            group-hover:translate-x-[24px]
            group-hover:translate-y-[30px]
          "
          style={{
            transform:
              "translateZ(-70px)",
          }}
        />

        {/* Main phone render */}
        <div
          className="
            relative
            transition-all
            duration-700
            ease-[cubic-bezier(0.22,1,0.36,1)]
            group-hover:-translate-y-4
            group-hover:scale-[1.035]
          "
          style={{
            transform:
              "rotateY(-11deg) rotateX(3deg) rotateZ(1.5deg)",
            transformStyle:
              "preserve-3d",
          }}
        >
          {/* Blue rim glow */}
          <div
            aria-hidden="true"
            className="
              absolute
              inset-[13%]
              -z-10
              rounded-[50px]
              bg-[#00A8E8]/20
              blur-[40px]
              transition-all
              duration-700
              group-hover:bg-[#00A8E8]/30
              group-hover:blur-[48px]
            "
          />

          <Image
            src="/images/verification-phone-3d.png"
            alt="BAKABOOST secure identity verification on a mobile device"
            width={2600}
            height={3200}
            priority
            unoptimized
            draggable={false}
            className="
              relative
              h-auto
              w-full
              select-none
              object-contain
              transition-transform
              duration-700
              ease-out
            "
          />

          {/* Glass highlight */}
          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              left-[20%]
              top-[10%]
              h-[46%]
              w-[16%]
              rotate-[12deg]
              rounded-full
              bg-gradient-to-b
              from-white/30
              via-white/5
              to-transparent
              opacity-40
              blur-[12px]
              transition-opacity
              duration-700
              group-hover:opacity-60
            "
          />
        </div>
      </div>

      {/* Mobile security badge */}
      <div
        className="
          absolute
          bottom-[2%]
          left-1/2
          z-30
          flex
          -translate-x-1/2
          items-center
          gap-2
          whitespace-nowrap
          rounded-full
          border
          border-[#1A1A40]/[0.07]
          bg-white/90
          px-4
          py-2.5
          text-[10px]
          font-bold
          text-[#55556E]
          shadow-[0_14px_40px_rgba(26,26,64,0.10)]
          backdrop-blur-xl
          sm:hidden
        "
      >
        <LockKeyhole
          className="
            size-3.5
            text-[#00A8E8]
          "
        />

        Secure verification session
      </div>
    </div>
  );
}


function FloatingCard({
  className,
  icon,
  title,
  value,
}: {
  className: string;
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div
      className={`
        absolute
        z-20
        min-w-[150px]
        items-center
        gap-3
        rounded-[14px]
        border
        border-[#1A1A40]/[0.07]
        bg-white/90
        p-3
        shadow-[0_16px_45px_rgba(26,26,64,0.08)]
        backdrop-blur-xl
        transition-all
        duration-500
        hover:-translate-y-1
        hover:shadow-[0_20px_50px_rgba(26,26,64,0.12)]
        ${className}
      `}
    >
      <div
        className="
          flex
          size-9
          shrink-0
          items-center
          justify-center
          rounded-[10px]
          bg-[#EAF9FF]
          text-[#00A8E8]
        "
      >
        {icon}
      </div>

      <div>
        <div
          className="
            text-[9px]
            font-medium
            text-[#89899A]
          "
        >
          {title}
        </div>

        <div
          className="
            mt-0.5
            text-[11px]
            font-bold
            text-[#1A1A40]
          "
        >
          {value}
        </div>
      </div>
    </div>
  );
}


function MiniTrustItem({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="
        flex
        items-center
        gap-1.5
      "
    >
      <span
        className="
          text-[#00A8E8]
        "
      >
        {icon}
      </span>

      {children}
    </div>
  );
}


function TrustStrip() {
  return (
    <section
      className="
        border-b
        border-[#1A1A40]/[0.05]
        bg-white
      "
    >
      <div
        className="
          mx-auto
          max-w-[1200px]
          px-5
          py-12
          text-center
          sm:px-8
        "
      >
        <p
          className="
            text-[10px]
            font-bold
            uppercase
            tracking-[0.14em]
            text-[#9A9AA8]
          "
        >
          Built for controlled access
          and private verification
        </p>

        <div
          className="
            mt-7
            flex
            flex-wrap
            items-center
            justify-center
            gap-x-10
            gap-y-5
            text-[13px]
            font-bold
            text-[#8B8B9B]
            sm:gap-x-16
          "
        >
          <span>ACCOUNT BINDING</span>
          <span>PRIVATE EVIDENCE</span>
          <span>MANUAL REVIEW</span>
          <span>CONTROLLED ACCESS</span>
        </div>
      </div>
    </section>
  );
}


function MetricsSection() {
  const metrics = [
    {
      icon: UserCheck,
      value: "1:1",
      label:
        "Request to Discord account binding",
    },
    {
      icon: Globe2,
      value: "24/7",
      label:
        "Secure verification availability",
    },
    {
      icon: ShieldCheck,
      value: "Human",
      label:
        "Final verification review",
    },
    {
      icon: Timer,
      value: "Timed",
      label:
        "Private request expiration",
    },
  ];

  return (
    <section
      className="
        bg-[#FBFCFE]
        px-5
        py-10
        sm:px-8
      "
    >
      <div
        className="
          mx-auto
          grid
          max-w-[1200px]
          overflow-hidden
          rounded-[18px]
          border
          border-[#1A1A40]/[0.06]
          bg-white
          shadow-[0_10px_40px_rgba(26,26,64,0.035)]
          sm:grid-cols-2
          lg:grid-cols-4
        "
      >
        {metrics.map(
          ({
            icon: Icon,
            value,
            label,
          }) => (
            <div
              key={label}
              className="
                flex
                items-center
                gap-4
                border-b
                border-[#1A1A40]/[0.055]
                p-5
                last:border-b-0
                sm:[&:nth-child(odd)]:border-r
                lg:border-b-0
                lg:border-r
                lg:last:border-r-0
              "
            >
              <div
                className="
                  flex
                  size-11
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-[#EAF9FF]
                  text-[#00A8E8]
                "
              >
                <Icon
                  className="size-5"
                />
              </div>

              <div>
                <div
                  className="
                    text-[18px]
                    font-extrabold
                    tracking-[-0.04em]
                    text-[#1A1A40]
                  "
                >
                  {value}
                </div>

                <div
                  className="
                    mt-0.5
                    text-[9px]
                    leading-4
                    text-[#838394]
                  "
                >
                  {label}
                </div>
              </div>
            </div>
          ),
        )}
      </div>
    </section>
  );
}


function CapabilitiesSection() {
  const features = [
    {
      icon: FileCheck2,
      title:
        "Identity evidence",
      description:
        "Submit the evidence requested for your private verification case.",
    },
    {
      icon: UserCheck,
      title:
        "Discord binding",
      description:
        "The request is checked against the Discord account assigned by the administrator.",
    },
    {
      icon: ScanFace,
      title:
        "Live capture",
      description:
        "Capture fresh selfie or guided face evidence when required by the request.",
    },
    {
      icon: ShieldEllipsis,
      title:
        "Manual review",
      description:
        "Submitted evidence enters a controlled administrator review process.",
    },
    {
      icon: LockKeyhole,
      title:
        "Protected access",
      description:
        "Server access remains unavailable until the verification request is approved.",
    },
  ];

  return (
    <section
      id="features"
      className="
        bg-white
        px-5
        py-20
        sm:px-8
        sm:py-28
      "
    >
      <SectionHeading
        eyebrow="Verification controls"
        title="Everything needed to verify with confidence"
        description="A focused verification flow built around account binding, private evidence and controlled approval."
      />

      <div
        className="
          mx-auto
          mt-12
          grid
          max-w-[1200px]
          gap-3
          sm:grid-cols-2
          lg:grid-cols-5
        "
      >
        {features.map(
          ({
            icon: Icon,
            title,
            description,
          }) => (
            <article
              key={title}
              className="
                group
                rounded-[16px]
                border
                border-[#1A1A40]/[0.07]
                bg-white
                p-5
                transition-all
                duration-300
                hover:-translate-y-1
                hover:border-[#00A8E8]/25
                hover:shadow-[0_18px_50px_rgba(26,26,64,0.07)]
              "
            >
              <div
                className="
                  flex
                  size-9
                  items-center
                  justify-center
                  rounded-[10px]
                  bg-[#F0FAFE]
                  text-[#00A8E8]
                  transition-transform
                  duration-300
                  group-hover:scale-105
                "
              >
                <Icon
                  className="size-4"
                />
              </div>

              <h3
                className="
                  mt-5
                  text-[13px]
                  font-bold
                  tracking-[-0.02em]
                  text-[#1A1A40]
                "
              >
                {title}
              </h3>

              <p
                className="
                  mt-2
                  text-[10px]
                  leading-[1.7]
                  text-[#7B7B8D]
                "
              >
                {description}
              </p>

              <div
                className="
                  mt-5
                  flex
                  items-center
                  gap-1
                  text-[10px]
                  font-bold
                  text-[#00A8E8]
                "
              >
                Secure by design

                <ArrowRight
                  className="
                    size-3
                    transition-transform
                    duration-300
                    group-hover:translate-x-1
                  "
                />
              </div>
            </article>
          ),
        )}
      </div>
    </section>
  );
}


function ProcessSection() {
  const steps = [
    {
      number: "01",
      icon: UserCheck,
      title: "Connect",
      text:
        "Authenticate with the Discord account assigned to the request.",
    },
    {
      number: "02",
      icon: FileCheck2,
      title: "Submit",
      text:
        "Provide the evidence required for your verification case.",
    },
    {
      number: "03",
      icon: ScanFace,
      title: "Review",
      text:
        "Your submitted verification enters administrator review.",
    },
    {
      number: "04",
      icon: BadgeCheck,
      title: "Access",
      text:
        "Controlled server access is released only after approval.",
    },
  ];

  return (
    <section
      id="process"
      className="
        relative
        overflow-hidden
        bg-[#F8FAFD]
        px-5
        py-20
        sm:px-8
        sm:py-28
      "
    >
      <SectionHeading
        eyebrow="Simple by design"
        title="Verify in four clear steps"
        description="Every stage has one purpose, so you always know what happens next."
      />

      <div
        className="
          relative
          mx-auto
          mt-14
          grid
          max-w-[1100px]
          gap-8
          md:grid-cols-4
          md:gap-4
        "
      >
        <div
          aria-hidden="true"
          className="
            absolute
            left-[12%]
            right-[12%]
            top-8
            hidden
            h-px
            bg-gradient-to-r
            from-transparent
            via-[#00A8E8]/25
            to-transparent
            md:block
          "
        />

        {steps.map(
          ({
            number,
            icon: Icon,
            title,
            text,
          }) => (
            <div
              key={number}
              className="
                relative
                z-10
                text-center
              "
            >
              <div
                className="
                  mx-auto
                  flex
                  size-16
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-[#00A8E8]/20
                  bg-white
                  text-[#00A8E8]
                  shadow-[0_10px_30px_rgba(26,26,64,0.06)]
                "
              >
                <Icon
                  className="size-5"
                />
              </div>

              <div
                className="
                  mt-5
                  text-[9px]
                  font-extrabold
                  tracking-[0.14em]
                  text-[#00A8E8]
                "
              >
                STEP {number}
              </div>

              <h3
                className="
                  mt-1.5
                  text-[14px]
                  font-extrabold
                  text-[#1A1A40]
                "
              >
                {title}
              </h3>

              <p
                className="
                  mx-auto
                  mt-2
                  max-w-[210px]
                  text-[10px]
                  leading-[1.65]
                  text-[#808091]
                "
              >
                {text}
              </p>
            </div>
          ),
        )}
      </div>
    </section>
  );
}

type VerificationInsight = {
  id: number;
  icon:
    | typeof UserCheck
    | typeof FileCheck2
    | typeof ScanFace
    | typeof ShieldCheck
    | typeof LockKeyhole
    | typeof Clock3
    | typeof BadgeCheck
    | typeof ShieldEllipsis;
  eyebrow: string;
  title: string;
  description: string;
  detail: string;
};


const verificationInsights: VerificationInsight[] = [
  {
    id: 0,
    icon: UserCheck,
    eyebrow: "Account binding",
    title:
      "One request. One Discord account.",
    description:
      "Your private verification request is assigned to a specific Discord account before evidence can be submitted.",
    detail:
      "The authenticated Discord identity must match the account assigned to the verification request.",
  },

  {
    id: 1,
    icon: FileCheck2,
    eyebrow: "Identity evidence",
    title:
      "Only the evidence requested is collected.",
    description:
      "The verification form asks for the evidence required for your specific request instead of exposing unrelated information.",
    detail:
      "Documents and other evidence remain part of the controlled verification workflow.",
  },

  {
    id: 2,
    icon: ScanFace,
    eyebrow: "Fresh capture",
    title:
      "Camera evidence can be captured live.",
    description:
      "When required, selfie and guided face capture use the device camera instead of accepting an old saved image.",
    detail:
      "Live capture helps ensure fresh session evidence is submitted during verification.",
  },

  {
    id: 3,
    icon: ShieldCheck,
    eyebrow: "Human review",
    title:
      "Approval is not automatic.",
    description:
      "Submitted verification evidence enters an administrator review queue before a final decision is made.",
    detail:
      "The applicant remains outside the protected server while the request is under review.",
  },

  {
    id: 4,
    icon: LockKeyhole,
    eyebrow: "Controlled access",
    title:
      "Verification comes before server access.",
    description:
      "A pending, queued, rejected, expired, or revoked request does not release protected server access.",
    detail:
      "Controlled access becomes available only after the verification request is approved.",
  },

  {
    id: 5,
    icon: Clock3,
    eyebrow: "Request lifetime",
    title:
      "Private links are time-limited.",
    description:
      "Verification requests can expire instead of remaining usable indefinitely.",
    detail:
      "Expiration reduces the lifetime of an unused private verification request.",
  },

  {
    id: 6,
    icon: BadgeCheck,
    eyebrow: "Approval",
    title:
      "The decision belongs to the verification case.",
    description:
      "Approval applies to the account and request that completed the verification workflow.",
    detail:
      "The account used during authentication remains the identity associated with the case.",
  },

  {
    id: 7,
    icon: ShieldEllipsis,
    eyebrow: "Privacy boundary",
    title:
      "Evidence stays inside the verification portal.",
    description:
      "Sensitive verification evidence should be submitted through the secure web flow rather than through Discord messages.",
    detail:
      "Keeping evidence inside the portal creates a clearer security and review boundary.",
  },
];


function VerificationInsightsSection() {
  const [
    activeIndex,
    setActiveIndex,
  ] =
    useState(0);

  const [
    cardWidth,
    setCardWidth,
  ] =
    useState(420);


  useEffect(
    () => {
      function updateCardWidth() {
        if (
          window.innerWidth <
          480
        ) {
          setCardWidth(
            Math.min(
              300,
              window.innerWidth -
                42,
            ),
          );

          return;
        }

        if (
          window.innerWidth <
          768
        ) {
          setCardWidth(
            340,
          );

          return;
        }

        setCardWidth(
          420,
        );
      }


      updateCardWidth();

      window.addEventListener(
        "resize",
        updateCardWidth,
      );

      return () => {
        window.removeEventListener(
          "resize",
          updateCardWidth,
        );
      };
    },
    [],
  );


  function move(
    direction:
      | "next"
      | "previous",
  ) {
    setActiveIndex(
      (current) => {
        if (
          direction ===
          "next"
        ) {
          return (
            current +
            1
          ) %
            verificationInsights.length;
        }

        return (
          current -
          1 +
          verificationInsights.length
        ) %
          verificationInsights.length;
      },
    );
  }


  function selectCard(
    index: number,
  ) {
    setActiveIndex(
      index,
    );
  }


  return (
    <section
      className="
        relative
        overflow-hidden
        bg-white
        px-5
        py-20
        sm:px-8
        sm:py-28
      "
    >
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          left-1/2
          top-[46%]
          h-[520px]
          w-[900px]
          -translate-x-1/2
          -translate-y-1/2
          rounded-full
          bg-[#00A8E8]/[0.055]
          blur-[100px]
        "
      />


      <SectionHeading
        eyebrow="Built into every request"
        title="What your verification protects"
        description="Explore the controls that keep identity verification private, account-bound and approval-driven."
      />


      <div
        className="
          relative
          mx-auto
          mt-12
          h-[580px]
          max-w-[1200px]
          sm:h-[620px]
        "
      >
        {/* Decorative horizontal line */}
        <div
          aria-hidden="true"
          className="
            absolute
            left-1/2
            top-1/2
            h-px
            w-[82%]
            -translate-x-1/2
            bg-gradient-to-r
            from-transparent
            via-[#00A8E8]/15
            to-transparent
          "
        />


        {verificationInsights.map(
          (
            insight,
            index,
          ) => {
            const position =
              getCircularCardPosition(
                index,
                activeIndex,
                verificationInsights.length,
              );

            return (
              <VerificationInsightCard
                key={
                  insight.id
                }
                insight={
                  insight
                }
                position={
                  position
                }
                cardWidth={
                  cardWidth
                }
                onSelect={() => {
                  selectCard(
                    index,
                  );
                }}
              />
            );
          },
        )}


        {/* Controls */}
        <div
          className="
            absolute
            bottom-2
            left-1/2
            z-40
            flex
            -translate-x-1/2
            items-center
            gap-3
          "
        >
          <button
            type="button"
            onClick={() => {
              move(
                "previous",
              );
            }}
            className="
              group
              flex
              size-12
              items-center
              justify-center
              rounded-full
              border
              border-[#1A1A40]/10
              bg-white
              text-[#1A1A40]
              shadow-[0_8px_30px_rgba(26,26,64,0.08)]
              transition-all
              duration-300
              hover:-translate-y-0.5
              hover:border-[#00A8E8]/35
              hover:bg-[#00A8E8]
              hover:text-white
              hover:shadow-[0_12px_34px_rgba(0,168,232,0.20)]
              active:translate-y-0
              active:scale-95
            "
            aria-label="Previous verification control"
          >
            <ChevronLeft
              className="
                size-5
                transition-transform
                duration-300
                group-hover:-translate-x-0.5
              "
            />
          </button>


          <div
            className="
              hidden
              min-w-[94px]
              items-center
              justify-center
              rounded-full
              border
              border-[#1A1A40]/[0.07]
              bg-white/90
              px-4
              py-2.5
              text-[10px]
              font-bold
              text-[#77778A]
              shadow-sm
              backdrop-blur-xl
              sm:flex
            "
          >
            {String(
              activeIndex +
                1,
            ).padStart(
              2,
              "0",
            )}

            <span
              className="
                mx-2
                text-[#CACAD3]
              "
            >
              /
            </span>

            {String(
              verificationInsights.length,
            ).padStart(
              2,
              "0",
            )}
          </div>


          <button
            type="button"
            onClick={() => {
              move(
                "next",
              );
            }}
            className="
              group
              flex
              size-12
              items-center
              justify-center
              rounded-full
              border
              border-[#1A1A40]/10
              bg-white
              text-[#1A1A40]
              shadow-[0_8px_30px_rgba(26,26,64,0.08)]
              transition-all
              duration-300
              hover:-translate-y-0.5
              hover:border-[#00A8E8]/35
              hover:bg-[#00A8E8]
              hover:text-white
              hover:shadow-[0_12px_34px_rgba(0,168,232,0.20)]
              active:translate-y-0
              active:scale-95
            "
            aria-label="Next verification control"
          >
            <ChevronRight
              className="
                size-5
                transition-transform
                duration-300
                group-hover:translate-x-0.5
              "
            />
          </button>
        </div>
      </div>
    </section>
  );
}


function VerificationInsightCard({
  insight,
  position,
  cardWidth,
  onSelect,
}: {
  insight: VerificationInsight;
  position: number;
  cardWidth: number;
  onSelect: () => void;
}) {
  const isActive =
    position === 0;

  const Icon =
    insight.icon;


  const absolutePosition =
    Math.abs(
      position,
    );


  /*
   * Cards farther from the center are
   * progressively faded and pushed back.
   */
  const opacity =
    absolutePosition > 3
      ? 0
      : absolutePosition === 3
        ? 0.14
        : absolutePosition === 2
          ? 0.32
          : absolutePosition === 1
            ? 0.64
            : 1;


  const scale =
    isActive
      ? 1
      : absolutePosition === 1
        ? 0.88
        : absolutePosition === 2
          ? 0.76
          : 0.68;


  const horizontalSpacing =
    cardWidth <
    340
      ? cardWidth *
        0.55
      : cardWidth *
        0.68;


  const translateX =
    horizontalSpacing *
    position;


  const translateY =
    isActive
      ? -24
      : position %
          2 ===
        0
        ? 18
        : -2;


  const rotate =
    isActive
      ? 0
      : position >
          0
        ? 2.2
        : -2.2;


  const zIndex =
    30 -
    absolutePosition;


  return (
    <button
      type="button"
      onClick={
        onSelect
      }
      aria-current={
        isActive
          ? "true"
          : undefined
      }
      className="
        absolute
        left-1/2
        top-[46%]
        overflow-hidden
        text-left
        outline-none
        transition-[transform,opacity,filter,box-shadow,border-color]
        duration-700
        ease-[cubic-bezier(0.22,1,0.36,1)]
        focus-visible:ring-2
        focus-visible:ring-[#00A8E8]
        focus-visible:ring-offset-4
      "
      style={{
        width:
          cardWidth,

        height:
          cardWidth <
          330
            ? 355
            : 390,

        opacity,

        zIndex,

        pointerEvents:
          absolutePosition >
          3
            ? "none"
            : "auto",

        transform: `
          translate(-50%, -50%)
          translateX(${translateX}px)
          translateY(${translateY}px)
          scale(${scale})
          rotate(${rotate}deg)
        `,

        filter:
          isActive
            ? "blur(0px)"
            : `blur(${
                absolutePosition >
                1
                  ? 1.2
                  : 0
              }px)`,
      }}
    >
      <div
        className={`
          relative
          h-full
          overflow-hidden
          rounded-[26px]
          border
          p-6
          transition-all
          duration-700
          sm:p-7
          ${
            isActive
              ? `
                border-[#00A8E8]/25
                bg-[#1A1A40]
                text-white
                shadow-[0_28px_80px_rgba(26,26,64,0.22)]
              `
              : `
                border-[#1A1A40]/[0.08]
                bg-white
                text-[#1A1A40]
                shadow-[0_16px_45px_rgba(26,26,64,0.07)]
              `
          }
        `}
      >
        {/* Corner accent */}
        <div
          aria-hidden="true"
          className={`
            absolute
            right-0
            top-0
            h-[72px]
            w-[72px]
            rounded-bl-[55px]
            transition-colors
            duration-700
            ${
              isActive
                ? "bg-[#00A8E8]"
                : "bg-[#EAF9FF]"
            }
          `}
        />


        <div
          aria-hidden="true"
          className={`
            absolute
            right-[22px]
            top-[22px]
            z-10
            size-2
            rounded-full
            ${
              isActive
                ? "bg-white"
                : "bg-[#00A8E8]"
            }
          `}
        />


        <div
          className={`
            flex
            size-11
            items-center
            justify-center
            rounded-[13px]
            transition-all
            duration-700
            ${
              isActive
                ? `
                  bg-white/10
                  text-[#68D8FF]
                `
                : `
                  bg-[#EAF9FF]
                  text-[#00A8E8]
                `
            }
          `}
        >
          <Icon
            className="size-5"
          />
        </div>


        <div
          className={`
            mt-6
            text-[9px]
            font-extrabold
            uppercase
            tracking-[0.14em]
            ${
              isActive
                ? "text-[#69D8FF]"
                : "text-[#00A8E8]"
            }
          `}
        >
          {insight.eyebrow}
        </div>


        <h3
          className="
            mt-2
            max-w-[310px]
            text-[21px]
            font-extrabold
            leading-[1.18]
            tracking-[-0.04em]
            sm:text-[24px]
          "
        >
          {insight.title}
        </h3>


        <p
          className={`
            mt-4
            max-w-[325px]
            text-[11px]
            leading-[1.75]
            ${
              isActive
                ? "text-white/65"
                : "text-[#737386]"
            }
          `}
        >
          {insight.description}
        </p>


        <div
          className={`
            absolute
            inset-x-6
            bottom-6
            flex
            items-start
            gap-2.5
            border-t
            pt-4
            text-[9px]
            leading-[1.65]
            sm:inset-x-7
            ${
              isActive
                ? `
                  border-white/10
                  text-white/55
                `
                : `
                  border-[#1A1A40]/[0.07]
                  text-[#8A8A99]
                `
            }
          `}
        >
          <div
            className={`
              mt-0.5
              flex
              size-5
              shrink-0
              items-center
              justify-center
              rounded-full
              ${
                isActive
                  ? `
                    bg-[#00A8E8]/15
                    text-[#68D8FF]
                  `
                  : `
                    bg-[#EAF9FF]
                    text-[#00A8E8]
                  `
              }
            `}
          >
            <Check
              className="size-3"
            />
          </div>

          <span>
            {insight.detail}
          </span>
        </div>
      </div>
    </button>
  );
}


function getCircularCardPosition(
  index: number,
  activeIndex: number,
  total: number,
): number {
  let position =
    index -
    activeIndex;

  const half =
    Math.floor(
      total /
        2,
    );


  if (
    position >
    half
  ) {
    position -=
      total;
  }


  if (
    position <
    -half
  ) {
    position +=
      total;
  }


  return position;
}

function SecuritySection() {
  return (
    <section
      id="security"
      className="
        bg-white
        px-5
        py-20
        sm:px-8
        sm:py-24
      "
    >
      <div
        className="
          relative
          mx-auto
          grid
          max-w-[1200px]
          overflow-hidden
          rounded-[24px]
          bg-[#11152F]
          px-6
          py-10
          text-white
          shadow-[0_25px_70px_rgba(17,21,47,0.16)]
          sm:px-10
          lg:grid-cols-2
          lg:items-center
          lg:px-14
          lg:py-14
        "
      >
        <div
          aria-hidden="true"
          className="
            absolute
            -right-20
            -top-28
            size-[420px]
            rounded-full
            bg-[#00A8E8]/15
            blur-[90px]
          "
        />

        <div
          className="
            relative
            z-10
            max-w-[470px]
          "
        >
          <div
            className="
              text-[10px]
              font-bold
              uppercase
              tracking-[0.14em]
              text-[#71D7FF]
            "
          >
            Security at the core
          </div>

          <h2
            className="
              mt-3
              text-[30px]
              font-extrabold
              tracking-[-0.045em]
              sm:text-[38px]
            "
          >
            Verification designed
            around controlled trust.
          </h2>

          <p
            className="
              mt-4
              text-[12px]
              leading-6
              text-white/65
            "
          >
            Your private request,
            Discord account and
            submitted evidence move
            through a controlled
            verification workflow
            before access can be
            released.
          </p>

          <div
            className="
              mt-7
              space-y-3
            "
          >
            {[
              "Private request binding",
              "Discord account verification",
              "Controlled evidence submission",
              "Administrator review before access",
            ].map(
              (item) => (
                <div
                  key={item}
                  className="
                    flex
                    items-center
                    gap-2.5
                    text-[11px]
                    font-medium
                    text-white/80
                  "
                >
                  <div
                    className="
                      flex
                      size-5
                      items-center
                      justify-center
                      rounded-full
                      bg-[#00A8E8]/15
                      text-[#65D5FF]
                    "
                  >
                    <Check
                      className="size-3"
                    />
                  </div>

                  {item}
                </div>
              ),
            )}
          </div>
        </div>


        <div
          className="
            relative
            z-10
            mt-12
            flex
            items-center
            justify-center
            lg:mt-0
          "
        >
          <div
            className="
              relative
              flex
              size-[240px]
              items-center
              justify-center
              sm:size-[300px]
            "
          >
            <div
              className="
                absolute
                inset-0
                rounded-full
                border
                border-[#00A8E8]/15
              "
            />

            <div
              className="
                absolute
                inset-[15%]
                rounded-full
                border
                border-[#00A8E8]/20
              "
            />

            <div
              className="
                absolute
                inset-[30%]
                rounded-full
                bg-[#00A8E8]/10
                blur-xl
              "
            />

            <div
              className="
                relative
                flex
                size-32
                items-center
                justify-center
                rounded-[36px]
                border
                border-white/10
                bg-gradient-to-br
                from-[#00A8E8]
                to-[#1768D4]
                shadow-[0_25px_60px_rgba(0,168,232,0.25)]
                sm:size-40
              "
            >
              <LockKeyhole
                className="
                  size-14
                  text-white
                  sm:size-16
                "
                strokeWidth={1.6}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


function DeveloperSection() {
  return (
    <section
      id="developers"
      className="
        bg-[#FBFCFE]
        px-5
        py-20
        sm:px-8
        sm:py-24
      "
    >
      <div
        className="
          mx-auto
          grid
          max-w-[1200px]
          gap-10
          lg:grid-cols-[0.75fr_1.25fr]
          lg:items-center
        "
      >
        <div>
          <div
            className="
              flex
              size-10
              items-center
              justify-center
              rounded-[11px]
              bg-[#EAF9FF]
              text-[#00A8E8]
            "
          >
            <Code2
              className="size-5"
            />
          </div>

          <h2
            className="
              mt-5
              text-[30px]
              font-extrabold
              tracking-[-0.045em]
              text-[#1A1A40]
              sm:text-[38px]
            "
          >
            Built as a secure
            verification system.
          </h2>

          <p
            className="
              mt-4
              max-w-[450px]
              text-[12px]
              leading-6
              text-[#77778B]
            "
          >
            Account authentication,
            evidence handling,
            administrator review and
            controlled access work as
            one connected verification
            flow.
          </p>
        </div>


        <div
          className="
            overflow-hidden
            rounded-[20px]
            border
            border-[#1A1A40]/10
            bg-[#10152D]
            shadow-[0_20px_60px_rgba(26,26,64,0.12)]
          "
        >
          <div
            className="
              flex
              items-center
              gap-1.5
              border-b
              border-white/10
              px-5
              py-4
            "
          >
            <span
              className="
                size-2
                rounded-full
                bg-white/20
              "
            />
            <span
              className="
                size-2
                rounded-full
                bg-white/20
              "
            />
            <span
              className="
                size-2
                rounded-full
                bg-white/20
              "
            />

            <span
              className="
                ml-3
                text-[9px]
                font-semibold
                text-white/40
              "
            >
              verification-flow
            </span>
          </div>

          <div
            className="
              grid
              gap-px
              bg-white/10
              sm:grid-cols-2
            "
          >
            <div
              className="
                bg-[#10152D]
                p-6
                font-mono
                text-[10px]
                leading-6
                text-white/65
              "
            >
              <div
                className="
                  text-[#5DD7FF]
                "
              >
                verification.request
              </div>

              <div className="mt-3">
                {"{"}
              </div>

              <div className="pl-4">
                account:{" "}
                <span className="text-[#7FE5B5]">
                  &quot;discord&quot;
                </span>
                ,
              </div>

              <div className="pl-4">
                evidence:{" "}
                <span className="text-[#7FE5B5]">
                  &quot;required&quot;
                </span>
                ,
              </div>

              <div className="pl-4">
                review:{" "}
                <span className="text-[#7FE5B5]">
                  &quot;manual&quot;
                </span>
              </div>

              <div>
                {"}"}
              </div>
            </div>


            <div
              className="
                bg-[#10152D]
                p-6
                font-mono
                text-[10px]
                leading-6
                text-white/65
              "
            >
              <div
                className="
                  text-[#5DD7FF]
                "
              >
                access.policy
              </div>

              <div className="mt-3">
                {"{"}
              </div>

              <div className="pl-4">
                status:{" "}
                <span className="text-[#7FE5B5]">
                  &quot;approved&quot;
                </span>
                ,
              </div>

              <div className="pl-4">
                release:{" "}
                <span className="text-[#7FE5B5]">
                  true
                </span>
              </div>

              <div>
                {"}"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


function FinalCta({
  continuing,
  onContinue,
}: {
  continuing: boolean;
  onContinue: () => void;
}) {
  return (
    <section
      className="
        bg-white
        px-5
        py-16
        sm:px-8
      "
    >
      <div
        className="
          relative
          mx-auto
          flex
          max-w-[1200px]
          flex-col
          items-center
          justify-between
          gap-7
          overflow-hidden
          rounded-[22px]
          bg-gradient-to-r
          from-[#1A1A40]
          via-[#172F5D]
          to-[#00A8E8]
          px-6
          py-9
          text-center
          text-white
          shadow-[0_20px_55px_rgba(26,26,64,0.14)]
          md:flex-row
          md:px-10
          md:text-left
        "
      >
        <div
          aria-hidden="true"
          className="
            absolute
            -right-20
            -top-28
            size-64
            rounded-full
            bg-white/10
            blur-3xl
          "
        />

        <div
          className="
            relative
            z-10
          "
        >
          <h2
            className="
              text-[22px]
              font-extrabold
              tracking-[-0.035em]
              sm:text-[26px]
            "
          >
            Ready to complete your
            verification?
          </h2>

          <p
            className="
              mt-1.5
              text-[11px]
              text-white/70
            "
          >
            Authenticate with the
            Discord account assigned
            to this private request.
          </p>
        </div>


        <button
          type="button"
          disabled={continuing}
          onClick={onContinue}
          className="
            group
            relative
            z-10
            inline-flex
            min-h-11
            shrink-0
            items-center
            justify-center
            gap-2
            rounded-[11px]
            bg-white
            px-5
            text-[11px]
            font-bold
            text-[#1A1A40]
            shadow-lg
            transition-all
            duration-300
            hover:-translate-y-0.5
            hover:shadow-xl
            disabled:pointer-events-none
            disabled:opacity-60
          "
        >
          {continuing ? (
            <>
              <LoaderCircle
                className="
                  size-3.5
                  animate-spin
                "
              />

              Connecting…
            </>
          ) : (
            <>
              Continue with Discord

              <ArrowRight
                className="
                  size-3.5
                  transition-transform
                  duration-300
                  group-hover:translate-x-1
                "
              />
            </>
          )}
        </button>
      </div>
    </section>
  );
}


function SiteFooter() {
  return (
    <footer
      className="
        border-t
        border-[#1A1A40]/[0.06]
        bg-white
      "
    >
      <div
        className="
          mx-auto
          max-w-[1200px]
          px-5
          py-12
          sm:px-8
        "
      >
        <div
          className="
            grid
            gap-10
            md:grid-cols-[1.5fr_1fr_1fr_1fr]
          "
        >
          <div>
            <div
              className="
                flex
                items-center
                gap-2.5
              "
            >
              <div
                className="
                  flex
                  size-8
                  items-center
                  justify-center
                  rounded-[10px]
                  bg-[#1A1A40]
                  text-white
                "
              >
                <ShieldCheck
                  className="size-4"
                />
              </div>

              <span
                className="
                  text-[16px]
                  font-extrabold
                  tracking-[-0.04em]
                  text-[#11112D]
                "
              >
                BAKABOOST
              </span>
            </div>

            <p
              className="
                mt-4
                max-w-[260px]
                text-[10px]
                leading-5
                text-[#858596]
              "
            >
              Secure private identity
              verification before
              protected Discord server
              access.
            </p>
          </div>


          <FooterColumn
            title="Verification"
            links={[
              ["Features", "#features"],
              ["Process", "#process"],
              ["Security", "#security"],
            ]}
          />

          <FooterColumn
            title="Resources"
            links={[
              ["Developers", "#developers"],
              ["Private request", "#top"],
            ]}
          />

          <div>
            <div
              className="
                text-[10px]
                font-bold
                uppercase
                tracking-[0.1em]
                text-[#1A1A40]
              "
            >
              Session
            </div>

            <div
              className="
                mt-4
                flex
                items-center
                gap-2
                text-[10px]
                text-[#858596]
              "
            >
              <LockKeyhole
                className="
                  size-3.5
                  text-[#00A8E8]
                "
              />

              Secure verification
            </div>
          </div>
        </div>


        <div
          className="
            mt-10
            flex
            flex-col
            gap-3
            border-t
            border-[#1A1A40]/[0.06]
            pt-6
            text-[9px]
            text-[#9A9AA8]
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <span>
            © {new Date().getFullYear()} BAKABOOST.
            All rights reserved.
          </span>

          <span>
            Private identity verification
            • Controlled access
          </span>
        </div>
      </div>
    </footer>
  );
}


function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<
    [string, string]
  >;
}) {
  return (
    <div>
      <div
        className="
          text-[10px]
          font-bold
          uppercase
          tracking-[0.1em]
          text-[#1A1A40]
        "
      >
        {title}
      </div>

      <div
        className="
          mt-4
          flex
          flex-col
          gap-2.5
        "
      >
        {links.map(
          ([label, href]) => (
            <a
              key={label}
              href={href}
              className="
                w-fit
                text-[10px]
                text-[#858596]
                transition-colors
                hover:text-[#00A8E8]
              "
            >
              {label}
            </a>
          ),
        )}
      </div>
    </div>
  );
}


function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div
      className="
        mx-auto
        max-w-[680px]
        text-center
      "
    >
      <div
        className="
          text-[10px]
          font-extrabold
          uppercase
          tracking-[0.14em]
          text-[#00A8E8]
        "
      >
        {eyebrow}
      </div>

      <h2
        className="
          mt-3
          text-[30px]
          font-extrabold
          tracking-[-0.045em]
          text-[#1A1A40]
          sm:text-[40px]
        "
      >
        {title}
      </h2>

      <p
        className="
          mx-auto
          mt-4
          max-w-[540px]
          text-[12px]
          leading-6
          text-[#7A7A8D]
        "
      >
        {description}
      </p>
    </div>
  );
}


function VerificationHeroLoader() {
  return (
    <main
      className="
        relative
        flex
        min-h-[100svh]
        items-center
        justify-center
        overflow-hidden
        bg-white
        text-[#1A1A40]
      "
    >
      <div
        aria-hidden="true"
        className="
          absolute
          left-1/2
          top-1/2
          size-[360px]
          -translate-x-1/2
          -translate-y-1/2
          rounded-full
          bg-[#00A8E8]/10
          blur-[90px]
        "
      />

      <div
        className="
          relative
          z-10
          flex
          flex-col
          items-center
          text-center
        "
      >
        <div
          className="
            flex
            size-14
            items-center
            justify-center
            rounded-[16px]
            bg-[#1A1A40]
            text-white
            shadow-[0_14px_35px_rgba(26,26,64,0.18)]
          "
        >
          <LoaderCircle
            className="
              size-6
              animate-spin
            "
          />
        </div>

        <div
          className="
            mt-5
            text-[16px]
            font-extrabold
            tracking-[-0.03em]
          "
        >
          BAKABOOST
        </div>

        <p
          className="
            mt-2
            text-[10px]
            font-semibold
            uppercase
            tracking-[0.13em]
            text-[#89899A]
          "
        >
          Checking private request
        </p>
      </div>
    </main>
  );
}


function UnavailableCard({
  message,
}: {
  message: string;
}) {
  return (
    <section
      className="
        mx-auto
        max-w-[700px]
        rounded-[24px]
        border
        border-[#1A1A40]/[0.07]
        bg-white
        px-7
        py-12
        text-center
        shadow-[0_20px_60px_rgba(26,26,64,0.06)]
        sm:px-12
      "
    >
      <div
        className="
          mx-auto
          flex
          size-14
          items-center
          justify-center
          rounded-[16px]
          bg-red-50
          text-red-500
        "
      >
        <XCircle
          className="size-6"
        />
      </div>

      <h1
        className="
          mt-6
          text-3xl
          font-extrabold
          tracking-[-0.045em]
          text-[#1A1A40]
        "
      >
        Request unavailable
      </h1>

      <p
        className="
          mx-auto
          mt-3
          max-w-[460px]
          text-sm
          leading-6
          text-[#77778A]
        "
      >
        {message}
      </p>

      <p
        className="
          mx-auto
          mt-5
          max-w-[460px]
          text-xs
          leading-5
          text-[#9999A7]
        "
      >
        If you believe this is
        unexpected, contact the
        administrator who issued
        your verification request.
      </p>
    </section>
  );
}


function ExistingStatusCard({
  request,
  isTerminal,
}: {
  request: PublicVerificationRequest;
  isTerminal: boolean;
}) {
  const presentation =
    verificationStatusPresentation[
      request.status
    ];

  const positive =
    request.status ===
    "approved";

  const Icon =
    positive
      ? CheckCircle2
      : isTerminal
        ? XCircle
        : Clock3;

  return (
    <section
      className="
        mx-auto
        max-w-[740px]
        rounded-[24px]
        border
        border-[#1A1A40]/[0.07]
        bg-white
        px-7
        py-12
        text-center
        shadow-[0_20px_60px_rgba(26,26,64,0.06)]
        sm:px-12
      "
    >
      <div
        className={`
          mx-auto
          flex
          size-14
          items-center
          justify-center
          rounded-[16px]
          ${
            positive
              ? "bg-emerald-50 text-emerald-600"
              : isTerminal
                ? "bg-red-50 text-red-500"
                : "bg-[#EAF9FF] text-[#00A8E8]"
          }
        `}
      >
        <Icon
          className="size-6"
        />
      </div>

      <div
        className="
          mt-5
          text-[10px]
          font-bold
          uppercase
          tracking-[0.12em]
          text-[#90909F]
        "
      >
        {request.status.replace(
          "_",
          " ",
        )}
      </div>

      <h1
        className="
          mt-2
          text-[30px]
          font-extrabold
          tracking-[-0.045em]
          text-[#1A1A40]
        "
      >
        {presentation.label}
      </h1>

      <p
        className="
          mx-auto
          mt-4
          max-w-[510px]
          text-sm
          leading-6
          text-[#77778A]
        "
      >
        {presentation.description}
      </p>

      <div
        className="
          mx-auto
          mt-7
          max-w-[440px]
          rounded-[14px]
          border
          border-[#1A1A40]/[0.07]
          bg-[#FAFBFD]
          p-4
          text-xs
          text-[#77778A]
        "
      >
        Request expiration:{" "}

        <strong
          className="
            text-[#1A1A40]
          "
        >
          {formatDateTime(
            request.expires_at,
          )}
        </strong>
      </div>
    </section>
  );
}