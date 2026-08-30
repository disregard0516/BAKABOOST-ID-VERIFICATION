import type {
  Metadata,
} from "next";

import {
  SessionNavigationBridge,
} from "@/components/navigation/session-navigation-bridge";

import {
  ToastProvider,
} from "@/components/ui/toast-provider";

import "./globals.css";


export const metadata: Metadata = {
  title: {
    default:
      "ID Verify",

    template:
      "%s · ID Verify",
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
    <html lang="en">
      <body>
        <ToastProvider>
          <SessionNavigationBridge />

          {children}
        </ToastProvider>
      </body>
    </html>
  );
}