import { clamp, toNumber, toBool } from "@/lib/utils";
import type { DefaultConfig } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";

function coerceKBD(
  obj: any,
  fallback: DefaultConfig["keyBindings"]
) {
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
      ? clamp(fontSizeRaw, 8, 72)
      : typeof fontSizeRaw === "string" && fontSizeRaw.trim() !== ""
      ? fontSizeRaw
      : DEFAULT_SETTINGS.fontSize;

  const fontWeight =
    typeof merged.fontWeight === "string"
      ? merged.fontWeight
      : DEFAULT_SETTINGS.fontWeight;
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
  const rankingPosition = merged.rankingPosition === "left" ? "left" : "right";
  const themeMode = merged.themeMode === "adaptive" ? "adaptive" : "isolated";
  const keyBindings = coerceKBD(
    merged.keyBindings,
    DEFAULT_SETTINGS.keyBindings
  );
  const accessibility = {
    boldSuffix: toBool(
      merged.accessibility?.boldSuffix,
      DEFAULT_SETTINGS.accessibility.boldSuffix
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
    numberSelection,
    showRankingOverride,
    compactMode,
    menuBorder,
    menuBorderRadius,
    fontSize,
    fontWeight,
    debugMode,
    abbreviationsEnabled,
    autoInsertion,
    smartBackspace,
    rankingPosition,
    themeMode,
    keyBindings,
    accessibility,
    domains,
  };
}
