/**
 * College email addresses.
 *
 * MentorMatch is scoped to real students on real campuses, so the address field
 * only accepts institutional domains. A personal Gmail tells us nothing about
 * which campus somebody is on, which is the whole point of the field.
 *
 * This is a format gate, not proof: nothing here checks that the mailbox exists
 * or that the person owns it. That's what the OTP step will do when it lands.
 * Until then the address never leaves the browser (see `toProfileInput`).
 */

/** The endings worth naming in the hint and the error message. */
export const COLLEGE_EMAIL_SUFFIXES = ["ac.in", "edu.in", "res.in", "edu"] as const;

/**
 * `ac.<cc>` and `edu.<cc>` cover ac.in, edu.in, ac.uk, edu.au, ac.jp and the
 * rest without listing every country, and a bare `.edu` covers US institutions.
 */
const ACADEMIC_PATTERN = /\.(?:ac|edu)\.[a-z]{2,}$|\.edu$/;

/** Institutional domains in use that predate the ac.in convention. */
const EXTRA_ACADEMIC_SUFFIXES = [".res.in", ".ernet.in", ".ac.uk", ".edu.au"];

/** Named so the error can say why rather than just "not allowed". */
const CONSUMER_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.in",
  "yahoo.co.in",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
  "rediffmail.com",
  "aol.com",
  "zoho.com",
  "mail.com",
  "yandex.com",
]);

/** Deliberately strict: one @, no spaces, a dotted domain. */
const SHAPE_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MAX_EMAIL_LENGTH = 254;

/** The domain part, lowercased. Empty when the address has no usable domain. */
export function emailDomain(value: string): string {
  const at = value.trim().toLowerCase().lastIndexOf("@");
  return at === -1 ? "" : value.trim().toLowerCase().slice(at + 1);
}

export function isCollegeDomain(domain: string): boolean {
  if (!domain || CONSUMER_DOMAINS.has(domain)) return false;
  if (EXTRA_ACADEMIC_SUFFIXES.some((suffix) => domain.endsWith(suffix))) return true;
  return ACADEMIC_PATTERN.test(domain);
}

export function isCollegeEmail(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length <= MAX_EMAIL_LENGTH &&
    SHAPE_PATTERN.test(trimmed) &&
    isCollegeDomain(emailDomain(trimmed))
  );
}

/** Human-readable list for hints: ".ac.in, .edu.in, .res.in or .edu". */
export function collegeSuffixList(conjunction = "or"): string {
  const dotted = COLLEGE_EMAIL_SUFFIXES.map((suffix) => `.${suffix}`);
  return `${dotted.slice(0, -1).join(", ")} ${conjunction} ${dotted.at(-1)}`;
}

/**
 * The inline message for the field, or null when it's acceptable. A blank
 * address is acceptable — the field is optional in this build.
 */
export function collegeEmailError(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.length > MAX_EMAIL_LENGTH) return "That address is too long.";
  if (!SHAPE_PATTERN.test(trimmed)) {
    return "Enter a valid email address, for example you@college.ac.in.";
  }

  const domain = emailDomain(trimmed);
  if (CONSUMER_DOMAINS.has(domain)) {
    return `Use your college address rather than a personal one — a ${domain} account doesn't say which campus you're on.`;
  }
  if (!isCollegeDomain(domain)) {
    return `${domain} isn't a college domain. Use the address your institute gave you, ending in ${collegeSuffixList()}.`;
  }
  return null;
}
