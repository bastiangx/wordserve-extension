import { clamp, toNumber, toBool } from "@/lib/utils";
import type { ThemeId } from "@/lib/render/themes";
import type { DefaultConfig } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";

function coerceKBD(obj: any, fallback: DefaultConfig["keyBindings"]) {
  if (!obj || typeof obj !== "object") return fallback;
  const allowedKeys = ["enter", "tab", "space"] as const;
  const makeBinding = (b: any, def: any) => {
    if (!b || typeof b !== "object") return def;
    const key =
      typeof b.key === "string" &&
      (allowedKeys as readonly string[]).includes(b.key)
        ? b.key
        : def.key;
    const modifiers = Array.isArray(b.modifiers)
      ? b.modifiers.map(String)
      : def.modifiers;
    return { key, modifiers };
  };
  return {
    insertWithoutSpace: makeBinding(
      obj.insertWithoutSpace,
      fallback.insertWithoutSpace
    ),
    insertWithSpace: makeBinding(obj.insertWithSpace, fallback.insertWithSpace),
  };
}

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
    "iv-space",
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
  const allowedFonts = new Set(["Geist Mono", "Atkinson Hyperlegible", "Monaco"]);
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
  const keyBindings = coerceKBD(
    merged.keyBindings,
    DEFAULT_SETTINGS.keyBindings
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
    keyBindings,
    accessibility,
    domains,
  };
}
