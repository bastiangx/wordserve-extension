import type { SensitivityResult } from "@/types";

export interface DomainSettings {
  blacklistMode: boolean; // true => treat list as block list; false => treat as allow list
  blacklist: string[]; // patterns to block (if blacklistMode) or ignored otherwise
  whitelist: string[]; // patterns to allow (if !blacklistMode)
}

// Internal compiled pattern cache to avoid recompiling on every keystroke / check
interface CompiledPattern {
  raw: string;
  regex: RegExp;
}
const patternCache: Map<string, CompiledPattern | null> = new Map();

// Normalize hostname (lowercase + trim trailing dot + punycode placeholder)
export function normalizeHostname(hostname: string): string {
  if (!hostname) return "";
  let h = hostname.trim().toLowerCase();
  if (h.endsWith(".")) h = h.slice(0, -1);
  // NOTE: If IDN / punycode handling needed, add here (e.g., use punycode.toASCII)
  return h;
}

// Very restrictive pattern rules for safety & predictability:
// 1. Either an exact domain (e.g. example.com)
// 2. Or a leading wildcard subdomain pattern of the form *.example.com
// No other '*' placements permitted. No regex meta allowed beyond dots, dashes, alphanumerics.
function sanitizePattern(pattern: string): string | null {
  if (!pattern) return null;
  let p = pattern.trim().toLowerCase();
  if (p === "*") return null; // too broad
  // Collapse accidental multiple dots
  p = p.replace(/\.{2,}/g, ".");
  // Reject illegal chars
  if (!/^[a-z0-9.*-]+$/.test(p)) return null;
  // Only allow single leading '*.' wildcard. Reject any other '*'.
  const starCount = (p.match(/\*/g) || []).length;
  if (starCount > 0) {
    if (!p.startsWith("*.") || starCount !== 1) return null;
    // After '*.' must have at least one dot separated label with alpha start
    const rest = p.slice(2);
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(rest)) return null;
  } else {
    // Exact domain must contain at least one dot
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(p)) return null;
  }
  return p;
}

function compilePattern(raw: string): CompiledPattern | null {
  if (patternCache.has(raw)) return patternCache.get(raw)!;
  const sanitized = sanitizePattern(raw);
  if (!sanitized) {
    patternCache.set(raw, null);
    return null;
  }
  let source: string;
  if (sanitized.startsWith("*.")) {
    // Match any one or more subdomain levels before the root, or the root itself? We choose: ONLY subdomains, NOT the root.
    // Example: *.example.com matches a.example.com, a.b.example.com but NOT example.com
    const root = sanitized.slice(2).replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&");
    source = `^(?:[a-z0-9-]+\.)+${root}$`;
  } else {
    const exact = sanitized.replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&");
    // Match the exact domain OR any subdomain (common expectation). Users can force only subdomains via *.
    source = `^(?:${exact}|(?:[a-z0-9-]+\.)+${exact})$`;
  }
  try {
    const regex = new RegExp(source, "i");
    const compiled = { raw, regex } as CompiledPattern;
    patternCache.set(raw, compiled);
    return compiled;
  } catch {
    patternCache.set(raw, null);
    return null;
  }
}

export function matchesDomainPattern(
  hostname: string,
  rawPattern: string
): boolean {
  const host = normalizeHostname(hostname);
  const compiled = compilePattern(rawPattern);
  if (!compiled) return false;
  return compiled.regex.test(host);
}

export function matchesDomainList(
  hostname: string,
  domainList: string[]
): boolean {
  if (!hostname || !domainList || domainList.length === 0) return false;
  const host = normalizeHostname(hostname);
  for (const raw of domainList) {
    if (matchesDomainPattern(host, raw)) return true;
  }
  return false;
}

export function isProtectedPage(hostname: string): boolean {
  const url = window.location.href.toLowerCase();
  const host = normalizeHostname(hostname);
  const protectedSchemes = [
    "chrome://",
    "moz-extension://",
    "ms-browser-extension://",
    "edge://",
    "about:",
    "file://",
    "data:",
    "javascript:",
    "chrome-search://",
    "chrome-devtools://",
    "devtools://",
    "view-source:",
  ];
  if (protectedSchemes.some((p) => url.startsWith(p))) return true;
  return /^[a-z]{32}$/.test(host) && !host.includes(".");
}

