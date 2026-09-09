import type {
  Metadata,
} from "next";

import {
  Inter,
} from "next/font/google";

import {
  SessionNavigationBridge,
} from "@/components/navigation/session-navigation-bridge";

import {
  ToastProvider,
} from "@/components/ui/toast-provider";

import "./globals.css";


const inter = Inter({
  subsets: ["latin"],

  display: "swap",

  variable: "--font-inter",
});


export const metadata: Metadata = {
  title: {
    default:
      "BAKABOOST Id Verification - Scan Securely.",

    template:
      "%s · BAKABOOST Id Verification - Scan Securely.",
  },

  description:
    "Secure pre-server identity verification.",

  robots: {
    index: false,
    follow: false,
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children:
    React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={inter.variable}
    >
      <body>
        <ToastProvider>
          <SessionNavigationBridge />

          {children}
        </ToastProvider>
      </body>
    </html>
  );
}