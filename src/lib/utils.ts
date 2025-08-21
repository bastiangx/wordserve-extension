import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function toNumber(value: any, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = parseInt(value, 10);
    if (!isNaN(n)) return n;
  }
  return fallback;
}

export function toBool(value: any, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const s = value.toLowerCase().trim();
    if (s === "true") return true;
    if (s === "false") return false;
  }
  return Boolean(value) ?? fallback;
}

// Calculate suggestion item row height based on font size and compact mode
const rowHeightCache = new Map<string, number>();
/**
 * Compute the row height in pixels for suggestion items.
 * fontSizePx: font size in pixels (12-28)
 * compact: whether compact mode is enabled
 */
export function getRowHeight(fontSizePx: number, compact: boolean): number {
  const key = `${fontSizePx}-${compact}`;
  const cached = rowHeightCache.get(key);
  if (cached !== undefined) return cached;
  // approximate line height multiplier
  const lineHeightEm = 1.2;
  const textHeight = fontSizePx * lineHeightEm;
  // vertical padding: compact = 4px each side, normal = 8px each side
  const verticalPadding = compact ? 4 * 2 : 8 * 2;
  const height = Math.ceil(textHeight + verticalPadding);
  rowHeightCache.set(key, height);
  return height;
}
