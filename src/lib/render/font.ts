import { browser } from "wxt/browser";

/**
 * Injects the OpenDyslexic font into the document & handles deduplication.
 */

let injected = false;
const SAFE_FONT_CHARS = /[^a-zA-Z0-9_\-\s,\"']/g;

export function initOpenDyslexic(): void {
  if (injected || typeof document === "undefined") return;
  try {
    const id = "ws-odyslexic-font";
    if (document.getElementById(id)) {
      injected = true;
      return;
    }
    const regular = (browser.runtime.getURL as any)(
      "/fonts/OpenDyslexic-Regular.woff2"
    );
    const bold = (browser.runtime.getURL as any)(
      "/fonts/OpenDyslexic-Bold.woff2"
    );
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
@font-face {
  font-family: 'OpenDyslexic';
  src: url('${regular}') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'OpenDyslexic';
  src: url('${bold}') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}`;
    document.head.appendChild(style);
    injected = true;
  } catch {
    console.warn("WordServe: Failed to inject OpenDyslexic font");
  }
}

function quoteIfNeeded(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  const alreadyQuoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));
  if (alreadyQuoted) return trimmed;
  // Wrap if it has spaces or special chars
  if (/[^a-zA-Z0-9_\-]/.test(trimmed)) {
    // Use single quotes; escape any single quotes by removing them
    const cleaned = trimmed.replace(/'/g, "");
    return "'" + cleaned + "'";
  }
  return trimmed;
}

export function sanitizeCustomFontList(input?: string): string {
  if (!input || typeof input !== "string") return "";
  // Strip dangerous characters
  let safe = input.replace(SAFE_FONT_CHARS, "");
  // Block url( and @ imports patterns defensively
  if (/url\s*\(|@/i.test(safe)) return "";
  // Split by comma, trim, dedupe empties
  const parts = safe
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return parts.map(quoteIfNeeded).join(", ");
}

export function buildFontFamilyFromConfig(settings: {
  fontFamilyList?: string[];
  customFontList?: string;
}): string {
  const allowedCatalog = new Set([
    "JetBrains Mono",
    "Atkinson Hyperlegible",
    "Monaco",
  ]);
  const selected = (settings.fontFamilyList || [])
    .filter((f) => typeof f === "string" && f.trim().length > 0)
    // Keep only allowed fonts we ship/import
    .filter((f) => allowedCatalog.has(f))
    .map(quoteIfNeeded);
  const custom = sanitizeCustomFontList(settings.customFontList);
  const fallbacks = [
    "ui-monospace",
    "SFMono-Regular",
    "Menlo",
    "Monaco",
    "Consolas",
    "Liberation Mono",
    "monospace",
    "system-ui",
    "-apple-system",
    "Segoe UI",
    "Roboto",
    "Arial",
    "sans-serif",
  ];
  const parts: string[] = [];
  if (custom) parts.push(custom);
  if (selected.length) parts.push(selected.join(", "));
  else parts.push("'JetBrains Mono'");
  parts.push(...fallbacks);
  return parts.map(quoteIfNeeded).join(", ");
}
