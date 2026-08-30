"use client";

import {
  Camera,
  Check,
  CheckCircle2,
  FileCheck2,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

import type {
  ChangeEvent,
  ReactNode,
} from "react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  completeMobileHandoff,
  getMobileCaptureSession,
  uploadMobileEvidence,
} from "@/lib/mobile-handoff-api";

import type {
  EvidenceType,
} from "@/types/evidence";

import type {
  MobileCaptureRequirements,
  MobileCaptureSessionResponse,
} from "@/types/mobile-capture";


type CaptureKind =
  | "document_front"
  | "document_back"
  | "selfie"
  | "liveness";


interface CaptureDefinition {
  kind: CaptureKind;
  title: string;
  description: string;
  cameraFacing:
    | "environment"
    | "user";
}


const CAPTURE_DEFINITIONS: Record<
  CaptureKind,
  CaptureDefinition
> = {
  document_front: {
    kind: "document_front",
    title: "Document front",
    description:
      "Capture the front side clearly. Keep all corners visible and avoid glare.",
    cameraFacing: "environment",
  },

  document_back: {
    kind: "document_back",
    title: "Document back",
    description:
      "Capture the back side clearly with all text and details readable.",
    cameraFacing: "environment",
  },

  selfie: {
    kind: "selfie",
    title: "Selfie",
    description:
      "Take a clear photo of your face in good lighting.",
    cameraFacing: "user",
  },

  liveness: {
    kind: "liveness",
    title: "Face capture",
    description:
      "Capture the requested face image. This photo step is not an automated liveness test.",
    cameraFacing: "user",
  },
};


function getRequiredKinds(
  requirements:
    MobileCaptureRequirements,
): CaptureKind[] {
  const kinds:
    CaptureKind[] =
    [];

  if (
    requirements.document_front
  ) {
    kinds.push(
      "document_front",
    );
  }

  if (
    requirements.document_back
  ) {
    kinds.push(
      "document_back",
    );
  }

  if (
    requirements.selfie
  ) {
    kinds.push(
      "selfie",
    );
  }

  if (
    requirements.liveness
  ) {
    kinds.push(
      "liveness",
    );
  }

  return kinds;
}


