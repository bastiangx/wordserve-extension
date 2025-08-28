import { clamp, toNumber, toBool } from "@/lib/utils";
import type { ThemeId } from "@/lib/render/themes";
import type { DefaultConfig } from "@/types";
import { parseChordString, type KeyChord, ALLOWED_KEYS, formatChords } from "@/lib/input/kbd";
import { DEFAULT_SETTINGS } from "@/types";

// coerce new chords config from string or arrays
function sanitizeChords(value: any): KeyChord[] {
  let list: KeyChord[] = [];
  if (typeof value === "string") list = parseChordString(value);
  else if (Array.isArray(value)) {
    for (const v of value) {
      if (v && typeof v === "object" && typeof v.key === "string") {
        const key = v.key.toLowerCase();
        if (!ALLOWED_KEYS.has(key)) continue;
        const mods = Array.isArray(v.modifiers)
          ? Array.from(new Set(v.modifiers.map((m: any) => String(m).toLowerCase())))
          : [];
        list.push({ key, modifiers: mods as any });
      }
    }
  }
  // dedupe within list
  const seen = new Set<string>();
  const out: KeyChord[] = [];
  for (const c of list) {
    const sig = `${(c.modifiers||[]).slice().sort().join("+")}::${c.key}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(c);
  }
  return out;
}

function coerceKBD(obj: any, fallback: DefaultConfig["keyBindings"], numberSelection: boolean) {
  const safe = (v: any, def: KeyChord[]) => {
    if (v === undefined) return def;
    const parsed = sanitizeChords(v);
    // If user explicitly cleared it, keep empty to disable that action
    return parsed;
  };
  let kb = {
    insertWithoutSpace: safe(obj?.insertWithoutSpace, fallback.insertWithoutSpace),
    insertWithSpace: safe(obj?.insertWithSpace, fallback.insertWithSpace),
    navUp: safe(obj?.navUp, fallback.navUp),
    navDown: safe(obj?.navDown, fallback.navDown),
    closeMenu: safe(obj?.closeMenu, fallback.closeMenu),
    openSettings: safe(obj?.openSettings, fallback.openSettings),
    toggleGlobal: safe(obj?.toggleGlobal, fallback.toggleGlobal),
  };
  // If number selection is enabled, disallow plain digit chords without modifiers to avoid conflicts
  if (numberSelection) {
    const filterDigits = (list: KeyChord[]) =>
      list.filter((c) => !(c.key.length === 1 && /[0-9]/.test(c.key) && (!c.modifiers || c.modifiers.length === 0)));
    kb.insertWithoutSpace = filterDigits(kb.insertWithoutSpace);
    kb.insertWithSpace = filterDigits(kb.insertWithSpace);
    kb.navUp = filterDigits(kb.navUp);
    kb.navDown = filterDigits(kb.navDown);
    kb.closeMenu = filterDigits(kb.closeMenu);
    kb.openSettings = filterDigits(kb.openSettings);
    kb.toggleGlobal = filterDigits(kb.toggleGlobal);
  }
  // Enforce no duplicate chords across actions; earlier actions win
  const order: Array<keyof DefaultConfig["keyBindings"]> = [
    "insertWithSpace",
    "insertWithoutSpace",
    "navDown",
    "navUp",
    "closeMenu",
    "openSettings",
    "toggleGlobal",
  ];
  const used = new Set<string>();
  const cleaned: any = { ...kb };
  for (const k of order) {
    const list = (cleaned[k] || []) as KeyChord[];
    const unique: KeyChord[] = [];
    for (const c of list) {
      const sig = `${(c.modifiers||[]).slice().sort().join("+")}::${c.key}`;
      if (used.has(sig)) continue;
      used.add(sig);
      unique.push(c);
    }
    // Keep empty to explicitly disable the action
    cleaned[k] = unique;
  }
  kb = cleaned;
  return kb;
}

/**
*  normalizeConfig takes an input config object (possibly partial, possibly with wrong types)
*  and returns a fully populated DefaultConfig object with all values validated and sanitized.
*/
export function normalizeConfig(input: any): DefaultConfig {
  const merged = { ...DEFAULT_SETTINGS, ...(input || {}) } as any;
  const minWordLength = clamp(
    toNumber(merged.minWordLength, DEFAULT_SETTINGS.minWordLength),
    1,
    10
  );
  const maxSuggestions = clamp(
    toNumber(merged.maxSuggestions, DEFAULT_SETTINGS.maxSuggestions),
    1,
    100
  );
  const debounceTime = clamp(
    toNumber(merged.debounceTime, DEFAULT_SETTINGS.debounceTime),
    0,
    10000
  );
  const numberSelection = toBool(
    merged.numberSelection,
    DEFAULT_SETTINGS.numberSelection
  );
  const allowedThemes: Set<ThemeId> = new Set([
    "dark",
    "light",
    "catppuccin-mocha",
    "iv-spade",
    "iceberg-dark",
    "iceberg-light",
    "nord-dark",
    "nord-light",
    "mountain",
    "dracula",
    "everblush",
    "blueberry",
    "darling",
  ]);
  const theme: ThemeId = allowedThemes.has(merged.theme)
    ? merged.theme
    : "dark";
  const showRankingOverride = toBool(
    merged.showRankingOverride,
    DEFAULT_SETTINGS.showRankingOverride
  );
  const compactMode = toBool(merged.compactMode, DEFAULT_SETTINGS.compactMode);
  const menuBorder = toBool(
    merged.menuBorder,
    DEFAULT_SETTINGS.menuBorder ?? false
  );
  const menuBorderRadius = toBool(
    merged.menuBorderRadius,
    DEFAULT_SETTINGS.menuBorderRadius ?? false
  );
  const fontSizeRaw = merged.fontSize;
  const fontSize =
    typeof fontSizeRaw === "number"
      ? clamp(fontSizeRaw, 12, 28)
      : typeof fontSizeRaw === "string" && fontSizeRaw.trim() !== ""
        ? fontSizeRaw
        : DEFAULT_SETTINGS.fontSize;
  const fontWeight =
    typeof merged.fontWeight === "string"
      ? merged.fontWeight
      : DEFAULT_SETTINGS.fontWeight;
  const allowedFonts = new Set(["JetBrains Mono", "Atkinson Hyperlegible", "Monaco"]);
  const fontFamilyList = Array.isArray(merged.fontFamilyList)
    ? merged.fontFamilyList
      .map((s: any) => (typeof s === "string" ? s : ""))
      .filter((s: string) => allowedFonts.has(s))
    : DEFAULT_SETTINGS.fontFamilyList;
  const customFontList =
    typeof merged.customFontList === "string"
      ? merged.customFontList
      : DEFAULT_SETTINGS.customFontList;
  const debugMode = toBool(
    merged.debugMode,
    DEFAULT_SETTINGS.debugMode ?? false
  );
  const abbreviationsEnabled = toBool(
    merged.abbreviationsEnabled,
    DEFAULT_SETTINGS.abbreviationsEnabled
  );
  const autoInsertion = toBool(
    merged.autoInsertion,
    DEFAULT_SETTINGS.autoInsertion
  );
  const smartBackspace = toBool(
    merged.smartBackspace,
    DEFAULT_SETTINGS.smartBackspace
  );
  const maxAbbreviationLength = clamp(
    toNumber(
      merged.maxAbbreviationLength,
      DEFAULT_SETTINGS.maxAbbreviationLength
    ),
    1,
    64
  );
  const abbreviationInsertMode =
    merged.abbreviationInsertMode === "space" ? "space" : "immediate";
  const abbreviationHintClamp = clamp(
    toNumber(
      merged.abbreviationHintClamp,
      DEFAULT_SETTINGS.abbreviationHintClamp
    ),
    8,
    200
  );
  const rankingPosition = merged.rankingPosition === "left" ? "left" : "right";
  const allowMouseInsert = toBool(
    merged.allowMouseInsert,
    DEFAULT_SETTINGS.allowMouseInsert ?? true
  );
  const allowMouseInteractions = toBool(
    merged.allowMouseInteractions,
    DEFAULT_SETTINGS.allowMouseInteractions ?? true
  );
  const keyBindings = coerceKBD(
    merged.keyBindings,
    DEFAULT_SETTINGS.keyBindings,
    numberSelection
  );
  const abbreviations: Record<string, string> = {};
  if (merged.abbreviations && typeof merged.abbreviations === "object") {
    for (const [k, v] of Object.entries(merged.abbreviations)) {
      if (typeof k === "string" && typeof v === "string") {
        abbreviations[k] = v;
      } else if (typeof k === "string") {
        abbreviations[k] = String(v);
      }
    }
  } else {
    Object.assign(abbreviations, DEFAULT_SETTINGS.abbreviations);
  }
  const accessibility = {
    boldSuffix: toBool(
      merged.accessibility?.boldSuffix,
      DEFAULT_SETTINGS.accessibility.boldSuffix
    ),
    boldPrefix: toBool(
      merged.accessibility?.boldPrefix,
      DEFAULT_SETTINGS.accessibility.boldPrefix
    ),
    uppercaseSuggestions: toBool(
      merged.accessibility?.uppercaseSuggestions,
      DEFAULT_SETTINGS.accessibility.uppercaseSuggestions
    ),
    prefixColorIntensity: ["normal", "muted", "faint", "accent"].includes(
      merged.accessibility?.prefixColorIntensity
    )
      ? merged.accessibility.prefixColorIntensity
      : DEFAULT_SETTINGS.accessibility.prefixColorIntensity,
    suffixColorIntensity: ["normal", "muted", "faint", "accent"].includes(
      merged.accessibility?.suffixColorIntensity
    )
      ? merged.accessibility.suffixColorIntensity
      : DEFAULT_SETTINGS.accessibility.suffixColorIntensity,
    prefixColor:
      typeof merged.accessibility?.prefixColor === "string"
        ? merged.accessibility.prefixColor
        : DEFAULT_SETTINGS.accessibility.prefixColor,
    suffixColor:
      typeof merged.accessibility?.suffixColor === "string"
        ? merged.accessibility.suffixColor
        : DEFAULT_SETTINGS.accessibility.suffixColor,
    dyslexicFont: toBool(
      merged.accessibility?.dyslexicFont,
      DEFAULT_SETTINGS.accessibility.dyslexicFont ?? false
    ),
    customColor:
      typeof merged.accessibility?.customColor === "string"
        ? merged.accessibility.customColor
        : DEFAULT_SETTINGS.accessibility.customColor,
    customFontFamily:
      typeof merged.accessibility?.customFontFamily === "string"
        ? merged.accessibility.customFontFamily
        : DEFAULT_SETTINGS.accessibility.customFontFamily,
    customFontSize:
      typeof merged.accessibility?.customFontSize === "number"
        ? merged.accessibility.customFontSize
        : DEFAULT_SETTINGS.accessibility.customFontSize,
  };
  const domains = merged.domains ?? DEFAULT_SETTINGS.domains;
  return {
    minWordLength,
    maxSuggestions,
    debounceTime,
    theme,
    numberSelection,
    showRankingOverride,
    compactMode,
    menuBorder,
    menuBorderRadius,
    fontSize,
    fontWeight,
    fontFamilyList,
    customFontList,
    debugMode,
    abbreviationsEnabled,
    abbreviations,
    maxAbbreviationLength,
    abbreviationInsertMode,
    abbreviationHintClamp,
    autoInsertion,
    smartBackspace,
    rankingPosition,
  allowMouseInsert,
  allowMouseInteractions,
    keyBindings,
    accessibility,
    domains,
  };
}
