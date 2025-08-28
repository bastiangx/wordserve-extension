export type KeyModifier = "cmd" | "alt" | "ctrl" | "shift";

export interface KeyChord {
  key: string; // normalized token, e.g., 'enter', 'tab', 'space', 'a', '1', 'f1', 'left', 'keypad1', 'comma'
  modifiers: KeyModifier[]; // normalized, unique
}

export const ALLOWED_MODIFIERS: KeyModifier[] = [
  "cmd",
  "alt",
  "ctrl",
  "shift",
];

// Canonical key tokens accepted. Keep all lowercase.
export const ALLOWED_KEYS = new Set<string>([
  // letters
  ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i)),
  // numbers
  ...Array.from({ length: 10 }, (_, i) => String(i)),
  // keypad numbers
  ...Array.from({ length: 10 }, (_, i) => `keypad${i}`),
  // function keys
  ...Array.from({ length: 20 }, (_, i) => `f${i + 1}`),
  // arrows
  "left",
  "down",
  "up",
  "right",
  // common control
  "enter",
  "tab",
  "space",
  "escape",
  "esc",
  "backspace",
  "delete",
  "forwarddelete",
  "home",
  "end",
  "pageup",
  "pagedown",
  // specials
  "minus",
  "equal",
  "period",
  "comma",
  "slash",
  "backslash",
  "quote",
  "semicolon",
  "backtick",
  "leftsquarebracket",
  "rightsquarebracket",
  // keypad specials
  "keypadclear",
  "keypaddecimalmark",
  "keypaddivide",
  "keypadenter",
  "keypadequal",
  "keypadminus",
  "keypadmultiply",
  "keypadplus",
  // locale special
  "sectionsign",
]);

function normalizeToken(t: string): string {
  const s = t.trim().toLowerCase();
  if (s === "return") return "enter";
  if (s === "esc") return "escape";
  if (s === "del") return "forwarddelete";
  if (s === "delete") return "forwarddelete";
  if (s === "arrowup") return "up";
  if (s === "arrowdown") return "down";
  if (s === "arrowleft") return "left";
  if (s === "arrowright") return "right";
  // unify bracket names
  if (s === "[") return "leftsquarebracket";
  if (s === "]") return "rightsquarebracket";
  // unify punctuation
  if (s === ",") return "comma";
  if (s === ".") return "period";
  if (s === "-") return "minus";
  if (s === "=") return "equal";
  if (s === "/") return "slash";
  if (s === "\\") return "backslash";
  if (s === "'") return "quote";
  if (s === ";") return "semicolon";
  if (s === "`") return "backtick";
  if (s === " ") return "space";
  return s;
}

export function parseChordString(input: string): KeyChord[] {
  // comma separated list of chords
  if (!input || typeof input !== "string") return [];
  const items = input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const chords: KeyChord[] = [];
  for (const item of items) {
    const parts = item
      .split("+")
      .map((p) => normalizeToken(p))
      .filter(Boolean);
    const mods: Set<KeyModifier> = new Set();
    let key = "";
    for (const p of parts) {
      if ((ALLOWED_MODIFIERS as readonly string[]).includes(p)) {
        mods.add(p as KeyModifier);
      } else {
        if (!key) key = p;
      }
    }
    if (!key) continue;
    // Handle colon alias -> semicolon + shift
    if (key === "colon") {
      key = "semicolon";
      mods.add("shift");
    }
    // allow only canonical tokens
    if (!ALLOWED_KEYS.has(key)) continue;
    chords.push({ key, modifiers: Array.from(mods) });
  }
  return chords;
}

export function formatChords(chords: KeyChord[]): string {
  const order = new Map<KeyModifier, number>([
    ["cmd", 0],
    ["ctrl", 1],
    ["alt", 2],
    ["shift", 3],
  ]);
  const fmt = (c: KeyChord) => {
    const mods = [...new Set((c.modifiers || []).map((m) => m as KeyModifier))]
      .sort((a, b) => (order.get(a)! - order.get(b)!))
      .join("+");
    return (mods ? mods + "+" : "") + c.key;
  };
  return (chords || []).map(fmt).join(", ");
}

export function normalizeEventKey(evKey: string, evCode: string): string {
  const key = normalizeToken(evKey);
  // Numpad handling
  if (/^numpad[0-9]$/i.test(evCode)) {
    const d = evCode.slice(-1);
    return `keypad${d}`;
  }
  switch (evCode) {
    case "NumpadEnter":
      return "keypadenter";
    case "NumpadAdd":
      return "keypadplus";
    case "NumpadSubtract":
      return "keypadminus";
    case "NumpadMultiply":
      return "keypadmultiply";
    case "NumpadDivide":
      return "keypaddivide";
    case "NumpadDecimal":
      return "keypaddecimalmark";
    case "NumpadEqual":
      return "keypadequal";
    case "NumpadClear":
      return "keypadclear";
  }
  if (/^f([1-9]|1[0-9]|20)$/i.test(evKey)) {
    return evKey.toLowerCase();
  }
  if (key.length === 1) {
    // letter or digit
    return key.toLowerCase();
  }
  return key;
}

export function eventMatchesAny(
  ev: Pick<KeyboardEvent, "key" | "code" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey">,
  chords: KeyChord[]
): boolean {
  if (!chords || chords.length === 0) return false;
  const key = normalizeEventKey(ev.key, ev.code);
  for (const c of chords) {
    if (c.key !== key) continue;
    const req = new Set((c.modifiers || []).map((m) => m.toLowerCase()));
    const wantCtrl = req.has("ctrl");
    const wantCmd = req.has("cmd");
    const wantAlt = req.has("alt");
    const wantShift = req.has("shift");
    if (ev.ctrlKey !== wantCtrl) continue;
    if (ev.metaKey !== wantCmd) continue;
    if (ev.altKey !== wantAlt) continue;
    if (ev.shiftKey !== wantShift) continue;
    return true;
  }
  return false;
}
