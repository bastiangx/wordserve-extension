import type { SensitivityResult } from "@/types";

// Heuristic weights for signals
const SIGNAL_WEIGHTS: { [key: string]: number } = {
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

export function scanPageSensitivity(): SensitivityResult {
  let score = 0;
  const reasons: string[] = [];
  // password fields
  const pw = document.querySelectorAll('input[type="password"]');
  if (pw.length > 0) {
    score += SIGNAL_WEIGHTS.passwordField;
    reasons.push(`${pw.length} password field(s)`);
  }
  // input name/type hints
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
  // form actions
  const forms = Array.from(document.forms) as HTMLFormElement[];
  for (const form of forms) {
    const action = form.action || "";
    if (FORM_ACTION_PAYMENT.test(action)) {
      score += SIGNAL_WEIGHTS.formActionPayment;
      reasons.push(`form action to payment gateway`);
      break;
    }
  }
  // iframes
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

  // Extra heuristic: if HTTPS page contains >=2 distinct credit-like fields or a password + credit field
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