function formatExpiry(
  expiresAt: string,
): string {
  const date =
    new Date(
      expiresAt,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Short-lived session";
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(
    date,
  );
}


export function MobileCapturePage() {
  const [
    session,
    setSession,
  ] =
    useState<MobileCaptureSessionResponse | null>(
      null,
    );

  const [
    uploadedKinds,
    setUploadedKinds,
  ] =
    useState<
      Set<CaptureKind>
    >(
      () => new Set(),
    );

  const [
    selectedFiles,
    setSelectedFiles,
  ] =
    useState<
      Partial<
        Record<
          CaptureKind,
          File
        >
      >
    >({});

  const [
    uploadingKinds,
    setUploadingKinds,
  ] =
    useState<
      Set<CaptureKind>
    >(
      () => new Set(),
    );

  const [
    uploadErrors,
    setUploadErrors,
  ] =
    useState<
      Partial<
        Record<
          CaptureKind,
          string
        >
      >
    >({});

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    loadError,
    setLoadError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    completing,
    setCompleting,
  ] =
    useState(false);

  const [
    completeError,
    setCompleteError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    completed,
    setCompleted,
  ] =
    useState(false);


  /*
   * Restore server-side mobile progress.
   *
   * This is the important refresh fix:
   * uploads already stored before a page reload
   * are rebuilt into uploadedKinds.
   */
  useEffect(() => {
    let active =
      true;

    async function load(): Promise<void> {
      try {
        const result =
          await getMobileCaptureSession();

        if (!active) {
          return;
        }

        setSession(
          result,
        );

        const restoredKinds =
          new Set<CaptureKind>();

        for (
          const upload
          of result.uploads
        ) {
          if (
            upload.evidence_type ===
              "document_front" ||
            upload.evidence_type ===
              "document_back" ||
            upload.evidence_type ===
              "selfie" ||
            upload.evidence_type ===
              "liveness"
          ) {
            restoredKinds.add(
              upload.evidence_type,
            );
          }
        }

        setUploadedKinds(
          restoredKinds,
        );

        setLoadError(
          null,
        );
      } catch {
        if (!active) {
          return;
        }

        setLoadError(
          "This secure phone session is unavailable or has expired. Return to your computer and generate a new QR code.",
        );
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


  const requiredKinds =
    useMemo(
      () => {
        if (!session) {
          return [];
        }

        return getRequiredKinds(
          session.requirements,
        );
      },
      [
        session,
      ],
    );


  const allCaptured =
    useMemo(
      () => (
        requiredKinds.length >
          0 &&
        requiredKinds.every(
          (kind) =>
            uploadedKinds.has(
              kind,
            ),
        )
      ),
      [
        requiredKinds,
        uploadedKinds,
      ],
    );


  const uploadedCount =
    useMemo(
      () => (
        requiredKinds.filter(
          (kind) =>
            uploadedKinds.has(
              kind,
            ),
        ).length
      ),
      [
        requiredKinds,
        uploadedKinds,
      ],
    );


  const uploadCapture =
    useCallback(
      async (
        kind: CaptureKind,
        file: File,
      ): Promise<void> => {
        setSelectedFiles(
          (current) => ({
            ...current,
            [kind]: file,
          }),
        );

        setUploadErrors(
          (current) => ({
            ...current,
            [kind]:
              undefined,
          }),
        );

        setUploadingKinds(
          (current) => {
            const next =
              new Set(
                current,
              );

            next.add(
              kind,
            );

            return next;
          },
        );

        try {
          await uploadMobileEvidence(
            kind as EvidenceType,
            file,
          );

          setUploadedKinds(
            (current) => {
              const next =
                new Set(
                  current,
                );

              next.add(
                kind,
              );

              return next;
            },
          );
        } catch (cause) {
          setUploadErrors(
            (current) => ({
              ...current,
              [kind]:
                cause instanceof Error
                  ? cause.message
                  : "Upload failed. Please capture this image again.",
            }),
          );
        } finally {
          setUploadingKinds(
            (current) => {
              const next =
                new Set(
                  current,
                );

              next.delete(
                kind,
              );

              return next;
            },
          );
        }
      },
      [],
    );


  const handleCapture =
    useCallback(
      (
        kind: CaptureKind,
        event:
          ChangeEvent<HTMLInputElement>,
      ) => {
        const file =
          event.target
            .files?.[0];

        /*
         * Allow selecting the same image again
         * after a failed upload or retake.
         */
        event.target.value =
          "";

        if (!file) {
          return;
        }

        if (
          !file.type.startsWith(
            "image/",
          )
        ) {
          setUploadErrors(
            (current) => ({
              ...current,
              [kind]:
                "Please capture or select an image.",
            }),
          );

          return;
        }

        void uploadCapture(
          kind,
          file,
        );
      },
      [
        uploadCapture,
      ],
    );


  async function finish(): Promise<void> {
    if (
      !allCaptured ||
      completing
    ) {
      return;
    }

    setCompleting(
      true,
    );

    setCompleteError(
      null,
    );

    try {
      await completeMobileHandoff();

      setCompleted(
        true,
      );
    } catch (cause) {
      setCompleteError(
        cause instanceof Error
          ? cause.message
          : "Unable to finish secure capture.",
      );
    } finally {
      setCompleting(
        false,
      );
    }
  }


  if (loading) {
    return (
      <MobileShell>
        <div
          className="
            flex
            min-h-[420px]
            flex-col
            items-center
            justify-center
            text-center
          "
        >
          <div
            className="
              flex
              size-14
              items-center
              justify-center
              rounded-[18px]
              border
              border-white/[0.07]
              bg-white/[0.05]
              text-violet-300
            "
          >
            <LoaderCircle
              className="
                size-6
                animate-spin
              "
              aria-hidden="true"
            />
          </div>

          <h1
            className="
              mt-5
              text-xl
              font-bold
              tracking-[-0.035em]
            "
          >
            Opening secure capture
          </h1>

          <p
            className="
              mt-2
              max-w-[280px]
              text-xs
              leading-6
              text-slate-500
            "
          >
            Checking your temporary phone session.
          </p>
        </div>
      </MobileShell>
    );
  }


  if (
    loadError ||
    !session
  ) {
    return (
      <MobileShell>
        <div
          className="
            flex
            min-h-[420px]
            flex-col
            items-center
            justify-center
            text-center
          "
        >
          <div
            className="
              flex
              size-14
              items-center
              justify-center
              rounded-[18px]
              bg-red-400/10
              text-red-300
            "
          >
            <ShieldAlert
              className="size-6"
              aria-hidden="true"
            />
          </div>

          <h1
            className="
              mt-5
              text-xl
              font-bold
              tracking-[-0.035em]
            "
          >
            Capture unavailable
          </h1>

          <p
            role="alert"
            className="
              mt-3
              max-w-[320px]
              text-xs
              leading-6
              text-slate-500
            "
          >
            {loadError}
          </p>
        </div>
      </MobileShell>
    );
  }


  if (completed) {
    return (
      <MobileShell>
        <div
          className="
            flex
            min-h-[500px]
            flex-col
            items-center
            justify-center
            text-center
          "
        >
          <div
            className="
              flex
              size-16
              items-center
              justify-center
              rounded-[20px]
              bg-emerald-400/10
              text-emerald-300
            "
          >
            <CheckCircle2
              className="size-7"
              aria-hidden="true"
            />
          </div>

          <h1
            className="
              mt-6
              text-[26px]
              font-bold
              tracking-[-0.04em]
            "
          >
            Capture complete
          </h1>

          <p
            className="
              mt-3
              max-w-[310px]
              text-xs
              leading-6
              text-slate-500
            "
          >
            Your evidence was securely received.
            You can return to the computer where
            you started verification.
          </p>

          <div
            className="
              mt-6
              inline-flex
              items-center
              gap-2
              rounded-full
              border
              border-emerald-400/10
              bg-emerald-400/[0.06]
              px-4
              py-2
              text-[10px]
              font-bold
              text-emerald-300
            "
          >
            <ShieldCheck
              className="size-3.5"
              aria-hidden="true"
            />

            Phone access closed
          </div>
        </div>
      </MobileShell>
    );
  }


  return (
    <MobileShell>
      <header>
        <div
          className="
            flex
            items-center
            justify-between
            gap-4
          "
        >
          <div
            className="
              flex
              size-11
              items-center
              justify-center
              rounded-[15px]
              border
              border-white/[0.07]
              bg-white/[0.05]
              text-violet-300
            "
          >
            <Smartphone
              className="size-5"
              aria-hidden="true"
            />
          </div>

          <div
            className="
              rounded-full
              border
              border-white/[0.07]
              bg-white/[0.04]
              px-3
              py-1.5
              text-[9px]
              font-semibold
              text-slate-400
            "
          >
            Expires{" "}
            {formatExpiry(
              session.expires_at,
            )}
          </div>
        </div>


        <h1
          className="
            mt-6
            text-[28px]
            font-bold
            tracking-[-0.045em]
          "
        >
          Capture your evidence
        </h1>

        <p
          className="
            mt-3
            max-w-[360px]
            text-xs
            leading-6
            text-slate-500
          "
        >
          Take clear photos of the requested
          evidence. Each image is uploaded
          privately as soon as you capture it.
        </p>


        <div
          className="
            mt-6
            overflow-hidden
            rounded-[18px]
            border
            border-white/[0.07]
            bg-white/[0.035]
            p-4
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              gap-4
            "
          >
            <div>
              <div
                className="
                  text-[10px]
                  font-bold
                  text-slate-300
                "
              >
                Capture progress
              </div>

              <div
                className="
                  mt-1
                  text-[9px]
                  text-slate-500
                "
              >
                {uploadedCount} of{" "}
                {requiredKinds.length} received
              </div>
            </div>

            <div
              className="
                text-[11px]
                font-bold
                text-violet-300
              "
            >
              {requiredKinds.length > 0
                ? Math.round(
                    (
                      uploadedCount /
                      requiredKinds.length
                    ) *
                      100,
                  )
                : 0}
              %
            </div>
          </div>

          <div
            className="
              mt-3
              h-1.5
              overflow-hidden
              rounded-full
              bg-white/[0.06]
            "
          >
            <div
              className="
                h-full
                rounded-full
                bg-violet-400
                transition-[width]
                duration-300
              "
              style={{
                width: `${
                  requiredKinds.length > 0
                    ? (
                        uploadedCount /
                        requiredKinds.length
                      ) *
                      100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      </header>


      <div
        className="
          mt-6
          space-y-3
        "
      >
        {requiredKinds.map(
          (kind) => {
            const definition =
              CAPTURE_DEFINITIONS[
                kind
              ];

            return (
              <CaptureCard
                key={kind}
                definition={
                  definition
                }
                file={
                  selectedFiles[
                    kind
                  ]
                }
                uploaded={
                  uploadedKinds.has(
                    kind,
                  )
                }
                uploading={
                  uploadingKinds.has(
                    kind,
                  )
                }
                error={
                  uploadErrors[
                    kind
                  ]
                }
                onCapture={
                  handleCapture
                }
              />
            );
          },
        )}
      </div>


      {requiredKinds.length ===
        0 && (
        <div
          className="
            mt-6
            rounded-[18px]
            border
            border-amber-400/10
            bg-amber-400/[0.05]
            p-4
            text-xs
            leading-6
            text-amber-200
          "
        >
          No mobile evidence requirements were
          assigned to this verification request.
        </div>
      )}


      {completeError && (
        <p
          role="alert"
          className="
            mt-5
            rounded-[15px]
            border
            border-red-400/10
            bg-red-400/[0.05]
            px-4
            py-3
            text-[10px]
            leading-5
            text-red-300
          "
        >
          {completeError}
        </p>
      )}


      <button
        type="button"
        disabled={
          !allCaptured ||
          completing ||
          uploadingKinds.size >
            0
        }
        onClick={() => {
          void finish();
        }}
        className="
          mt-7
          flex
          min-h-12
          w-full
          items-center
          justify-center
          gap-2
          rounded-[16px]
          bg-violet-500
          px-5
          text-[11px]
          font-bold
          text-white
          shadow-lg
          shadow-violet-950/20
          transition
          hover:bg-violet-400
          disabled:cursor-not-allowed
          disabled:bg-white/[0.07]
          disabled:text-slate-600
          disabled:shadow-none
        "
      >
        {completing ? (
          <>
            <LoaderCircle
              className="
                size-4
                animate-spin
              "
              aria-hidden="true"
            />

            Finishing secure capture
          </>
        ) : allCaptured ? (
          <>
            <CheckCircle2
              className="size-4"
              aria-hidden="true"
            />

            Finish secure capture
          </>
        ) : (
          <>
            <ShieldCheck
              className="size-4"
              aria-hidden="true"
            />

            Capture all required evidence
          </>
        )}
      </button>


      <p
        className="
          mt-4
          text-center
          text-[9px]
          leading-5
          text-slate-600
        "
      >
        This phone session can only upload
        evidence. It cannot approve verification
        or grant Discord access.
      </p>
    </MobileShell>
  );
}


function CaptureCard({
  definition,
  file,
  uploaded,
  uploading,
  error,
  onCapture,
}: {
  definition:
    CaptureDefinition;

  file?: File;

  uploaded: boolean;

  uploading: boolean;

  error?: string;

  onCapture: (
    kind: CaptureKind,
    event:
      ChangeEvent<HTMLInputElement>,
  ) => void;
}) {
  const inputId =
    `mobile-capture-${definition.kind}`;


  /*
   * Important:
   *
   * uploaded can be true while file is undefined.
   * That happens after a page refresh because the
   * server knows about the evidence but the browser
   * no longer has the original File object.
   */
  if (
    uploaded &&
    !uploading
  ) {
    return (
      <section
        className="
          overflow-hidden
          rounded-[20px]
          border
          border-emerald-400/10
          bg-emerald-400/[0.045]
          p-4
        "
      >
        <div
          className="
            flex
            items-start
            gap-3
          "
        >
          <div
            className="
              flex
              size-10
              shrink-0
              items-center
              justify-center
              rounded-[13px]
              bg-emerald-400/10
              text-emerald-300
            "
          >
            <Check
              className="size-4"
              aria-hidden="true"
            />
          </div>

          <div
            className="
              min-w-0
              flex-1
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                gap-3
              "
            >
              <div
                className="
                  text-[11px]
                  font-bold
                  text-slate-100
                "
              >
                {definition.title}
              </div>

              <span
                className="
                  shrink-0
                  text-[9px]
                  font-bold
                  text-emerald-300
                "
              >
                Received
              </span>
            </div>

            <p
              className="
                mt-1
                text-[9px]
                leading-5
                text-slate-500
              "
            >
              {file
                ? file.name
                : "Secure upload restored from this session."}
            </p>


            <label
              htmlFor={
                inputId
              }
              className="
                mt-3
                inline-flex
                min-h-10
                cursor-pointer
                items-center
                gap-2
                rounded-[12px]
                border
                border-white/[0.08]
                bg-white/[0.04]
                px-3
                text-[9px]
                font-bold
                text-slate-300
                transition
                hover:bg-white/[0.07]
              "
            >
              <RefreshCw
                className="size-3.5"
                aria-hidden="true"
              />

              Retake
            </label>

            <input
              id={
                inputId
              }
              type="file"
              accept="image/*"
              capture={
                definition.cameraFacing
              }
              className="sr-only"
              onChange={(
                event,
              ) => {
                onCapture(
                  definition.kind,
                  event,
                );
              }}
            />
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="
              mt-3
              text-[9px]
              leading-5
              text-red-300
            "
          >
            {error}
          </p>
        )}
      </section>
    );
  }


  return (
    <section
      className="
        overflow-hidden
        rounded-[20px]
        border
        border-white/[0.07]
        bg-white/[0.035]
        p-4
      "
    >
      <div
        className="
          flex
          items-start
          gap-3
        "
      >
        <div
          className="
            flex
            size-10
            shrink-0
            items-center
            justify-center
            rounded-[13px]
            bg-violet-400/10
            text-violet-300
          "
        >
          {uploading ? (
            <LoaderCircle
              className="
                size-4
                animate-spin
              "
              aria-hidden="true"
            />
          ) : (
            <Camera
              className="size-4"
              aria-hidden="true"
            />
          )}
        </div>


        <div
          className="
            min-w-0
            flex-1
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              gap-3
            "
          >
            <h2
              className="
                text-[11px]
                font-bold
                text-slate-100
              "
            >
              {definition.title}
            </h2>

            {uploading && (
              <span
                className="
                  shrink-0
                  text-[9px]
                  font-bold
                  text-violet-300
                "
              >
                Uploading
              </span>
            )}
          </div>

          <p
            className="
              mt-1
              text-[9px]
              leading-5
              text-slate-500
            "
          >
            {definition.description}
          </p>


          {file && (
            <div
              className="
                mt-3
                flex
                items-center
                gap-2
                rounded-[11px]
                bg-white/[0.035]
                px-3
                py-2
              "
            >
              <FileCheck2
                className="
                  size-3.5
                  shrink-0
                  text-slate-500
                "
                aria-hidden="true"
              />

              <span
                className="
                  truncate
                  text-[9px]
                  text-slate-400
                "
              >
                {file.name}
              </span>
            </div>
          )}


          {!uploading && (
            <>
              <label
                htmlFor={
                  inputId
                }
                className="
                  mt-3
                  inline-flex
                  min-h-10
                  cursor-pointer
                  items-center
                  gap-2
                  rounded-[12px]
                  bg-violet-500
                  px-4
                  text-[9px]
                  font-bold
                  text-white
                  transition
                  hover:bg-violet-400
                "
              >
                <Camera
                  className="size-3.5"
                  aria-hidden="true"
                />

                {file
                  ? "Capture again"
                  : "Open camera"}
              </label>

              <input
                id={
                  inputId
                }
                type="file"
                accept="image/*"
                capture={
                  definition.cameraFacing
                }
                className="sr-only"
                onChange={(
                  event,
                ) => {
                  onCapture(
                    definition.kind,
                    event,
                  );
                }}
              />
            </>
          )}


          {error && (
            <p
              role="alert"
              className="
                mt-3
                text-[9px]
                leading-5
                text-red-300
              "
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}


function MobileShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main
      className="
        relative
        min-h-dvh
        overflow-hidden
        bg-[#080d16]
        px-4
        py-6
        text-white
      "
    >
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -top-40
          left-1/2
          size-[430px]
          -translate-x-1/2
          rounded-full
          bg-violet-600/15
          blur-[110px]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -bottom-40
          -right-44
          size-[400px]
          rounded-full
          bg-blue-600/[0.08]
          blur-[120px]
        "
      />

      <div
        className="
          relative
          mx-auto
          w-full
          max-w-[430px]
        "
      >
        {children}
      </div>
    </main>
  );
}