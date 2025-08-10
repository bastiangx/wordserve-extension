// Centralized WordServe semantic tokens referencing shadcn / Tailwind design tokens.
// Each token maps to an underlying root CSS variable (if present) with a Rose Pine fallback.
// Stored as HSL triplets (matching shadcn pattern) so usage is always: hsl(var(--ws-<token>)).

interface SemanticTokenSpec {
  ref: string;
  fallback: string;
}

const TOKENS: Record<string, SemanticTokenSpec> = {
  bg: { ref: "--popover", fallback: "248 25% 18%" }, // overlay
  bgAlt: { ref: "--card", fallback: "247 23% 15%" }, // surface
  border: { ref: "--border", fallback: "248 25% 18%" },
  text: { ref: "--foreground", fallback: "245 50% 91%" },
  textMuted: { ref: "--muted-foreground", fallback: "248 15% 61%" },
  accent: { ref: "--primary", fallback: "189 43% 73%" }, // foam
  accentFg: { ref: "--primary-foreground", fallback: "249 22% 12%" },
  danger: { ref: "--destructive", fallback: "343 76% 68%" }, // love
  dangerFg: { ref: "--destructive-foreground", fallback: "245 50% 91%" },
  scrollbar: { ref: "--border", fallback: "248 25% 18%" },
  scrollbarHover: { ref: "--muted", fallback: "249 12% 47%" },
};

export function buildWordServeScopedVars(): string {
  // Defines --ws-* tokens with fallbacks to host shadcn variables (if present) or Rose Pine values.
  // Example output: --ws-bg: var(--popover, 248 25% 18%);
  return Object.entries(TOKENS)
    .map(([k, v]) => `--ws-${k}: var(${v.ref}, ${v.fallback});`)
    .join("");
}

// Backwards compatibility for tests referencing older naming (kebab-case variables)
// Returns a string with legacy --ws-* variables in kebab-case so tests can assert presence.
export function buildThemeCSSVars(): string {
  // Map camelCase token keys to legacy kebab-case variable names expected by tests
  const legacyMap: Record<string, string> = {
    bg: "--ws-bg",
    bgAlt: "--ws-bg-alt",
    border: "--ws-border",
    text: "--ws-text",
    textMuted: "--ws-text-muted",
    accent: "--ws-accent",
    accentFg: "--ws-accent-fg",
    danger: "--ws-danger",
    scrollbar: "--ws-scrollbar",
    scrollbarHover: "--ws-scrollbar-hover",
  };
  const tokenVars = Object.entries(TOKENS)
    .map(([k, spec]) => `${legacyMap[k]}: var(${spec.ref}, ${spec.fallback});`)
    .join("");
  // Append radius var expected by tests (maps to --radius with fallback)
  const radius = `--ws-radius: var(${WS_RADIUS_VAR}, 6px);`;
  return tokenVars + radius;
}

export const WS_RADIUS_VAR = "--radius"; // reuse globally defined radius, fallback applied in CSS injection
