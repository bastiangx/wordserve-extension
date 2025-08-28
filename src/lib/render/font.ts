const SAFE_FONT_CHARS = /[^a-zA-Z0-9_\-\s,\"']/g;

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
    "OpenDyslexic",
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
