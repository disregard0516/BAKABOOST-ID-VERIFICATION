"use client";

import type { ReactNode } from "react";

import {
  ArrowRight,
  Check,
  CheckCircle2,
  FileCheck2,
  LoaderCircle,
  LockKeyhole,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { Field } from "@/components/forms/field";
import { SelectField } from "@/components/forms/select-field";

import { EvidenceUploadCard } from "@/components/verification/evidence-upload-card";
import { FaceCaptureCard } from "@/components/verification/face-capture-card";
import { MobileCaptureHandoff } from "@/components/verification/mobile-capture-handoff";
import { VerificationShell } from "@/components/verification/verification-shell";

import { getIdentityFormConfig } from "@/lib/identity-api";
import { submitVerification } from "@/lib/submission-api";

import type { UploadedEvidence } from "@/types/evidence";
import type { IdentityFormConfig } from "@/types/identity-form";

type IdentityFormMode =
  | "initial"
  | "resubmission";

interface IdentityVerificationFormProps {
  mode?: IdentityFormMode;
}

export function IdentityVerificationForm({
  mode = "initial",
}: IdentityVerificationFormProps) {
  const router = useRouter();

  const [config, setConfig] =
    useState<IdentityFormConfig | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [submitError, setSubmitError] =
    useState<string | null>(null);

  const [legalName, setLegalName] =
    useState("");

  const [dateOfBirth, setDateOfBirth] =
    useState("");

  const [ageResult, setAgeResult] =
    useState("");

  const [issuingCountry, setIssuingCountry] =
    useState("");

  const [documentType, setDocumentType] =
    useState("");

  const [documentFront, setDocumentFront] =
    useState<UploadedEvidence | null>(null);

  const [documentBack, setDocumentBack] =
    useState<UploadedEvidence | null>(null);

  const [selfie, setSelfie] =
    useState<UploadedEvidence | null>(null);

  const [liveness, setLiveness] =
    useState<UploadedEvidence | null>(null);

  const [consent, setConsent] =
    useState(false);

  const [accuracy, setAccuracy] =
    useState(false);

  useEffect(() => {
    let active = true;

    async function load(): Promise<void> {
      setLoading(true);
      setLoadError(null);

      try {
        const result =
          await getIdentityFormConfig();

        if (!active) {
          return;
        }

        setConfig(result);
      } catch (cause) {
        if (!active) {
          return;
        }

        setLoadError(
          cause instanceof Error
            ? cause.message
            : "We could not load your verification requirements.",
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

  const handleMobileEvidence =
    useCallback(
      (
        evidence: UploadedEvidence,
      ): void => {
        switch (
          evidence.evidenceType
        ) {
          case "document_front":
            setDocumentFront(
              evidence,
            );
            break;

          case "document_back":
            setDocumentBack(
              evidence,
            );
            break;

          case "selfie":
            setSelfie(
              evidence,
            );
            break;

          case "liveness":
            setLiveness(
              evidence,
            );
            break;
        }
      },
      [],
    );

  const evidenceIds =
    useMemo(
      () =>
        [
          documentFront,
          documentBack,
          selfie,
          liveness,
        ]
          .filter(
            (
              item,
            ): item is UploadedEvidence =>
              item !== null,
          )
          .map(
            (item) =>
              item.evidenceId,
          ),
      [
        documentFront,
        documentBack,
        selfie,
        liveness,
      ],
    );

  function validateRequiredFields(): string | null {
    if (!config) {
      return "Verification requirements are unavailable.";
    }

    const required =
      config.required_evidence;

    if (
      required.legal_name &&
      !legalName.trim()
    ) {
      return "Enter your legal name.";
    }

    if (
      required.date_of_birth &&
      !dateOfBirth
    ) {
      return "Enter your date of birth.";
    }

    if (
      required.age_confirmation &&
      !ageResult
    ) {
      return "Complete the age confirmation.";
    }

    if (
      required.issuing_country &&
      !issuingCountry.trim()
    ) {
      return "Enter the document issuing country.";
    }

    if (
      required.document_type &&
      !documentType
    ) {
      return "Select the document type.";
    }

    if (
      required.document_front &&
      !documentFront
    ) {
      return "Upload the required document front.";
    }

    if (
      required.document_back &&
      !documentBack
    ) {
      return "Upload the required document back.";
    }

    if (
      required.selfie &&
      !selfie
    ) {
      return "Complete the required live selfie capture.";
    }

    if (
      required.liveness &&
      !liveness
    ) {
      return "Complete the required live face capture.";
    }

    if (!consent) {
      return "Confirm consent before submitting.";
    }

    if (!accuracy) {
      return "Confirm that the submitted information is accurate.";
    }

    return null;
  }

  async function handleSubmit(): Promise<void> {
    if (
      !config ||
      submitting
    ) {
      return;
    }

    setSubmitError(null);

    const validationError =
      validateRequiredFields();

    if (validationError) {
      setSubmitError(
        validationError,
      );
      return;
    }

    setSubmitting(true);

    try {
      await submitVerification({
        legal_name:
          legalName.trim() ||
          null,

        date_of_birth:
          dateOfBirth ||
          null,

        age_result:
          ageResult ||
          null,

        issuing_country:
          issuingCountry.trim()
            ? issuingCountry
                .trim()
                .toUpperCase()
            : null,

        document_type:
          documentType ||
          null,

        evidence_ids:
          evidenceIds,

        consent_confirmed:
          consent,

        accuracy_confirmed:
          accuracy,
      });

      router.replace(
        "/verification/waiting",
      );
    } catch (cause) {
      setSubmitError(
        cause instanceof Error
          ? cause.message
          : "We could not submit your verification. Review the required information and try again.",
      );

      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <VerificationShell currentStep="identity">
        <main
          className="
            mx-auto
            flex min-h-[520px]
            max-w-[1080px]
            items-center
            justify-center
            px-5
            py-10
          "
        >
          <div
            className="
              flex
              w-full max-w-[520px]
              flex-col
              items-center
              rounded-2xl
              border border-slate-200
              bg-white
              px-8
              py-14
              text-center
              shadow-[0_12px_40px_rgba(15,23,42,0.05)]
            "
          >
            <div
              className="
                flex size-12
                items-center
                justify-center
                rounded-xl
                bg-blue-50
                text-blue-600
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

            <h1
              className="
                mt-5
                text-xl
                font-semibold
                tracking-[-0.03em]
                text-slate-950
              "
            >
              Preparing your verification
            </h1>

            <p
              className="
                mt-2
                max-w-[340px]
                text-sm
                leading-6
                text-slate-500
              "
            >
              Loading the exact information and evidence
              required for your request.
            </p>
          </div>
        </main>
      </VerificationShell>
    );
  }

  if (
    !config ||
    loadError
  ) {
    return (
      <VerificationShell currentStep="identity">
        <main
          className="
            mx-auto
            flex min-h-[520px]
            max-w-[1080px]
            items-center
            justify-center
            px-5
            py-10
          "
        >
          <div
            className="
              w-full max-w-[580px]
              rounded-2xl
              border border-red-100
              bg-white
              px-8
              py-12
              text-center
              shadow-[0_12px_40px_rgba(15,23,42,0.05)]
            "
          >
            <div
              className="
                mx-auto
                flex size-12
                items-center
                justify-center
                rounded-xl
                bg-red-50
                text-red-600
              "
            >
              <ShieldAlert
                className="size-5"
                aria-hidden="true"
              />
            </div>

            <h1
              className="
                mt-5
                text-2xl
                font-semibold
                tracking-[-0.035em]
                text-slate-950
              "
            >
              Requirements unavailable
            </h1>

            <p
              className="
                mx-auto
                mt-3
                max-w-[440px]
                text-sm
                leading-6
                text-slate-500
              "
            >
              {loadError ??
                "We could not load your verification requirements."}
            </p>
          </div>
        </main>
      </VerificationShell>
    );
  }

  const required =
    config.required_evidence;

  const hasFileEvidence =
    required.document_front ||
    required.document_back ||
    required.selfie ||
    required.liveness;

  const evidenceRequirements =
    [
      {
        required:
          required.document_front,
        completed:
          Boolean(
            documentFront,
          ),
      },
      {
        required:
          required.document_back,
        completed:
          Boolean(
            documentBack,
          ),
      },
      {
        required:
          required.selfie,
        completed:
          Boolean(
            selfie,
          ),
      },
      {
        required:
          required.liveness,
        completed:
          Boolean(
            liveness,
          ),
      },
    ].filter(
      (item) =>
        item.required,
    );

  const evidenceRequiredCount =
    evidenceRequirements.length;

  const evidenceCompletedCount =
    evidenceRequirements.filter(
      (item) =>
        item.completed,
    ).length;

  const detailsRequirements =
    [
      {
        required:
          required.legal_name,
        completed:
          Boolean(
            legalName.trim(),
          ),
      },
      {
        required:
          required.date_of_birth,
        completed:
          Boolean(
            dateOfBirth,
          ),
      },
      {
        required:
          required.age_confirmation,
        completed:
          Boolean(
            ageResult,
          ),
      },
      {
        required:
          required.issuing_country,
        completed:
          Boolean(
            issuingCountry.trim(),
          ),
      },
      {
        required:
          required.document_type,
        completed:
          Boolean(
            documentType,
          ),
      },
    ].filter(
      (item) =>
        item.required,
    );

  const detailsRequiredCount =
    detailsRequirements.length;

  const detailsCompletedCount =
    detailsRequirements.filter(
      (item) =>
        item.completed,
    ).length;

  const confirmationsComplete =
    consent &&
    accuracy;

  const totalRequiredCount =
    detailsRequiredCount +
    evidenceRequiredCount +
    2;

  const completedRequiredCount =
    detailsCompletedCount +
    evidenceCompletedCount +
    (consent ? 1 : 0) +
    (accuracy ? 1 : 0);

  const completionPercent =
    totalRequiredCount > 0
      ? Math.round(
          (
            completedRequiredCount /
            totalRequiredCount
          ) *
            100,
        )
      : 100;

  const readyToSubmit =
    validateRequiredFields() ===
    null;

  return (
    <VerificationShell currentStep="identity">
      <main
        className="
          mx-auto
          w-full
          max-w-[1120px]
          px-4
          py-7
          sm:px-6
          sm:py-10
        "
      >
        <div
          className="
            overflow-hidden
            rounded-[24px]
            border border-slate-200
            bg-white
            shadow-[0_18px_60px_rgba(15,23,42,0.055)]
          "
        >
          <header
            className="
              border-b
              border-slate-200
              px-5
              py-7
              sm:px-8
              sm:py-8
              lg:px-10
            "
          >
            <div
              className="
                flex
                flex-col
                gap-6
                md:flex-row
                md:items-end
                md:justify-between
              "
            >
              <div className="max-w-[680px]">
                <div
                  className="
                    flex
                    items-center
                    gap-2
                    text-xs
                    font-semibold
                    text-blue-600
                  "
                >
                  <ShieldCheck
                    className="size-4"
                    aria-hidden="true"
                  />

                  Secure verification
                </div>

                <h1
                  className="
                    mt-3
                    text-[28px]
                    font-semibold
                    leading-tight
                    tracking-[-0.04em]
                    text-slate-950
                    sm:text-[34px]
                  "
                >
                  {mode ===
                  "resubmission"
                    ? "Update your verification"
                    : "Complete your identity check"}
                </h1>

                <p
                  className="
                    mt-3
                    max-w-[650px]
                    text-sm
                    leading-6
                    text-slate-500
                  "
                >
                  {mode ===
                  "resubmission"
                    ? "Provide the corrected or additional information requested by the administrator. Your previous approval status does not change until the new submission is reviewed."
                    : "Complete only the information requested below. Your submission enters the administrator review queue before any Discord access can be released."}
                </p>
              </div>

              <div
                className="
                  w-full
                  max-w-[270px]
                  rounded-xl
                  border border-slate-200
                  bg-slate-50
                  px-4
                  py-3.5
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
                        font-semibold
                        uppercase
                        tracking-[0.08em]
                        text-slate-400
                      "
                    >
                      Completion
                    </div>

                    <div
                      className="
                        mt-1
                        text-sm
                        font-medium
                        text-slate-700
                      "
                    >
                      {completedRequiredCount} of{" "}
                      {totalRequiredCount} ready
                    </div>
                  </div>

                  <div
                    className="
                      text-xl
                      font-semibold
                      tracking-[-0.04em]
                      text-blue-600
                    "
                  >
                    {completionPercent}%
                  </div>
                </div>

                <div
                  className="
                    mt-3
                    h-1.5
                    overflow-hidden
                    rounded-full
                    bg-slate-200
                  "
                >
                  <div
                    className="
                      h-full
                      rounded-full
                      bg-blue-600
                      transition-[width]
                      duration-500
                      ease-out
                    "
                    style={{
                      width:
                        `${completionPercent}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </header>

          <div
            className="
              px-5
              py-4
              sm:px-8
              lg:px-10
            "
          >
            {mode ===
              "resubmission" && (
              <div
                className="
                  my-5
                  flex
                  items-start
                  gap-3
                  rounded-xl
                  border border-amber-200
                  bg-amber-50
                  p-4
                "
              >
                <ShieldAlert
                  className="
                    mt-0.5
                    size-4
                    shrink-0
                    text-amber-600
                  "
                  aria-hidden="true"
                />

                <div>
                  <div
                    className="
                      text-sm
                      font-semibold
                      text-amber-900
                    "
                  >
                    Additional information requested
                  </div>

                  <p
                    className="
                      mt-1
                      text-xs
                      leading-5
                      text-amber-700
                    "
                  >
                    Server access remains locked while this
                    update is reviewed.
                  </p>
                </div>
              </div>
            )}

            {detailsRequiredCount >
              0 && (
              <FormSection
                number="01"
                title="Your information"
                description="Provide the personal details requested for this verification."
                status={`${detailsCompletedCount} of ${detailsRequiredCount} complete`}
                complete={
                  detailsCompletedCount ===
                  detailsRequiredCount
                }
              >
                <div
                  className="
                    grid
                    grid-cols-1
                    gap-5
                    sm:grid-cols-2
                  "
                >
                  {required.legal_name && (
                    <Field
                      label="Legal name"
                      value={
                        legalName
                      }
                      onChange={(
                        event,
                      ) =>
                        setLegalName(
                          event.target
                            .value,
                        )
                      }
                      autoComplete="name"
                      placeholder="As shown on your document"
                    />
                  )}

                  {required.date_of_birth && (
                    <Field
                      label="Date of birth"
                      type="date"
                      value={
                        dateOfBirth
                      }
                      onChange={(
                        event,
                      ) =>
                        setDateOfBirth(
                          event.target
                            .value,
                        )
                      }
                    />
                  )}

                  {required.age_confirmation && (
                    <SelectField
                      label="Age confirmation"
                      value={
                        ageResult
                      }
                      onChange={(
                        event,
                      ) =>
                        setAgeResult(
                          event.target
                            .value,
                        )
                      }
                    >
                      <option value="">
                        Select
                      </option>

                      <option value="meets_requirement">
                        I meet the required age
                      </option>

                      <option value="does_not_meet_requirement">
                        I do not meet the required age
                      </option>
                    </SelectField>
                  )}

                  {required.issuing_country && (
                    <Field
                      label="Issuing country"
                      hint="2-letter code"
                      value={
                        issuingCountry
                      }
                      onChange={(
                        event,
                      ) =>
                        setIssuingCountry(
                          event.target
                            .value
                            .replace(
                              /[^a-zA-Z]/g,
                              "",
                            )
                            .toUpperCase()
                            .slice(
                              0,
                              2,
                            ),
                        )
                      }
                      autoComplete="country"
                      placeholder="US"
                    />
                  )}

                  {required.document_type && (
                    <SelectField
                      label="Document type"
                      value={
                        documentType
                      }
                      onChange={(
                        event,
                      ) =>
                        setDocumentType(
                          event.target
                            .value,
                        )
                      }
                    >
                      <option value="">
                        Select document
                      </option>

                      <option value="passport">
                        Passport
                      </option>

                      <option value="driver_license">
                        Driver license
                      </option>

                      <option value="national_id">
                        National ID
                      </option>

                      <option value="other">
                        Other accepted document
                      </option>
                    </SelectField>
                  )}
                </div>
              </FormSection>
            )}

            {detailsRequiredCount >
              0 && (
              <SectionDivider />
            )}

            {hasFileEvidence && (
              <FormSection
                number={
                  detailsRequiredCount >
                  0
                    ? "02"
                    : "01"
                }
                title="Evidence capture"
                description="Upload the requested identity evidence securely."
                status={`${evidenceCompletedCount} of ${evidenceRequiredCount} received`}
                complete={
                  evidenceRequiredCount >
                    0 &&
                  evidenceCompletedCount ===
                    evidenceRequiredCount
                }
              >
                <div
                  className="
                    rounded-xl
                    border border-blue-100
                    bg-blue-50/60
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
                        size-9
                        shrink-0
                        items-center
                        justify-center
                        rounded-lg
                        bg-white
                        text-blue-600
                        shadow-sm
                      "
                    >
                      <Smartphone
                        className="size-4"
                        aria-hidden="true"
                      />
                    </div>

                    <div>
                      <div
                        className="
                          text-sm
                          font-semibold
                          text-slate-900
                        "
                      >
                        Choose how you capture evidence
                      </div>

                      <p
                        className="
                          mt-1
                          text-xs
                          leading-5
                          text-slate-500
                        "
                      >
                        Use your phone camera with the secure
                        QR handoff, or capture and upload
                        directly from this device.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <MobileCaptureHandoff
                    onEvidenceReceived={
                      handleMobileEvidence
                    }
                  />
                </div>

                <div
                  className="
                    my-6
                    flex
                    items-center
                    gap-4
                  "
                >
                  <div
                    className="
                      h-px
                      flex-1
                      bg-slate-200
                    "
                  />

                  <span
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-[0.08em]
                      text-slate-400
                    "
                  >
                    or capture here
                  </span>

                  <div
                    className="
                      h-px
                      flex-1
                      bg-slate-200
                    "
                  />
                </div>

                <div className="space-y-4">
                  {required.document_front && (
                    <EvidenceUploadCard
                      type="document_front"
                      title="Document front"
                      description="Upload a clear image of the front of the requested identity document."
                      required
                      value={
                        documentFront
                      }
                      onChange={
                        setDocumentFront
                      }
                    />
                  )}

                  {required.document_back && (
                    <EvidenceUploadCard
                      type="document_back"
                      title="Document back"
                      description="Upload the reverse side if your document contains information on both sides."
                      required
                      value={
                        documentBack
                      }
                      onChange={
                        setDocumentBack
                      }
                    />
                  )}

                  {required.selfie && (
                    <FaceCaptureCard
                      type="selfie"
                      title="Selfie"
                      description="Capture a fresh selfie using your live front camera. Saved image uploads are not accepted for this step."
                      required
                      value={
                        selfie
                      }
                      onChange={
                        setSelfie
                      }
                    />
                  )}

                  {required.liveness && (
                    <FaceCaptureCard
                      type="liveness"
                      title="Live face capture"
                      description="Complete a guided live front-camera capture during this verification session."
                      required
                      value={
                        liveness
                      }
                      onChange={
                        setLiveness
                      }
                    />
                  )}
                </div>
              </FormSection>
            )}

            {!hasFileEvidence && (
              <FormSection
                number={
                  detailsRequiredCount >
                  0
                    ? "02"
                    : "01"
                }
                title="Evidence"
                description="No file uploads are required for this request."
                status="Not required"
                complete
              >
                <div
                  className="
                    flex
                    items-start
                    gap-3
                    rounded-xl
                    border border-slate-200
                    bg-slate-50
                    p-4
                  "
                >
                  <FileCheck2
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
                      text-sm
                      leading-6
                      text-slate-500
                    "
                  >
                    This verification request does not
                    require document or image uploads.
                  </p>
                </div>
              </FormSection>
            )}

            <SectionDivider />

            <FormSection
              number={
                detailsRequiredCount >
                0
                  ? hasFileEvidence
                    ? "03"
                    : "02"
                  : hasFileEvidence
                    ? "02"
                    : "01"
              }
              title="Confirm & submit"
              description="Review the confirmations before sending your verification."
              status={
                confirmationsComplete
                  ? "Ready"
                  : "2 confirmations required"
              }
              complete={
                confirmationsComplete
              }
            >
              <div className="space-y-3">
                <ConfirmationRow
                  checked={
                    consent
                  }
                  onChange={
                    setConsent
                  }
                >
                  I consent to the requested verification
                  data being processed for this
                  verification.
                </ConfirmationRow>

                <ConfirmationRow
                  checked={
                    accuracy
                  }
                  onChange={
                    setAccuracy
                  }
                >
                  I confirm that the submitted information
                  and evidence are accurate.
                </ConfirmationRow>
              </div>

              <div
                className="
                  mt-6
                  grid
                  gap-4
                  rounded-xl
                  border border-slate-200
                  bg-slate-50
                  p-4
                  sm:grid-cols-[1fr_auto]
                  sm:items-center
                "
              >
                <div
                  className="
                    flex
                    items-start
                    gap-3
                  "
                >
                  <LockKeyhole
                    className="
                      mt-0.5
                      size-4
                      shrink-0
                      text-blue-600
                    "
                    aria-hidden="true"
                  />

                  <div>
                    <div
                      className="
                        text-sm
                        font-semibold
                        text-slate-900
                      "
                    >
                      Privacy & retention
                    </div>

                    <p
                      className="
                        mt-1
                        text-xs
                        leading-5
                        text-slate-500
                      "
                    >
                      Identity evidence is submitted through
                      this verification portal, not through
                      Discord messages.
                    </p>
                  </div>
                </div>

                <div
                  className="
                    rounded-lg
                    border border-slate-200
                    bg-white
                    px-4
                    py-2.5
                    sm:text-right
                  "
                >
                  <div
                    className="
                      text-[9px]
                      font-semibold
                      uppercase
                      tracking-[0.08em]
                      text-slate-400
                    "
                  >
                    Raw evidence retention
                  </div>

                  <div
                    className="
                      mt-1
                      text-sm
                      font-semibold
                      text-slate-800
                    "
                  >
                    {config.retention_days !==
                    null
                      ? `${config.retention_days} days`
                      : "Policy controlled"}
                  </div>
                </div>
              </div>
            </FormSection>

            {submitError && (
              <div
                role="alert"
                className="
                  my-6
                  flex
                  items-start
                  gap-3
                  rounded-xl
                  border border-red-200
                  bg-red-50
                  p-4
                  text-sm
                  leading-6
                  text-red-700
                "
              >
                <ShieldAlert
                  className="
                    mt-1
                    size-4
                    shrink-0
                  "
                  aria-hidden="true"
                />

                <span>
                  {submitError}
                </span>
              </div>
            )}

            <div
              className="
                border-t
                border-slate-200
                py-7
              "
            >
              <div
                className="
                  flex
                  flex-col
                  gap-5
                  lg:flex-row
                  lg:items-center
                  lg:justify-between
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
                    {readyToSubmit ? (
                      <CheckCircle2
                        className="
                          size-4
                          text-emerald-600
                        "
                        aria-hidden="true"
                      />
                    ) : (
                      <LockKeyhole
                        className="
                          size-4
                          text-slate-400
                        "
                        aria-hidden="true"
                      />
                    )}

                    <p
                      className="
                        text-sm
                        font-semibold
                        text-slate-900
                      "
                    >
                      {readyToSubmit
                        ? "Everything required is ready"
                        : "Complete all required items"}
                    </p>
                  </div>

                  <p
                    className="
                      mt-1
                      max-w-[570px]
                      text-xs
                      leading-5
                      text-slate-500
                    "
                  >
                    Submission sends your verification to
                    the administrator queue. It does not
                    grant Discord access automatically.
                  </p>
                </div>

                <div
                  className="
                    flex
                    items-center
                    gap-3
                  "
                >
                  <div
                    className="
                      hidden
                      text-xs
                      font-medium
                      text-slate-500
                      sm:block
                    "
                  >
                    {completionPercent}% complete
                  </div>

                  <button
                    type="button"
                    disabled={
                      submitting
                    }
                    onClick={() => {
                      void handleSubmit();
                    }}
                    className="
                      group
                      inline-flex
                      min-h-11
                      min-w-[210px]
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
                      hover:-translate-y-0.5
                      hover:scale-[1.02]
                      hover:bg-blue-700
                      hover:shadow-md
                      active:scale-[0.97]
                      active:bg-blue-800
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-blue-500
                      focus-visible:ring-offset-2
                      disabled:pointer-events-none
                      disabled:opacity-60
                    "
                  >
                    {submitting ? (
                      <>
                        <LoaderCircle
                          className="
                            size-4
                            animate-spin
                          "
                          aria-hidden="true"
                        />

                        {mode ===
                        "resubmission"
                          ? "Submitting update…"
                          : "Submitting securely…"}
                      </>
                    ) : (
                      <>
                        {mode ===
                        "resubmission"
                          ? "Submit updated verification"
                          : "Submit verification"}

                        <ArrowRight
                          className="
                            size-4
                            transition-transform
                            duration-200
                            group-hover:translate-x-1
                          "
                          aria-hidden="true"
                        />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div
              className="
                -mx-5
                border-t
                border-slate-200
                bg-slate-50/70
                px-5
                py-5
                sm:-mx-8
                sm:px-8
                lg:-mx-10
                lg:px-10
              "
            >
              <div
                className="
                  flex
                  items-start
                  gap-3
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
                    max-w-[760px]
                    text-xs
                    leading-5
                    text-slate-500
                  "
                >
                  Approval is a separate administrator
                  decision. Completing this form only
                  submits your verification for review.
                  Server access remains locked until an
                  administrator approves the request.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </VerificationShell>
  );
}

function FormSection({
  number,
  title,
  description,
  status,
  complete,
  children,
}: {
  number: string;
  title: string;
  description: string;
  status: string;
  complete: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className="
        grid
        grid-cols-1
        gap-6
        py-7
        md:grid-cols-[230px_minmax(0,1fr)]
        md:gap-10
        lg:grid-cols-[260px_minmax(0,1fr)]
      "
    >
      <div>
        <div
          className="
            flex
            items-start
            gap-3
          "
        >
          <div
            className={`
              flex
              size-8
              shrink-0
              items-center
              justify-center
              rounded-lg
              text-xs
              font-semibold
              ${
                complete
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-blue-50 text-blue-600"
              }
            `}
          >
            {complete ? (
              <Check
                className="size-4"
                aria-hidden="true"
              />
            ) : (
              number
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
              {title}
            </h2>

            <p
              className="
                mt-1.5
                text-xs
                leading-5
                text-slate-500
              "
            >
              {description}
            </p>

            <div
              className={`
                mt-3
                inline-flex
                items-center
                gap-1.5
                rounded-full
                px-2.5
                py-1
                text-[10px]
                font-medium
                ${
                  complete
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }
              `}
            >
              {complete && (
                <CheckCircle2
                  className="size-3"
                  aria-hidden="true"
                />
              )}

              {status}
            </div>
          </div>
        </div>
      </div>

      <div
        className="
          min-w-0
          md:max-w-[720px]
        "
      >
        {children}
      </div>
    </section>
  );
}

function SectionDivider() {
  return (
    <div
      aria-hidden="true"
      className="
        h-px
        w-full
        bg-slate-200
      "
    />
  );
}

function ConfirmationRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean;

  onChange: (
    value: boolean,
  ) => void;

  children: ReactNode;
}) {
  return (
    <label
      className={`
        flex
        cursor-pointer
        items-start
        gap-3
        rounded-xl
        border
        p-4
        transition-all
        duration-200
        ${
          checked
            ? "border-blue-200 bg-blue-50/60"
            : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/20"
        }
      `}
    >
      <input
        type="checkbox"
        checked={
          checked
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target.checked,
          )
        }
        className="
          mt-0.5
          size-4
          shrink-0
          cursor-pointer
          accent-blue-600
        "
      />

      <span
        className="
          text-sm
          leading-6
          text-slate-600
        "
      >
        {children}
      </span>
    </label>
  );
}