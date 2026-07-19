/** Normalize identity tokens: lowercase, strip accents, punctuation, extra spaces. */
export function normalizeIdentityToken(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9@+]/g, "")
    .trim();
}

export function normalizePhone(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\D/g, "");
}

export function normalizeEmail(value: string | null | undefined): string {
  if (!value) return "";
  return value.trim().toLowerCase();
}

export function normalizeName(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s/g, "");
}