export function shouldActivateForDomain(
  hostname: string,
  settings: DomainSettings
): boolean {
  if (isProtectedPage(hostname)) return false;
  const host = normalizeHostname(hostname);
  const { blacklistMode, blacklist, whitelist } = settings;
  if (blacklistMode) {
    return !matchesDomainList(host, blacklist);
  } else {
    return matchesDomainList(host, whitelist);
  }
}

// Heuristic weights for signals
const SIGNAL_WEIGHTS: Record<string, number> = {
  passwordField: 5,
  creditField: 3,
  paymentIFrame: 5,
  billingField: 2,
  formActionPayment: 4,
};

export const CREDIT_FIELD_REGEX =
  /card|cc-number|cvc|cvv|expiry|exp-|iban|ssn|taxid|pan|mm\/?yy|mm\/?yyyy|securitycode/i;
export const BILLING_FIELD_REGEX =
  /billing|address1|address2|postal|zip|phone|city|state|country/i;
export const GOV_ID_REGEX =
  /passport|driver[- ]?license|national\s?id|gov\s?id|ssn|taxid/i;
export const EMAIL_FIELD_REGEX = /email|e-?mail|mail/i;
const PAYMENT_IFRAME_HOSTS = [
  "checkout.stripe.com",
  "pay.google.com",
  "payments.amazon.com",
  "checkout.square.site",
];
const FORM_ACTION_PAYMENT = /paypal\.com|stripe\.com|square\.com|amazon\.com/i;

/**
 * Analyze page inputs and frames to determine sensitivity score
 */
export function scanPageSensitivity(): SensitivityResult {
  let score = 0;
  const reasons: string[] = [];
  const pw = document.querySelectorAll('input[type="password"]');
  if (pw.length > 0) {
    score += SIGNAL_WEIGHTS.passwordField;
    reasons.push(`${pw.length} password field(s)`);
  }
  const inputs = Array.from(
    document.querySelectorAll("input")
  ) as HTMLInputElement[];
  let creditCount = 0;
  let billingCount = 0;
  let govCount = 0;
  let emailCount = 0;
  for (const inp of inputs) {
    const name = inp.name || inp.id || inp.getAttribute("autocomplete") || "";
    if (CREDIT_FIELD_REGEX.test(name)) creditCount++;
    if (BILLING_FIELD_REGEX.test(name)) billingCount++;
    if (GOV_ID_REGEX.test(name)) govCount++;
    if (EMAIL_FIELD_REGEX.test(name)) emailCount++;
  }
  if (creditCount > 0) {
    score += creditCount * SIGNAL_WEIGHTS.creditField;
    reasons.push(`${creditCount} credit-related field(s)`);
  }
  if (billingCount > 0) {
    if (govCount > 0) {
      score += SIGNAL_WEIGHTS.passwordField;
      reasons.push(`${govCount} government ID field(s)`);
    }
    if (emailCount > 0) {
      score += SIGNAL_WEIGHTS.creditField;
      reasons.push(`${emailCount} email field(s)`);
    }
    score += billingCount * SIGNAL_WEIGHTS.billingField;
    reasons.push(`${billingCount} billing-related field(s)`);
  }
  const forms = Array.from(document.forms) as HTMLFormElement[];
  for (const form of forms) {
    const action = form.action || "";
    if (FORM_ACTION_PAYMENT.test(action)) {
      score += SIGNAL_WEIGHTS.formActionPayment;
      reasons.push(`form action to payment gateway`);
      break;
    }
  }
  const iframes = Array.from(
    document.querySelectorAll("iframe")
  ) as HTMLIFrameElement[];
  for (const frame of iframes) {
    try {
      const src = frame.src || "";
      const host = new URL(src).hostname;
      if (PAYMENT_IFRAME_HOSTS.includes(host)) {
        score += SIGNAL_WEIGHTS.paymentIFrame;
        reasons.push(`payment iframe (${host})`);
        break;
      }
    } catch {}
  }
  if (location.protocol === "https:") {
    if (creditCount >= 2) {
      score += 2;
      reasons.push("multiple credit fields");
    }
    if (pw.length > 0 && creditCount > 0) {
      score += 2;
      reasons.push("auth + payment combo");
    }
  }
  const blocked = score >= 7;
  return { score, reasons, blocked };
}
