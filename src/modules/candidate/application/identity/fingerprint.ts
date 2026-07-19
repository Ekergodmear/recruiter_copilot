import { normalizeEmail, normalizeName, normalizePhone } from "./normalize.js";

export function buildFingerprint(params: {
  name: string | null | undefined;
  email?: string | null;
  phone?: string | null;
}): string {
  const name = normalizeName(params.name);
  const email = normalizeEmail(params.email);
  const phone = normalizePhone(params.phone);
  return [name, email, phone].join("|");
}
