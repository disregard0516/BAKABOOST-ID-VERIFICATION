"use client";

import {
  Camera,
  Check,
  CheckCircle2,
  LoaderCircle,
  RefreshCcw,
  ScanFace,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  uploadEvidence,
} from "@/lib/submission-api";

import type {
  UploadedEvidence,
} from "@/types/evidence";

type FaceEvidenceType =
  | "selfie"
  | "liveness";

interface FaceCaptureCardProps {
  type: FaceEvidenceType;
  title: string;
  description: string;
  required?: boolean;
  value: UploadedEvidence | null;
  onChange: (
    value: UploadedEvidence | null,
  ) => void;
}

type CaptureState =
  | "closed"
  | "starting"
  | "live"
  | "challenge"
  | "preview";

type ChallengeDirection =
  | "left"
  | "right";

interface LivenessStep {
  key: string;
  label: string;
  durationMs: number;
}

const SELFIE_CAPTURE_QUALITY =
  0.92;

export function FaceCaptureCard({
  type,
  title,
  description,
  required = false,
  value,
  onChange,
}: FaceCaptureCardProps) {
  const videoRef =
    useRef<HTMLVideoElement | null>(
      null,
    );

  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null,
    );

  const streamRef =
    useRef<MediaStream | null>(
      null,
    );

  const previewUrlRef =
    useRef<string | null>(
      null,
    );

  const capturedFileRef =
    useRef<File | null>(
      null,
    );

  const challengeTimerRef =
    useRef<number | null>(
      null,
    );

  const challengeRunRef =
    useRef(0);

  const [
    captureState,
    setCaptureState,
  ] =
    useState<CaptureState>(
      "closed",
    );

  const [
    uploading,
    setUploading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    cameraError,
    setCameraError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    previewUrl,
    setPreviewUrl,
  ] =
    useState<string | null>(
      null,
    );

  const [
    challengeDirection,
    setChallengeDirection,
  ] =
    useState<ChallengeDirection>(
      "left",
    );

  const [
    challengeStepIndex,
    setChallengeStepIndex,
  ] =
    useState(0);

  const [
    challengeSeconds,
    setChallengeSeconds,
  ] =
    useState<number | null>(
      null,
    );

  const isLiveness =
    type ===
    "liveness";

  const challengeSteps =
    useMemo<LivenessStep[]>(
      () => [
        {
          key:
            "center",

          label:
            "Look straight at the camera",

          durationMs:
            2200,
        },

        {
          key:
            "turn",

          label:
            challengeDirection ===
            "left"
              ? "Slowly turn your head left"
              : "Slowly turn your head right",

          durationMs:
            2800,
        },

        {
          key:
            "return",

          label:
            "Face the camera again and hold still",

          durationMs:
            2200,
        },
      ],
      [
        challengeDirection,
      ],
    );

  const stopChallengeTimer =
    useCallback(
      (): void => {
        if (
          challengeTimerRef.current !==
          null
        ) {
          window.clearTimeout(
            challengeTimerRef.current,
          );

          challengeTimerRef.current =
            null;
        }

        challengeRunRef.current +=
          1;

        setChallengeSeconds(
          null,
        );
      },
      [],
    );

  const stopCamera =
    useCallback(
      (): void => {
        const stream =
          streamRef.current;

        if (stream) {
          for (
            const track
            of stream.getTracks()
          ) {
            track.stop();
          }
        }

        streamRef.current =
          null;

        const video =
          videoRef.current;

        if (video) {
          video.srcObject =
            null;
        }
      },
      [],
    );

  const clearPreview =
    useCallback(
      (): void => {
        if (
          previewUrlRef.current
        ) {
          URL.revokeObjectURL(
            previewUrlRef.current,
          );
        }

        previewUrlRef.current =
          null;

        capturedFileRef.current =
          null;

        setPreviewUrl(
          null,
        );
      },
      [],
    );

  const resetCapture =
    useCallback(
      (): void => {
        stopChallengeTimer();
        stopCamera();
        clearPreview();

        setCaptureState(
          "closed",
        );

        setCameraError(
          null,
        );

        setChallengeStepIndex(
          0,
        );
      },
      [
        clearPreview,
        stopCamera,
        stopChallengeTimer,
      ],
    );

  useEffect(
    () => {
      return () => {
        stopChallengeTimer();
        stopCamera();
        clearPreview();
      };
    },
    [
      clearPreview,
      stopCamera,
      stopChallengeTimer,
    ],
  );

  useEffect(
    () => {
      if (
        captureState !==
          "live" &&
        captureState !==
          "challenge"
      ) {
        return;
      }

      const video =
        videoRef.current;

      const stream =
        streamRef.current;

      if (
        !video ||
        !stream
      ) {
        return;
      }

      video.srcObject =
        stream;

      const playPromise =
        video.play();

      if (playPromise) {
        void playPromise.catch(
          () => {
            setCameraError(
              "The camera started but the preview could not be shown. Close the camera and try again.",
            );
          },
        );
      }
    },
    [
      captureState,
    ],
  );

  const openCamera =
    useCallback(
      async (): Promise<void> => {
        if (uploading) {
          return;
        }

        setError(
          null,
        );

        setCameraError(
          null,
        );

        clearPreview();
        stopChallengeTimer();
        stopCamera();

        if (
          typeof navigator ===
            "undefined" ||
          !navigator.mediaDevices ||
          !navigator.mediaDevices
            .getUserMedia
        ) {
          setCameraError(
            "Live camera capture is not available in this browser.",
          );

          setCaptureState(
            "closed",
          );

          return;
        }

        setCaptureState(
          "starting",
        );

        try {
          let stream:
            MediaStream;

          try {
            stream =
              await navigator.mediaDevices
                .getUserMedia({
                  audio: false,

                  video: {
                    facingMode: {
                      ideal:
                        "user",
                    },

                    width: {
                      ideal:
                        1280,
                    },

                    height: {
                      ideal:
                        1280,
                    },
                  },
                });
          } catch {
            stream =
              await navigator.mediaDevices
                .getUserMedia({
                  audio: false,

                  video:
                    true,
                });
          }

          streamRef.current =
            stream;

          setCaptureState(
            "live",
          );
        } catch (cause) {
          stopCamera();

          setCaptureState(
            "closed",
          );

          setCameraError(
            getCameraErrorMessage(
              cause,
            ),
          );
        }
      },
      [
        clearPreview,
        stopCamera,
        stopChallengeTimer,
        uploading,
      ],
    );

  const captureFrame =
    useCallback(
      async (): Promise<File | null> => {
        const video =
          videoRef.current;

        const canvas =
          canvasRef.current;

        if (
          !video ||
          !canvas
        ) {
          return null;
        }

        const videoWidth =
          video.videoWidth;

        const videoHeight =
          video.videoHeight;

        if (
          videoWidth <= 0 ||
          videoHeight <= 0
        ) {
          setCameraError(
            "The camera is still preparing. Wait a moment and try again.",
          );

          return null;
        }

        const cropSize =
          Math.min(
            videoWidth,
            videoHeight,
          );

        const sourceX =
          Math.floor(
            (
              videoWidth -
              cropSize
            ) /
              2,
          );

        const sourceY =
          Math.floor(
            (
              videoHeight -
              cropSize
            ) /
              2,
          );

        canvas.width =
          cropSize;

        canvas.height =
          cropSize;

        const context =
          canvas.getContext(
            "2d",
          );

        if (!context) {
          setCameraError(
            "We could not prepare the captured image. Try again.",
          );

          return null;
        }

        context.drawImage(
          video,
          sourceX,
          sourceY,
          cropSize,
          cropSize,
          0,
          0,
          cropSize,
          cropSize,
        );

        const blob =
          await canvasToBlob(
            canvas,
            "image/jpeg",
            SELFIE_CAPTURE_QUALITY,
          );

        if (!blob) {
          setCameraError(
            "We could not capture the image. Try again.",
          );

          return null;
        }

        return new File(
          [blob],
          buildFaceFilename(
            type,
          ),
          {
            type:
              "image/jpeg",

            lastModified:
              Date.now(),
          },
        );
      },
      [
        type,
      ],
    );

  const showCapturedPreview =
    useCallback(
      async (): Promise<void> => {
        const file =
          await captureFrame();

        if (!file) {
          return;
        }

        clearPreview();

        const objectUrl =
          URL.createObjectURL(
            file,
          );

        previewUrlRef.current =
          objectUrl;

        capturedFileRef.current =
          file;

        setPreviewUrl(
          objectUrl,
        );

        stopChallengeTimer();
        stopCamera();

        setCaptureState(
          "preview",
        );
      },
      [
        captureFrame,
        clearPreview,
        stopCamera,
        stopChallengeTimer,
      ],
    );

  async function captureSelfie(): Promise<void> {
    if (
      captureState !==
      "live"
    ) {
      return;
    }

    setCameraError(
      null,
    );

    await showCapturedPreview();
  }

  async function beginLivenessChallenge(): Promise<void> {
    if (
      !isLiveness ||
      captureState !==
        "live"
    ) {
      return;
    }

    setCameraError(
      null,
    );

    setError(
      null,
    );

    const direction:
      ChallengeDirection =
      Math.random() >=
      0.5
        ? "left"
        : "right";

    setChallengeDirection(
      direction,
    );

    setChallengeStepIndex(
      0,
    );

    setCaptureState(
      "challenge",
    );
  }

  useEffect(
    () => {
      if (
        captureState !==
        "challenge"
      ) {
        return;
      }

      if (
        challengeStepIndex >=
        challengeSteps.length
      ) {
        const captureTimer =
          window.setTimeout(
            () => {
              void showCapturedPreview();
            },
            0,
          );

        return () => {
          window.clearTimeout(
            captureTimer,
          );
        };
      }

      const runId =
        challengeRunRef.current +
        1;

      challengeRunRef.current =
        runId;

      const step =
        challengeSteps[
          challengeStepIndex
        ];

      const totalSeconds =
        Math.max(
          1,
          Math.ceil(
            step.durationMs /
              1000,
          ),
        );

      const initialTimer =
        window.setTimeout(
          () => {
            if (
              challengeRunRef.current ===
              runId
            ) {
              setChallengeSeconds(
                totalSeconds,
              );
            }
          },
          0,
        );

      const startedAt =
        Date.now();

      function tick(): void {
        if (
          challengeRunRef.current !==
          runId
        ) {
          return;
        }

        const elapsed =
          Date.now() -
          startedAt;

        const remainingMs =
          step.durationMs -
          elapsed;

        if (
          remainingMs <=
          0
        ) {
          setChallengeSeconds(
            null,
          );

          setChallengeStepIndex(
            (current) =>
              current + 1,
          );

          return;
        }

        setChallengeSeconds(
          Math.max(
            1,
            Math.ceil(
              remainingMs /
                1000,
            ),
          ),
        );

        challengeTimerRef.current =
          window.setTimeout(
            tick,
            250,
          );
      }

      challengeTimerRef.current =
        window.setTimeout(
          tick,
          250,
        );

      return () => {
        window.clearTimeout(
          initialTimer,
        );

        if (
          challengeTimerRef.current !==
          null
        ) {
          window.clearTimeout(
            challengeTimerRef.current,
          );

          challengeTimerRef.current =
            null;
        }
      };
    },
    [
      captureState,
      challengeStepIndex,
      challengeSteps,
      showCapturedPreview,
    ],
  );

  async function retake(): Promise<void> {
    stopChallengeTimer();
    stopCamera();
    clearPreview();

    setCameraError(
      null,
    );

    setChallengeStepIndex(
      0,
    );

    setCaptureState(
      "closed",
    );

    window.setTimeout(
      () => {
        void openCamera();
      },
      0,
    );
  }

  async function uploadCapturedFace(): Promise<void> {
    const file =
      capturedFileRef.current;

    if (
      !file ||
      uploading
    ) {
      return;
    }

    setUploading(
      true,
    );

    setError(
      null,
    );

    try {
      const result =
        await uploadEvidence(
          type,
          file,
        );

      onChange({
        evidenceId:
          result.evidence_id,

        evidenceType:
          result.evidence_type,

        filename:
          file.name,

        contentType:
          result.content_type,

        sizeBytes:
          result.size_bytes,
      });

      resetCapture();
    } catch (cause) {
      setError(
        cause instanceof Error &&
          cause.message
          ? cause.message
          : "Face capture upload failed. Try again.",
      );
    } finally {
      setUploading(
        false,
      );
    }
  }

  if (value) {
    return (
      <section
        className="
          rounded-xl
          border border-emerald-200
          bg-emerald-50/60
          p-4
          transition-all
          duration-200
          hover:border-emerald-300
          hover:shadow-sm
        "
      >
        <div
          className="
            flex
            items-center
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
              rounded-lg
              bg-white
              text-emerald-600
              shadow-sm
            "
          >
            <CheckCircle2
              className="size-5"
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
                flex-wrap
                items-center
                gap-2
              "
            >
              <div
                className="
                  text-sm
                  font-semibold
                  text-slate-950
                "
              >
                {title}
              </div>

              <div
                className="
                  inline-flex
                  items-center
                  gap-1
                  rounded-full
                  bg-emerald-100
                  px-2
                  py-0.5
                  text-[10px]
                  font-semibold
                  text-emerald-700
                "
              >
                <Check
                  className="size-3"
                  aria-hidden="true"
                />

                Captured
              </div>
            </div>

            <p
              className="
                mt-1
                text-xs
                text-slate-500
              "
            >
              {isLiveness
                ? "Live face capture received"
                : "Selfie capture received"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setError(
                null,
              );

              onChange(
                null,
              );
            }}
            className="
              flex
              size-9
              shrink-0
              items-center
              justify-center
              rounded-lg
              border border-transparent
              text-slate-400
              transition-all
              duration-200
              hover:scale-105
              hover:border-slate-200
              hover:bg-white
              hover:text-slate-700
              active:scale-95
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-blue-500
              focus-visible:ring-offset-2
            "
            aria-label={`Remove ${title}`}
          >
            <X
              className="size-4"
              aria-hidden="true"
            />
          </button>
        </div>
      </section>
    );
  }

  return (
    <>
      <section
        className="
          rounded-xl
          border border-slate-200
          bg-white
          p-4
          transition-all
          duration-200
          hover:border-slate-300
          hover:shadow-sm
          sm:p-5
        "
      >
        <div
          className="
            flex
            flex-col
            gap-4
            sm:flex-row
            sm:items-start
          "
        >
          <div
            className="
              flex
              size-11
              shrink-0
              items-center
              justify-center
              rounded-lg
              border border-slate-200
              bg-slate-50
              text-blue-600
            "
          >
            {isLiveness ? (
              <ScanFace
                className="size-5"
                aria-hidden="true"
              />
            ) : (
              <Camera
                className="size-5"
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
                flex-wrap
                items-center
                gap-2
              "
            >
              <h3
                className="
                  text-sm
                  font-semibold
                  text-slate-950
                "
              >
                {title}
              </h3>

              {required && (
                <span
                  className="
                    rounded-md
                    bg-blue-50
                    px-2
                    py-1
                    text-[10px]
                    font-semibold
                    text-blue-700
                  "
                >
                  Required
                </span>
              )}
            </div>

            <p
              className="
                mt-1
                max-w-[560px]
                text-xs
                leading-5
                text-slate-500
              "
            >
              {description}
            </p>

            <div
              className="
                mt-3
                flex
                items-start
                gap-2.5
                rounded-lg
                bg-slate-50
                p-3
              "
            >
              <ShieldCheck
                className="
                  mt-0.5
                  size-4
                  shrink-0
                  text-blue-600
                "
                aria-hidden="true"
              />

              <p
                className="
                  text-[11px]
                  leading-5
                  text-slate-500
                "
              >
                {isLiveness
                  ? "A live front-camera session is required. Saved images cannot be used for this step."
                  : "Take a fresh selfie using your front camera. Saved image files cannot be selected."}
              </p>
            </div>

            <button
              type="button"
              disabled={
                uploading ||
                captureState !==
                  "closed"
              }
              onClick={() => {
                void openCamera();
              }}
              className="
                group
                mt-4
                inline-flex
                min-h-10
                items-center
                justify-center
                gap-2
                rounded-lg
                bg-blue-600
                px-4
                text-xs
                font-semibold
                text-white
                shadow-sm
                transition-all
                duration-200
                hover:-translate-y-0.5
                hover:scale-[1.02]
                hover:bg-blue-700
                hover:shadow-md
                active:scale-[0.97]
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-blue-500
                focus-visible:ring-offset-2
                disabled:pointer-events-none
                disabled:opacity-60
              "
            >
              {captureState ===
              "starting" ? (
                <LoaderCircle
                  className="
                    size-4
                    animate-spin
                  "
                  aria-hidden="true"
                />
              ) : isLiveness ? (
                <ScanFace
                  className="
                    size-4
                    transition-transform
                    duration-200
                    group-hover:scale-110
                  "
                  aria-hidden="true"
                />
              ) : (
                <Camera
                  className="
                    size-4
                    transition-transform
                    duration-200
                    group-hover:scale-110
                  "
                  aria-hidden="true"
                />
              )}

              {captureState ===
              "starting"
                ? "Starting camera…"
                : isLiveness
                  ? "Start live face capture"
                  : "Open selfie camera"}
            </button>
          </div>
        </div>
      </section>

      {cameraError && (
        <div
          role="alert"
          className="
            mt-2
            flex
            items-start
            gap-2
            rounded-lg
            border border-amber-200
            bg-amber-50
            p-3
            text-xs
            leading-5
            text-amber-800
          "
        >
          <ShieldAlert
            className="
              mt-0.5
              size-4
              shrink-0
            "
            aria-hidden="true"
          />

          <span>
            {cameraError}
          </span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="
            mt-2
            flex
            items-start
            gap-2
            rounded-lg
            border border-red-200
            bg-red-50
            p-3
            text-xs
            leading-5
            text-red-700
          "
        >
          <ShieldAlert
            className="
              mt-0.5
              size-4
              shrink-0
            "
            aria-hidden="true"
          />

          <span>
            {error}
          </span>
        </div>
      )}

      {captureState !==
        "closed" && (
        <div
          className="
            fixed
            inset-0
            z-[110]
            flex
            items-center
            justify-center
            bg-slate-950/90
            p-3
            backdrop-blur-sm
            sm:p-6
          "
          role="dialog"
          aria-modal="true"
          aria-label={
            isLiveness
              ? "Live face capture"
              : "Selfie capture"
          }
        >
          <div
            className="
              flex
              max-h-[calc(100dvh-24px)]
              w-full
              max-w-[580px]
              flex-col
              overflow-hidden
              rounded-2xl
              border border-white/10
              bg-white
              shadow-[0_30px_100px_rgba(0,0,0,0.4)]
            "
          >
            <header
              className="
                flex
                items-start
                justify-between
                gap-4
                border-b border-slate-200
                px-5
                py-4
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
                    size-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    bg-blue-50
                    text-blue-600
                  "
                >
                  {isLiveness ? (
                    <ScanFace
                      className="size-4"
                      aria-hidden="true"
                    />
                  ) : (
                    <Camera
                      className="size-4"
                      aria-hidden="true"
                    />
                  )}
                </div>

                <div>
                  <h2
                    className="
                      text-sm
                      font-semibold
                      text-slate-950
                    "
                  >
                    {isLiveness
                      ? "Live face capture"
                      : "Take your selfie"}
                  </h2>

                  <p
                    className="
                      mt-1
                      max-w-[390px]
                      text-xs
                      leading-5
                      text-slate-500
                    "
                  >
                    Position your face inside the guide and
                    use clear, even lighting.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={
                  uploading
                }
                onClick={
                  resetCapture
                }
                className="
                  flex
                  size-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  border border-slate-200
                  bg-white
                  text-slate-500
                  transition-all
                  duration-200
                  hover:scale-105
                  hover:bg-slate-50
                  hover:text-slate-900
                  active:scale-95
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-blue-500
                  focus-visible:ring-offset-2
                  disabled:opacity-50
                "
                aria-label="Close camera"
              >
                <X
                  className="size-4"
                  aria-hidden="true"
                />
              </button>
            </header>

            <div
              className="
                min-h-0
                flex-1
                overflow-y-auto
                bg-slate-950
                p-3
                sm:p-5
              "
            >
              <div
                className="
                  relative
                  mx-auto
                  aspect-square
                  w-full
                  max-w-[480px]
                  overflow-hidden
                  rounded-2xl
                  bg-black
                "
              >
                {captureState ===
                  "starting" && (
                  <div
                    className="
                      absolute
                      inset-0
                      z-20
                      flex
                      flex-col
                      items-center
                      justify-center
                      text-white
                    "
                  >
                    <div
                      className="
                        flex
                        size-12
                        items-center
                        justify-center
                        rounded-full
                        bg-white/10
                        backdrop-blur
                      "
                    >
                      <LoaderCircle
                        className="
                          size-5
                          animate-spin
                        "
                        aria-hidden="true"
                      />
                    </div>

                    <div
                      className="
                        mt-3
                        text-xs
                        font-medium
                      "
                    >
                      Starting front camera…
                    </div>
                  </div>
                )}

                {(
                  captureState ===
                    "live" ||
                  captureState ===
                    "challenge"
                ) && (
                  <>
                    <video
                      ref={
                        videoRef
                      }
                      autoPlay
                      muted
                      playsInline
                      className="
                        h-full
                        w-full
                        scale-x-[-1]
                        object-cover
                      "
                    />

                    <div
                      aria-hidden="true"
                      className="
                        pointer-events-none
                        absolute
                        left-1/2
                        top-1/2
                        h-[72%]
                        w-[58%]
                        -translate-x-1/2
                        -translate-y-1/2
                        rounded-[50%]
                        border-2
                        border-white/80
                        shadow-[0_0_0_999px_rgba(0,0,0,0.3)]
                      "
                    />

                    {captureState ===
                      "live" && (
                      <div
                        className="
                          pointer-events-none
                          absolute
                          inset-x-4
                          bottom-5
                          flex
                          justify-center
                        "
                      >
                        <div
                          className="
                            rounded-full
                            border border-white/10
                            bg-black/55
                            px-3
                            py-1.5
                            text-[10px]
                            font-medium
                            text-white
                            backdrop-blur-md
                          "
                        >
                          Center your face inside the guide
                        </div>
                      </div>
                    )}

                    {captureState ===
                      "challenge" && (
                      <div
                        className="
                          absolute
                          inset-x-4
                          bottom-4
                          z-10
                          rounded-xl
                          border border-white/10
                          bg-black/70
                          p-4
                          text-center
                          text-white
                          shadow-lg
                          backdrop-blur-md
                        "
                      >
                        <div
                          className="
                            text-[10px]
                            font-medium
                            uppercase
                            tracking-[0.08em]
                            text-blue-300
                          "
                        >
                          Step{" "}
                          {
                            Math.min(
                              challengeStepIndex +
                                1,
                              challengeSteps.length,
                            )
                          }{" "}
                          of{" "}
                          {
                            challengeSteps.length
                          }
                        </div>

                        <div
                          className="
                            mt-1.5
                            text-base
                            font-semibold
                          "
                        >
                          {
                            challengeSteps[
                              Math.min(
                                challengeStepIndex,
                                challengeSteps.length -
                                  1,
                              )
                            ]?.label
                          }
                        </div>

                        {challengeSeconds !==
                          null && (
                          <div
                            className="
                              mx-auto
                              mt-3
                              flex
                              size-10
                              items-center
                              justify-center
                              rounded-full
                              bg-blue-600
                              text-lg
                              font-semibold
                              text-white
                              shadow-lg
                            "
                          >
                            {
                              challengeSeconds
                            }
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {captureState ===
                  "preview" &&
                  previewUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={
                        previewUrl
                      }
                      alt="Captured face preview"
                      className="
                        h-full
                        w-full
                        object-cover
                      "
                    />
                  )}
              </div>

              <canvas
                ref={
                  canvasRef
                }
                hidden
              />

              <div
                className="
                  mx-auto
                  mt-4
                  flex
                  max-w-[480px]
                  items-start
                  gap-2.5
                  rounded-lg
                  border border-white/10
                  bg-white/[0.05]
                  p-3
                "
              >
                <ShieldCheck
                  className="
                    mt-0.5
                    size-4
                    shrink-0
                    text-blue-300
                  "
                  aria-hidden="true"
                />

                <p
                  className="
                    text-[10px]
                    leading-5
                    text-slate-300
                  "
                >
                  {isLiveness
                    ? "Complete each camera instruction naturally. Keep your face visible and avoid moving the device during capture."
                    : "Make sure your full face is visible, remove anything covering your face, and use even lighting."}
                </p>
              </div>

              {isLiveness && (
                <div
                  className="
                    mx-auto
                    mt-3
                    max-w-[480px]
                    rounded-lg
                    border border-amber-300/15
                    bg-amber-300/[0.06]
                    p-3
                    text-[10px]
                    leading-5
                    text-amber-100/80
                  "
                >
                  This guided capture collects fresh session
                  evidence. It does not independently perform
                  biometric identity matching or automated
                  anti-spoof detection.
                </div>
              )}

              {cameraError && (
                <div
                  role="alert"
                  className="
                    mx-auto
                    mt-3
                    flex
                    max-w-[480px]
                    items-start
                    gap-2
                    rounded-lg
                    border border-red-400/20
                    bg-red-400/[0.08]
                    p-3
                    text-xs
                    leading-5
                    text-red-200
                  "
                >
                  <ShieldAlert
                    className="
                      mt-0.5
                      size-4
                      shrink-0
                    "
                    aria-hidden="true"
                  />

                  <span>
                    {cameraError}
                  </span>
                </div>
              )}
            </div>

            <footer
              className="
                border-t border-slate-200
                bg-white
                p-4
                sm:p-5
              "
            >
              {captureState ===
                "live" &&
                !isLiveness && (
                <button
                  type="button"
                  onClick={() => {
                    void captureSelfie();
                  }}
                  className="
                    group
                    inline-flex
                    min-h-11
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-lg
                    bg-blue-600
                    px-5
                    text-sm
                    font-semibold
                    text-white
                    shadow-sm
                    transition-all
                    duration-200
                    hover:scale-[1.01]
                    hover:bg-blue-700
                    hover:shadow-md
                    active:scale-[0.98]
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-blue-500
                    focus-visible:ring-offset-2
                  "
                >
                  <Camera
                    className="
                      size-4
                      transition-transform
                      duration-200
                      group-hover:scale-110
                    "
                    aria-hidden="true"
                  />

                  Capture selfie
                </button>
              )}

              {captureState ===
                "live" &&
                isLiveness && (
                <button
                  type="button"
                  onClick={() => {
                    void beginLivenessChallenge();
                  }}
                  className="
                    group
                    inline-flex
                    min-h-11
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-lg
                    bg-blue-600
                    px-5
                    text-sm
                    font-semibold
                    text-white
                    shadow-sm
                    transition-all
                    duration-200
                    hover:scale-[1.01]
                    hover:bg-blue-700
                    hover:shadow-md
                    active:scale-[0.98]
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-blue-500
                    focus-visible:ring-offset-2
                  "
                >
                  <ScanFace
                    className="
                      size-4
                      transition-transform
                      duration-200
                      group-hover:scale-110
                    "
                    aria-hidden="true"
                  />

                  Begin live challenge
                </button>
              )}

              {captureState ===
                "challenge" && (
                <div
                  className="
                    flex
                    min-h-11
                    items-center
                    justify-center
                    gap-2
                    rounded-lg
                    bg-blue-50
                    px-5
                    text-sm
                    font-semibold
                    text-blue-700
                  "
                >
                  <LoaderCircle
                    className="
                      size-4
                      animate-spin
                    "
                    aria-hidden="true"
                  />

                  Follow the instruction above
                </div>
              )}

              {captureState ===
                "preview" && (
                <div
                  className="
                    grid
                    gap-2
                    sm:grid-cols-2
                  "
                >
                  <button
                    type="button"
                    disabled={
                      uploading
                    }
                    onClick={() => {
                      void retake();
                    }}
                    className="
                      group
                      inline-flex
                      min-h-11
                      items-center
                      justify-center
                      gap-2
                      rounded-lg
                      border border-slate-200
                      bg-white
                      px-5
                      text-sm
                      font-semibold
                      text-slate-700
                      transition-all
                      duration-200
                      hover:scale-[1.01]
                      hover:border-blue-200
                      hover:bg-blue-50
                      hover:text-blue-700
                      active:scale-[0.98]
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-blue-500
                      focus-visible:ring-offset-2
                      disabled:pointer-events-none
                      disabled:opacity-60
                    "
                  >
                    <RefreshCcw
                      className="
                        size-4
                        transition-transform
                        duration-300
                        group-hover:-rotate-45
                      "
                      aria-hidden="true"
                    />

                    Retake
                  </button>

                  <button
                    type="button"
                    disabled={
                      uploading
                    }
                    onClick={() => {
                      void uploadCapturedFace();
                    }}
                    className="
                      group
                      inline-flex
                      min-h-11
                      items-center
                      justify-center
                      gap-2
                      rounded-lg
                      bg-blue-600
                      px-5
                      text-sm
                      font-semibold
                      text-white
                      shadow-sm
                      transition-all
                      duration-200
                      hover:scale-[1.01]
                      hover:bg-blue-700
                      hover:shadow-md
                      active:scale-[0.98]
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-blue-500
                      focus-visible:ring-offset-2
                      disabled:pointer-events-none
                      disabled:opacity-60
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
                      <CheckCircle2
                        className="
                          size-4
                          transition-transform
                          duration-200
                          group-hover:scale-110
                        "
                        aria-hidden="true"
                      />
                    )}

                    {uploading
                      ? "Uploading securely…"
                      : isLiveness
                        ? "Use live capture"
                        : "Use selfie"}
                  </button>
                </div>
              )}
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  contentType: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise(
    (resolve) => {
      canvas.toBlob(
        resolve,
        contentType,
        quality,
      );
    },
  );
}

function buildFaceFilename(
  type: FaceEvidenceType,
): string {
  const timestamp =
    new Date()
      .toISOString()
      .replace(
        /[:.]/g,
        "-",
      );

  return `${type}-${timestamp}.jpg`;
}

function getCameraErrorMessage(
  cause: unknown,
): string {
  if (
    cause instanceof DOMException
  ) {
    switch (
      cause.name
    ) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        return "Camera permission was denied. Allow camera access in your browser settings and try again.";

      case "NotFoundError":
      case "DevicesNotFoundError":
        return "No front camera could be found on this device.";

      case "NotReadableError":
      case "TrackStartError":
        return "The camera is already being used by another application or could not be started.";

      case "OverconstrainedError":
        return "The requested camera configuration is unavailable on this device.";

      case "SecurityError":
        return "Camera access was blocked by the browser security policy. Open this verification page over HTTPS.";

      case "AbortError":
        return "Camera startup was interrupted. Try again.";

      default:
        break;
    }
  }

  return "The front camera could not be started. Check camera permissions and try again.";
}