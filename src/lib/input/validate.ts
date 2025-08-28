import type { KeyChord, KeyModifier } from "@/lib/input/kbd";
import type { DefaultConfig } from "@/types";

export type IssueLevel = "error" | "warn";
export interface BindingIssue {
  action: keyof DefaultConfig["keyBindings"];
  chord: KeyChord;
  level: IssueLevel;
  reason: string;
}

export interface Environment {
  platform: "mac" | "win" | "linux" | "other";
  browser: "chromium" | "firefox" | "other";
}

const has = (c: KeyChord, m: KeyModifier) => !!c.modifiers?.includes(m);

const isDigit = (k: string) => /^(?:[0-9]|keypad[0-9])$/.test(k);

function describe(c: KeyChord): string {
  const mods = (c.modifiers || []).slice();
  const niceMods = mods
    .map((m) => (m === "cmd" ? "cmd" : m))
    .sort()
    .join("+");
  return `${niceMods ? niceMods + "+" : ""}${c.key}`;
}

function isBrowserReserved(
  c: KeyChord,
  env: Environment
): { level: IssueLevel; reason: string } | null {
  const k = c.key;
  const mac = env.platform === "mac";
  const ctrl = has(c, "ctrl");
  const alt = has(c, "alt");
  const cmd = has(c, "cmd");
  const shift = has(c, "shift");

  // DevTools & View Source & Reload & Navigation
  if (
    // DevTools
    (env.browser !== "firefox" &&
      ((ctrl && shift && (k === "i" || k === "j" || k === "c")) ||
        k === "f12")) ||
    (mac && alt && cmd && (k === "i" || k === "j" || k === "c")) ||
    // Reload
    k === "f5" ||
    (ctrl && (k === "r" || (shift && k === "r"))) ||
    (mac && cmd && (k === "r" || (shift && k === "r"))) ||
    // Back/Forward
    (!mac && alt && (k === "left" || k === "right")) ||
    (mac && cmd && (k === "leftSquareBracket" || k === "rightSquareBracket"))
  ) {
    return { level: "error", reason: "Browser navigation/DevTools/Reload" };
  }

  // Tab/Window management
  if (
    (ctrl && (k === "w" || k === "t" || k === "n" || (shift && k === "n"))) ||
    (mac &&
      cmd &&
      (k === "w" || k === "t" || k === "n" || (shift && k === "n")))
  ) {
    return { level: "error", reason: "Browser tab/window shortcuts" };
  }

  // Location bar
  if ((ctrl && k === "l") || (mac && cmd && k === "l")) {
    return { level: "error", reason: "Address bar focus" };
  }

  // Tab switching by number
  if ((ctrl && isDigit(k)) || (mac && cmd && isDigit(k))) {
    return { level: "error", reason: "Tab switching by number" };
  }

  // Ctrl/Cmd+Tab cycling
  if ((ctrl && k === "tab") || (ctrl && shift && k === "tab")) {
    return { level: "error", reason: "Tab cycling" };
  }

  // Printing/Save/Open/Downloads/History/Bookmarks: warn (commonly used)
  if (
    (ctrl &&
      (k === "p" ||
        k === "s" ||
        k === "o" ||
        (shift && k === "delete") ||
        k === "j" ||
        k === "h" ||
        k === "d" ||
        k === "u")) ||
    (mac &&
      cmd &&
      (k === "p" ||
        k === "s" ||
        k === "o" ||
        k === "j" ||
        k === "h" ||
        k === "d" ||
        k === "u"))
  ) {
    return {
      level: "warn",
      reason: "May be intercepted by browser (print/save/etc.)",
    };
  }

  // macOS Preferences
  if (mac && cmd && k === "comma") {
    return { level: "warn", reason: "macOS/Browser preferences" };
  }

  return null;
}

export function validateKeyBindings(
  kb: DefaultConfig["keyBindings"],
  env: Environment
): BindingIssue[] {
  const issues: BindingIssue[] = [];
  const actions = Object.keys(kb) as Array<keyof DefaultConfig["keyBindings"]>;
  for (const action of actions) {
    for (const chord of kb[action] || []) {
      const res = isBrowserReserved(chord, env);
      if (res) {
        issues.push({ action, chord, level: res.level, reason: res.reason });
      }
    }
  }
  return issues;
}

export function detectEnvironment(): Environment {
  const ua = navigator.userAgent || "";
  const platform = /Mac/i.test(ua)
    ? "mac"
    : /Win/i.test(ua)
    ? "win"
    : /Linux/i.test(ua)
    ? "linux"
    : "other";
  const browser = /Firefox/i.test(ua)
    ? "firefox"
    : /Chrome|Edg|Brave|Chromium/i.test(ua)
    ? "chromium"
    : "other";
  return { platform, browser } as Environment;
}

export function formatIssue(i: BindingIssue): string {
  return `${i.action}: ${describe(i.chord)} — ${i.reason}`;
}

// Detect duplicate chords used across multiple actions.
// Returns a list of entries where the same chord appears in 2+ actions.
export function findDuplicateKeybinds(kb: DefaultConfig["keyBindings"]): Array<{
  chord: KeyChord;
  actions: Array<keyof DefaultConfig["keyBindings"]>;
}> {
  const sig = (c: KeyChord) =>
    `${(c.modifiers || []).slice().sort().join("+")}::${c.key}`;
  const map = new Map<
    string,
    { chord: KeyChord; actions: Array<keyof DefaultConfig["keyBindings"]> }
  >();
  const actions = Object.keys(kb) as Array<keyof DefaultConfig["keyBindings"]>;
  for (const action of actions) {
    for (const chord of kb[action] || []) {
      const s = sig(chord);
      const entry = map.get(s);
      if (entry) {
        if (!entry.actions.includes(action)) entry.actions.push(action);
      } else {
        map.set(s, { chord, actions: [action] });
      }
    }
  }
  return Array.from(map.values()).filter((e) => e.actions.length > 1);
}
