import type {
  Metadata,
} from "next";

import {
  MobileCapturePage,
} from "@/components/verification/mobile-capture-page";


export const metadata: Metadata = {
  title:
    "Secure Mobile Capture",

  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};


export default function MobileCaptureRoute() {
  return (
    <MobileCapturePage />
  );
}