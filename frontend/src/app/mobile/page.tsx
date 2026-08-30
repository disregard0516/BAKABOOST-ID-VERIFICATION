import type {
  Metadata,
} from "next";

import {
  MobileHandoffEntry,
} from "@/components/verification/mobile-handoff-entry";


export const metadata: Metadata = {
  title:
    "Secure Mobile Capture",

  robots: {
    index: false,
    follow: false,
    nocache: true,
  },

  referrer:
    "no-referrer",
};


export default function MobilePage() {
  return (
    <MobileHandoffEntry />
  );
}