export const GUESTBOOK_SIGNATURE_MAX = 24;
export const GUESTBOOK_SIGNATURE_MAX_RAW = 48;

const BLOCKED_SIGNATURES = new Set(["pier", "ethan", "ethan pier"]);
const BARE_DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const UNSAFE_CONTROL_RE = /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u;

export type ParsedGuestbookSignature =
  | { ok: true; value: string | null }
  | { ok: false; error: "invalid" };

function hasUrlOrEmail(value: string): boolean {
  if (/\w+:\/\//i.test(value) || /www\./i.test(value)) return true;
  if (EMAIL_RE.test(value)) return true;
  return value.split(" ").some((token) => {
    const host = token.replace(/[/?#].*$/, "");
    return host !== "" && BARE_DOMAIN_RE.test(host);
  });
}

export function parseGuestbookSignature(raw: unknown): ParsedGuestbookSignature {
  if (raw === undefined || raw === null) return { ok: true, value: null };
  if (typeof raw !== "string") return { ok: false, error: "invalid" };
  if (raw.length > GUESTBOOK_SIGNATURE_MAX_RAW) return { ok: false, error: "invalid" };
  const nfc = raw.normalize("NFC");
  if (UNSAFE_CONTROL_RE.test(nfc) || /[\t\n\r]/.test(nfc)) {
    return { ok: false, error: "invalid" };
  }
  const normalized = nfc.replace(/\s+/g, " ").trim();
  if (normalized === "") return { ok: true, value: null };
  if ([...normalized].length > GUESTBOOK_SIGNATURE_MAX) return { ok: false, error: "invalid" };
  if (hasUrlOrEmail(normalized)) return { ok: false, error: "invalid" };
  if (/^visitor_/i.test(normalized)) return { ok: false, error: "invalid" };
  if (BLOCKED_SIGNATURES.has(normalized.toLocaleLowerCase("en"))) {
    return { ok: false, error: "invalid" };
  }
  return { ok: true, value: normalized };
}
