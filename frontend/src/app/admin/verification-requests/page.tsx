import {
  redirect,
} from "next/navigation";

export default function RequestsPage() {
  redirect(
    "/admin/verification-queue",
  );
}