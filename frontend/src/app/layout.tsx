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
      "SCANLY - Verify Securely & Privately",

    template:
      "%s · SCANLY - Verify Securely & Privately",
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