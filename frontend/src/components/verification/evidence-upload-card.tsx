"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Camera,
  CheckCircle2,
  FileImage,
  ImageUp,
  LoaderCircle,
  RefreshCcw,
  ShieldAlert,
  UploadCloud,
  X,
} from "lucide-react";

import {
  uploadEvidence,
} from "@/lib/submission-api";

import type {
  EvidenceType,
  UploadedEvidence,
} from "@/types/evidence";

interface EvidenceUploadCardProps {
  type: EvidenceType;
  title: string;
  description: string;
  required?: boolean;
  value: UploadedEvidence | null;
  onChange: (
    value: UploadedEvidence | null,
  ) => void;
}

type CameraState =
  | "closed"
  | "starting"
  | "live"
  | "preview";

const ACCEPTED_FILE_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ]);

const MAX_CLIENT_FILE_SIZE_BYTES =
  15 * 1024 * 1024;

export function EvidenceUploadCard({
  type,
  title,
  description,
  required = false,
  value,
  onChange,
}: EvidenceUploadCardProps) {
  const inputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

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
    cameraState,
    setCameraState,
  ] =
    useState<CameraState>(
      "closed",
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

  const isDocument =
    type ===
      "document_front" ||
    type ===
      "document_back";

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

  const closeCamera =
    useCallback(
      (): void => {
        stopCamera();
        clearPreview();

        setCameraError(
          null,
        );

        setCameraState(
          "closed",
        );
      },
      [
        clearPreview,
        stopCamera,
      ],
    );

  useEffect(
    () => {
      return () => {
        stopCamera();
        clearPreview();
      };
    },
    [
      clearPreview,
      stopCamera,
    ],
  );

  async function handleFile(
    file: File,
  ): Promise<boolean> {
    setError(
      null,
    );

    if (
      !ACCEPTED_FILE_TYPES.has(
        file.type,
      )
    ) {
      setError(
        "Unsupported file type. Use JPEG, PNG, WebP or PDF.",
      );

      return false;
    }

    if (
      file.size <= 0
    ) {
      setError(
        "The selected file is empty.",
      );

      return false;
    }

    if (
      file.size >
      MAX_CLIENT_FILE_SIZE_BYTES
    ) {
      setError(
        "The selected file is too large. Choose a file smaller than 15 MB.",
      );

      return false;
    }

    setUploading(
      true,
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

      return true;
    } catch (cause) {
      setError(
        cause instanceof Error &&
          cause.message
          ? cause.message
          : "Upload failed. Check the file type and size, then try again.",
      );

      return false;
    } finally {
      setUploading(
        false,
      );
    }
  }

  async function openCamera(): Promise<void> {
    if (
      uploading ||
      !isDocument
    ) {
      return;
    }

    setError(
      null,
    );

    setCameraError(
      null,
    );

    clearPreview();
    stopCamera();

    if (
      typeof navigator ===
        "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices
        .getUserMedia
    ) {
      setCameraError(
        "Live camera capture is not available in this browser. Use Upload from device instead.",
      );

      setCameraState(
        "closed",
      );

      return;
    }

    setCameraState(
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
                    "environment",
                },

                width: {
                  ideal: 1920,
                },

                height: {
                  ideal: 1080,
                },
              },
            });
      } catch {
        stream =
          await navigator.mediaDevices
            .getUserMedia({
              audio: false,

              video: true,
            });
      }

      streamRef.current =
        stream;

      setCameraState(
        "live",
      );
    } catch (cause) {
      stopCamera();

      setCameraState(
        "closed",
      );

      setCameraError(
        getCameraErrorMessage(
          cause,
        ),
      );
    }
  }

  useEffect(
    () => {
      if (
        cameraState !==
        "live"
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

      if (
        playPromise
      ) {
        void playPromise.catch(
          () => {
            setCameraError(
              "The camera started, but the live preview could not play. Close the camera and try again.",
            );
          },
        );
      }
    },
    [
      cameraState,
    ],
  );

  async function capturePhoto(): Promise<void> {
    const video =
      videoRef.current;

    const canvas =
      canvasRef.current;

    if (
      !video ||
      !canvas ||
      cameraState !==
        "live"
    ) {
      return;
    }

    const width =
      video.videoWidth;

    const height =
      video.videoHeight;

    if (
      width <= 0 ||
      height <= 0
    ) {
      setCameraError(
        "The camera is still preparing. Wait a moment and capture again.",
      );

      return;
    }

    setCameraError(
      null,
    );

    canvas.width =
      width;

    canvas.height =
      height;

    const context =
      canvas.getContext(
        "2d",
      );

    if (!context) {
      setCameraError(
        "Unable to prepare the captured image. Try again.",
      );

      return;
    }

    context.drawImage(
      video,
      0,
      0,
      width,
      height,
    );

    const blob =
      await canvasToBlob(
        canvas,
        "image/jpeg",
        0.92,
      );

    if (!blob) {
      setCameraError(
        "Unable to capture the photo. Try again.",
      );

      return;
    }

    const filename =
      buildCameraFilename(
        type,
      );

    const file =
      new File(
        [blob],
        filename,
        {
          type:
            "image/jpeg",

          lastModified:
            Date.now(),
        },
      );

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

    stopCamera();

    setCameraState(
      "preview",
    );
  }

  async function retakePhoto(): Promise<void> {
    clearPreview();

    setCameraError(
      null,
    );

    setCameraState(
      "closed",
    );

    await openCamera();
  }

  async function uploadCapturedPhoto(): Promise<void> {
    const file =
      capturedFileRef.current;

    if (
      !file ||
      uploading
    ) {
      return;
    }

    const uploaded =
      await handleFile(
        file,
      );

    if (uploaded) {
      closeCamera();
    }
  }

  if (value) {
    return (
      <div
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
              <span
                className="
                  text-sm
                  font-semibold
                  text-slate-900
                "
              >
                {title}
              </span>

              <span
                className="
                  rounded-full
                  bg-emerald-100
                  px-2
                  py-0.5
                  text-[10px]
                  font-semibold
                  text-emerald-700
                "
              >
                Uploaded
              </span>
            </div>

            <div
              className="
                mt-1
                truncate
                text-xs
                text-slate-500
              "
            >
              {value.filename}
            </div>

            <div
              className="
                mt-1
                text-[10px]
                text-slate-400
              "
            >
              {formatFileSize(
                value.sizeBytes,
              )}
            </div>
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
      </div>
    );
  }

  return (
    <>
      <div
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
            {uploading ? (
              <LoaderCircle
                className="
                  size-5
                  animate-spin
                "
                aria-hidden="true"
              />
            ) : (
              <FileImage
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
                mt-2
                flex
                flex-wrap
                items-center
                gap-x-3
                gap-y-1
                text-[10px]
                text-slate-400
              "
            >
              <span
                className="
                  inline-flex
                  items-center
                  gap-1.5
                "
              >
                <FileImage
                  className="size-3"
                  aria-hidden="true"
                />

                JPEG, PNG, WebP or PDF
              </span>

              <span>
                Maximum 15 MB
              </span>
            </div>

            {isDocument ? (
              <div
                className="
                  mt-4
                  flex
                  flex-col
                  gap-2
                  sm:flex-row
                "
              >
                <button
                  type="button"
                  disabled={
                    uploading ||
                    cameraState ===
                      "starting"
                  }
                  onClick={() => {
                    void openCamera();
                  }}
                  className="
                    group
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
                  {cameraState ===
                  "starting" ? (
                    <LoaderCircle
                      className="
                        size-4
                        animate-spin
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

                  {cameraState ===
                  "starting"
                    ? "Starting camera"
                    : "Capture with camera"}
                </button>

                <button
                  type="button"
                  disabled={
                    uploading
                  }
                  onClick={() => {
                    setError(
                      null,
                    );

                    inputRef.current
                      ?.click();
                  }}
                  className="
                    group
                    inline-flex
                    min-h-10
                    items-center
                    justify-center
                    gap-2
                    rounded-lg
                    border border-slate-200
                    bg-white
                    px-4
                    text-xs
                    font-semibold
                    text-slate-700
                    transition-all
                    duration-200
                    hover:-translate-y-0.5
                    hover:scale-[1.02]
                    hover:border-blue-200
                    hover:bg-blue-50/50
                    hover:text-blue-700
                    active:scale-[0.97]
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-blue-500
                    focus-visible:ring-offset-2
                    disabled:pointer-events-none
                    disabled:opacity-60
                  "
                >
                  <ImageUp
                    className="
                      size-4
                      transition-transform
                      duration-200
                      group-hover:-translate-y-0.5
                    "
                    aria-hidden="true"
                  />

                  Upload from device
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={
                  uploading
                }
                onClick={() => {
                  setError(
                    null,
                  );

                  inputRef.current
                    ?.click();
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
                {uploading ? (
                  <LoaderCircle
                    className="
                      size-4
                      animate-spin
                    "
                    aria-hidden="true"
                  />
                ) : (
                  <UploadCloud
                    className="
                      size-4
                      transition-transform
                      duration-200
                      group-hover:-translate-y-0.5
                    "
                    aria-hidden="true"
                  />
                )}

                {uploading
                  ? "Uploading"
                  : "Upload from device"}
              </button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={
          inputRef
        }
        type="file"
        hidden
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={(event) => {
          const file =
            event.target
              .files?.[0];

          if (file) {
            void handleFile(
              file,
            );
          }

          event.currentTarget
            .value =
            "";
        }}
      />

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

      {cameraState !==
        "closed" && (
        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            bg-slate-950/80
            p-3
            backdrop-blur-sm
            sm:p-6
          "
          role="dialog"
          aria-modal="true"
          aria-label={`Capture ${title}`}
        >
          <div
            className="
              flex
              max-h-[calc(100vh-24px)]
              w-full
              max-w-[760px]
              flex-col
              overflow-hidden
              rounded-2xl
              border border-white/10
              bg-white
              shadow-[0_30px_100px_rgba(0,0,0,0.35)]
              sm:max-h-[calc(100vh-48px)]
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                gap-4
                border-b border-slate-200
                px-5
                py-4
              "
            >
              <div>
                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  <div
                    className="
                      flex
                      size-8
                      items-center
                      justify-center
                      rounded-lg
                      bg-blue-50
                      text-blue-600
                    "
                  >
                    <Camera
                      className="size-4"
                      aria-hidden="true"
                    />
                  </div>

                  <div
                    className="
                      text-sm
                      font-semibold
                      text-slate-950
                    "
                  >
                    Capture {title}
                  </div>
                </div>

                <p
                  className="
                    mt-2
                    text-xs
                    leading-5
                    text-slate-500
                  "
                >
                  Keep the full document inside the frame and
                  make sure all text is readable.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeCamera
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
                "
                aria-label="Close camera"
              >
                <X
                  className="size-4"
                  aria-hidden="true"
                />
              </button>
            </div>

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
                  aspect-[4/3]
                  w-full
                  max-w-[680px]
                  overflow-hidden
                  rounded-xl
                  bg-black
                "
              >
                {cameraState ===
                  "starting" && (
                  <div
                    className="
                      absolute
                      inset-0
                      z-10
                      flex
                      flex-col
                      items-center
                      justify-center
                      text-white
                    "
                  >
                    <LoaderCircle
                      className="
                        size-7
                        animate-spin
                      "
                      aria-hidden="true"
                    />

                    <div
                      className="
                        mt-3
                        text-xs
                        font-medium
                      "
                    >
                      Starting camera…
                    </div>
                  </div>
                )}

                {cameraState ===
                  "live" && (
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
                        object-cover
                      "
                    />

                    <div
                      className="
                        pointer-events-none
                        absolute
                        inset-[7%]
                        rounded-xl
                        border-2
                        border-white/80
                        shadow-[0_0_0_9999px_rgba(0,0,0,0.18)]
                      "
                    />

                    <div
                      className="
                        pointer-events-none
                        absolute
                        bottom-5
                        left-1/2
                        -translate-x-1/2
                        whitespace-nowrap
                        rounded-full
                        border border-white/10
                        bg-black/60
                        px-3
                        py-1.5
                        text-center
                        text-[10px]
                        font-medium
                        text-white
                        backdrop-blur
                      "
                    >
                      Align the full document inside the frame
                    </div>
                  </>
                )}

                {cameraState ===
                  "preview" &&
                  previewUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={
                        previewUrl
                      }
                      alt={`Preview of ${title}`}
                      className="
                        h-full
                        w-full
                        object-contain
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

              {cameraError && (
                <div
                  role="alert"
                  className="
                    mx-auto
                    mt-4
                    max-w-[680px]
                    rounded-lg
                    border border-amber-400/20
                    bg-amber-300/10
                    p-3
                    text-xs
                    leading-5
                    text-amber-100
                  "
                >
                  {cameraError}
                </div>
              )}
            </div>

            <div
              className="
                border-t border-slate-200
                bg-white
                p-4
                sm:p-5
              "
            >
              {cameraState ===
                "live" && (
                <button
                  type="button"
                  onClick={() => {
                    void capturePhoto();
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

                  Capture photo
                </button>
              )}

              {cameraState ===
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
                      void retakePhoto();
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
                      void uploadCapturedPhoto();
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
                      : "Use photo"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise(
    (resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(
            blob,
          );
        },
        type,
        quality,
      );
    },
  );
}

function buildCameraFilename(
  type: EvidenceType,
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
        return "Camera permission was denied. Allow camera access in your browser settings or use Upload from device.";

      case "NotFoundError":
      case "DevicesNotFoundError":
        return "No camera was found on this device. Use Upload from device instead.";

      case "NotReadableError":
      case "TrackStartError":
        return "The camera is already in use or could not be started. Close other camera apps and try again.";

      case "OverconstrainedError":
        return "The preferred camera is unavailable. Try again or use Upload from device.";

      case "SecurityError":
        return "Camera access is blocked by the browser security policy.";

      case "AbortError":
        return "Camera startup was interrupted. Try again.";

      default:
        break;
    }
  }

  return "The camera could not be started. Check browser permission and try again, or use Upload from device.";
}

function formatFileSize(
  bytes: number,
): string {
  if (
    !Number.isFinite(
      bytes,
    ) ||
    bytes <= 0
  ) {
    return "Uploaded";
  }

  if (
    bytes <
    1024
  ) {
    return `${bytes} B`;
  }

  const kilobytes =
    bytes / 1024;

  if (
    kilobytes <
    1024
  ) {
    return `${kilobytes.toFixed(
      1,
    )} KB`;
  }

  const megabytes =
    kilobytes /
    1024;

  return `${megabytes.toFixed(
    1,
  )} MB`;
}