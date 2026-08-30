import {
  apiFetch,
} from "@/lib/api";

import type {
  IdentityFormConfig,
} from "@/types/identity-form";

export async function getIdentityFormConfig(): Promise<IdentityFormConfig> {
  return apiFetch<IdentityFormConfig>(
    "/verification/form-config",
  );
}