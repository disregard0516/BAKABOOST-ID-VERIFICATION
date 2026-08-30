"use client";

import {
  Check,
  CheckCircle2,
  FileCheck2,
  LoaderCircle,
  MonitorSmartphone,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react";

import {
  QRCodeSVG,
} from "qrcode.react";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createMobileCapture,
  getMobileCaptureStatus,
  revokeMobileCapture,
} from "@/lib/mobile-capture-api";

import {
  getTimeRemaining,
} from "@/lib/date";

import type {
  MobileCaptureCreateResponse,
  MobileCaptureStatusResponse,
} from "@/types/mobile-capture";

import type {
  EvidenceType,
  UploadedEvidence,
} from "@/types/evidence";


const EVIDENCE_LABELS: Partial<
  Record<
    EvidenceType,
    string
  >
> = {
  document_front:
    "Document front",

  document_back:
    "Document back",

  selfie:
    "Selfie",

  liveness:
    "Face capture",
};


export function MobileCaptureHandoff({
  onEvidenceReceived,
}: {
  onEvidenceReceived?: (
    evidence: UploadedEvidence,
  ) => void;
}) {
  const [
    capture,
    setCapture,
  ] =
    useState<MobileCaptureCreateResponse | null>(
      null,
    );

  const [
    statusResult,
    setStatusResult,
  ] =
    useState<MobileCaptureStatusResponse | null>(
      null,
    );

  const [
    creating,
    setCreating,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const deliveredEvidenceIds =
    useRef<Set<string>>(
      new Set(),
    );


  const resetLocalCaptureState =
    useCallback(() => {
      setStatusResult(
        null,
      );

      deliveredEvidenceIds
        .current
        .clear();
    }, []);


  const create =
    useCallback(
      async () => {
        setCreating(
          true,
        );

        setError(
          null,
        );

        resetLocalCaptureState();

        try {
          const result =
            await createMobileCapture();

          setCapture(
            result,
          );
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to create mobile capture session.",
          );
        } finally {
          setCreating(
            false,
          );
        }
      },
      [
        resetLocalCaptureState,
      ],
    );


  useEffect(() => {
    if (!capture) {
      return;
    }

    const activeCapture =
      capture;

    let active =
      true;

    let timer:
      number | null =
      null;


    async function poll(): Promise<void> {
      try {
        const result =
          await getMobileCaptureStatus(
            activeCapture.id,
          );

        if (!active) {
          return;
        }

        setStatusResult(
          result,
        );

        for (
          const evidence
          of result.uploads
        ) {
          if (
            deliveredEvidenceIds
              .current
              .has(
                evidence.evidence_id,
              )
          ) {
            continue;
          }

          deliveredEvidenceIds
            .current
            .add(
              evidence.evidence_id,
            );

          onEvidenceReceived?.({
            evidenceId:
              evidence.evidence_id,

            evidenceType:
              evidence.evidence_type,

            filename:
              `Phone capture · ${
                EVIDENCE_LABELS[
                  evidence.evidence_type
                ] ??
                evidence.evidence_type.replaceAll(
                  "_",
                  " ",
                )
              }`,

            contentType:
              evidence.content_type,

            sizeBytes:
              evidence.size_bytes,
          });
        }

        if (
          result.completed_at ||
          result.status ===
            "completed"
        ) {
          return;
        }
      } catch {
        /*
         * A temporary polling failure should
         * not destroy the QR UI. The next poll
         * can recover automatically.
         */
      }

      if (active) {
        timer =
          window.setTimeout(
            () => {
              void poll();
            },
            2500,
          );
      }
    }

    void poll();

    return () => {
      active =
        false;

      if (timer !== null) {
        window.clearTimeout(
          timer,
        );
      }
    };
  }, [
    capture,
    onEvidenceReceived,
  ]);


  async function close(): Promise<void> {
    if (capture) {
      try {
        await revokeMobileCapture(
          capture.id,
        );
      } catch {
        /*
         * It may already be expired,
         * completed, or revoked.
         */
      }
    }

    setCapture(
      null,
    );

    setError(
      null,
    );

    resetLocalCaptureState();
  }


  const connected =
    Boolean(
      statusResult?.connected,
    );


  const completed =
    Boolean(
      statusResult?.completed_at ||
      statusResult?.status ===
        "completed",
    );


  const uploads =
    statusResult?.uploads ??
    [];


  const uploadCount =
    uploads.length;


  const mobileUrl =
    useMemo(
      () => {
        if (
          !capture ||
          typeof window ===
            "undefined"
        ) {
          return "";
        }

        /*
         * The temporary QR credential lives
         * in the fragment rather than the URL
         * path/query.
         *
         * Browser fragments are not included
         * in normal HTTP requests to the server.
         */
        return (
          `${window.location.origin}` +
          `/mobile#${encodeURIComponent(
            capture.handoff_token,
          )}`
        );
      },
      [
        capture,
      ],
    );


  if (!capture) {
    return (
      <div
        className="
          overflow-hidden
          rounded-[20px]
          border
          border-[#ded9ff]
          bg-[linear-gradient(145deg,#faf9ff,#f4f1ff)]
          p-5
        "
      >
        <div
          className="
            flex
            items-start
            gap-4
          "
        >
          <div
            className="
              flex
              size-12
              shrink-0
              items-center
              justify-center
              rounded-[15px]
              bg-white
              text-[#6657f5]
              shadow-[0_9px_30px_rgba(82,65,184,0.09)]
            "
          >
            <MonitorSmartphone
              className="size-5"
              aria-hidden="true"
            />
          </div>

          <div className="flex-1">
            <div
              className="
                text-sm
                font-bold
                text-[#292631]
              "
            >
              Continue on your phone
            </div>

            <p
              className="
                mt-1
                max-w-[520px]
                text-[11px]
                leading-5
                text-[#817c8c]
              "
            >
              Use your phone camera for clearer
              document photos. Evidence captured
              there will appear here automatically.
            </p>

            <button
              type="button"
              disabled={
                creating
              }
              onClick={() => {
                void create();
              }}
              className="
                mt-4
                inline-flex
                h-10
                items-center
                justify-center
                gap-2
                rounded-[13px]
                bg-[#6657f5]
                px-4
                text-[10px]
                font-bold
                text-white
                transition
                hover:bg-[#5949df]
                disabled:opacity-50
              "
            >
              {creating ? (
                <LoaderCircle
                  className="
                    size-3.5
                    animate-spin
                  "
                  aria-hidden="true"
                />
              ) : (
                <Smartphone
                  className="size-3.5"
                  aria-hidden="true"
                />
              )}

              Use phone camera
            </button>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="
              mt-3
              text-[10px]
              leading-5
              text-[#b63e4d]
            "
          >
            {error}
          </p>
        )}
      </div>
    );
  }


  return (
    <div
      className="
        relative
        overflow-hidden
        rounded-[24px]
        border
        border-[#dcd7ff]
        bg-[linear-gradient(145deg,#ffffff,#f5f2ff)]
        p-6
        shadow-[0_18px_55px_rgba(74,56,166,0.09)]
      "
    >
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -right-20
          -top-20
          size-52
          rounded-full
          bg-[#7565ff]/10
          blur-3xl
        "
      />

      <button
        type="button"
        aria-label="Cancel mobile capture"
        onClick={() => {
          void close();
        }}
        className="
          absolute
          right-4
          top-4
          z-10
          flex
          size-8
          items-center
          justify-center
          rounded-xl
          text-[#9893a4]
          transition
          hover:bg-black/[0.04]
          hover:text-[#393541]
        "
      >
        <X
          className="size-4"
          aria-hidden="true"
        />
      </button>


      <div
        className="
          relative
          grid
          gap-7
          md:grid-cols-[190px_1fr]
          md:items-start
        "
      >
        <div>
          <div
            className="
              mx-auto
              rounded-[22px]
              border
              border-[#ebe8f2]
              bg-white
              p-4
              shadow-[0_14px_40px_rgba(37,30,72,0.08)]
            "
          >
            <QRCodeSVG
              value={
                mobileUrl
              }
              size={158}
              level="H"
              marginSize={1}
              title="Secure mobile document capture QR code"
            />
          </div>

          <p
            className="
              mt-3
              text-center
              text-[8px]
              font-medium
              leading-4
              text-[#aaa5b2]
            "
          >
            Temporary evidence-only access
          </p>
        </div>


        <div className="min-w-0">
          <div
            className="
              flex
              items-center
              gap-2
              text-[10px]
              font-bold
              uppercase
              tracking-[0.1em]
              text-[#6657f5]
            "
          >
            <ShieldCheck
              className="size-3.5"
              aria-hidden="true"
            />

            Secure device handoff
          </div>


          <h3
            className="
              mt-2
              text-[22px]
              font-bold
              tracking-[-0.035em]
              text-[#1d1a25]
            "
          >
            {completed
              ? "Phone capture complete"
              : connected
                ? "Phone connected"
                : "Scan with your phone"}
          </h3>


          <p
            className="
              mt-2
              max-w-[440px]
              text-[11px]
              leading-5
              text-[#7e7989]
            "
          >
            {completed
              ? "Your phone finished the capture. The received evidence is now attached to this verification form."
              : connected
                ? "Keep this page open while you capture the requested evidence on your phone. Received items appear here automatically."
                : "Open your phone camera and scan this QR code. The QR grants only temporary evidence-capture access."}
          </p>


          <div
            className="
              mt-5
              flex
              flex-wrap
              items-center
              gap-2
            "
          >
            <StatusPill
              connected={
                connected
              }
              completed={
                completed
              }
            />

            <div
              className="
                rounded-full
                bg-[#f4f2f8]
                px-3
                py-1.5
                text-[9px]
                font-semibold
                text-[#8c8796]
              "
            >
              {getTimeRemaining(
                capture.expires_at,
              )}
            </div>

            {uploadCount > 0 && (
              <div
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  rounded-full
                  bg-emerald-50
                  px-3
                  py-1.5
                  text-[9px]
                  font-bold
                  text-emerald-700
                "
              >
                <FileCheck2
                  className="size-3"
                  aria-hidden="true"
                />

                {uploadCount} received
              </div>
            )}
          </div>


          <CaptureTimeline
            connected={
              connected
            }
            completed={
              completed
            }
            uploads={
              uploads
            }
          />


          {!connected &&
            !completed && (
            <button
              type="button"
              disabled={
                creating
              }
              onClick={() => {
                void create();
              }}
              className="
                mt-5
                inline-flex
                min-h-10
                items-center
                gap-2
                rounded-[12px]
                border
                border-[#ded9ff]
                bg-white
                px-3.5
                text-[9px]
                font-bold
                text-[#6657f5]
                transition
                hover:bg-[#f8f7ff]
                disabled:opacity-50
              "
            >
              <RefreshCw
                className={`
                  size-3.5
                  ${
                    creating
                      ? "animate-spin"
                      : ""
                  }
                `}
                aria-hidden="true"
              />

              Generate new QR
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


function CaptureTimeline({
  connected,
  completed,
  uploads,
}: {
  connected: boolean;

  completed: boolean;

  uploads:
    MobileCaptureStatusResponse[
      "uploads"
    ];
}) {
  return (
    <div
      className="
        mt-6
        overflow-hidden
        rounded-[16px]
        border
        border-[#ebe8f2]
        bg-white/70
      "
    >
      <TimelineRow
        label="Phone connected"
        complete={
          connected ||
          completed
        }
        active={
          !connected &&
          !completed
        }
      />

      {uploads.map(
        (evidence) => (
          <TimelineRow
            key={
              evidence.evidence_id
            }
            label={
              EVIDENCE_LABELS[
                evidence.evidence_type
              ] ??
              evidence.evidence_type.replaceAll(
                "_",
                " ",
              )
            }
            complete
            active={false}
          />
        ),
      )}

      {connected &&
        !completed && (
        <TimelineRow
          label={
            uploads.length > 0
              ? "Waiting for remaining evidence"
              : "Waiting for first capture"
          }
          complete={false}
          active
        />
      )}

      {completed && (
        <TimelineRow
          label="Ready on desktop"
          complete
          active={false}
          last
        />
      )}
    </div>
  );
}


function TimelineRow({
  label,
  complete,
  active,
  last = false,
}: {
  label: string;

  complete: boolean;

  active: boolean;

  last?: boolean;
}) {
  return (
    <div
      className={`
        flex
        min-h-11
        items-center
        gap-3
        px-3.5
        ${
          !last
            ? "border-b border-[#f0edf5]"
            : ""
        }
      `}
    >
      <div
        className={`
          flex
          size-6
          shrink-0
          items-center
          justify-center
          rounded-full
          ${
            complete
              ? "bg-emerald-100 text-emerald-700"
              : active
                ? "bg-[#efedff] text-[#6757db]"
                : "bg-[#f4f2f7] text-[#aaa5b2]"
          }
        `}
      >
        {complete ? (
          <Check
            className="size-3"
            aria-hidden="true"
          />
        ) : active ? (
          <LoaderCircle
            className="
              size-3
              animate-spin
            "
            aria-hidden="true"
          />
        ) : (
          <span
            className="
              size-1.5
              rounded-full
              bg-current
            "
          />
        )}
      </div>

      <div
        className={`
          text-[9px]
          font-semibold
          capitalize
          ${
            complete
              ? "text-emerald-800"
              : active
                ? "text-[#6757db]"
                : "text-[#9a95a3]"
          }
        `}
      >
        {label}
      </div>
    </div>
  );
}


function StatusPill({
  connected,
  completed,
}: {
  connected: boolean;

  completed: boolean;
}) {
  if (completed) {
    return (
      <div
        className="
          inline-flex
          items-center
          gap-2
          rounded-full
          bg-emerald-50
          px-3
          py-1.5
          text-[9px]
          font-bold
          text-emerald-700
        "
      >
        <CheckCircle2
          className="size-3"
          aria-hidden="true"
        />

        Complete
      </div>
    );
  }

  if (connected) {
    return (
      <div
        className="
          inline-flex
          items-center
          gap-2
          rounded-full
          bg-emerald-50
          px-3
          py-1.5
          text-[9px]
          font-bold
          text-emerald-700
        "
      >
        <CheckCircle2
          className="size-3"
          aria-hidden="true"
        />

        Phone connected
      </div>
    );
  }

  return (
    <div
      className="
        inline-flex
        items-center
        gap-2
        rounded-full
        bg-[#efedff]
        px-3
        py-1.5
        text-[9px]
        font-bold
        text-[#6757db]
      "
    >
      <LoaderCircle
        className="
          size-3
          animate-spin
        "
        aria-hidden="true"
      />

      Waiting for phone
    </div>
  );
}