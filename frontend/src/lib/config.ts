const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://127.0.0.1:8000/api";

export const appConfig = {
  name:
    process.env.NEXT_PUBLIC_APP_NAME ??
    "SCANLY - Verify Securely & Privately",

  apiBaseUrl: API_BASE_URL,

  verificationSteps: [
    {
      key: "account",
      label: "Account",
    },
    {
      key: "identity",
      label: "Identity",
    },
    {
      key: "queue",
      label: "Queue",
    },
    {
      key: "review",
      label: "Admin Review",
    },
    {
      key: "access",
      label: "Access",
    },
  ] as const,
};