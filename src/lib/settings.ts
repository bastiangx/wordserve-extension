import type { WordServeSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";

function toNumber(value: any, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = parseInt(value, 10);
    if (!isNaN(n)) return n;
  }
  return fallback;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function toBool(value: any, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const s = value.toLowerCase().trim();
    if (s === "true") return true;
    if (s === "false") return false;
  }
  return Boolean(value) ?? fallback;
}

function coerceKeyBinding(
  obj: any,
  fallback: WordServeSettings["keyBindings"]
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

export function normalizeSettings(input: any): WordServeSettings {
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
  const ghostTextEnabled = toBool(
    merged.ghostTextEnabled,
    DEFAULT_SETTINGS.ghostTextEnabled
  );
  const menuBorder = toBool(
    merged.menuBorder,
    DEFAULT_SETTINGS.menuBorder ?? false
  );
  const menuBorderRadius = toBool(
    merged.menuBorderRadius,
    DEFAULT_SETTINGS.menuBorderRadius ?? false
  );
  const menuBlur = toBool(merged.menuBlur, DEFAULT_SETTINGS.menuBlur ?? true);

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

  const keyBindings = coerceKeyBinding(
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
    ghostTextColorIntensity: ["normal", "muted", "faint", "accent"].includes(
      merged.accessibility?.ghostTextColorIntensity
    )
      ? merged.accessibility.ghostTextColorIntensity
      : DEFAULT_SETTINGS.accessibility.ghostTextColorIntensity,
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
    ghostTextEnabled,
    menuBorder,
    menuBorderRadius,
    menuBlur,
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

export async function getSettings(): Promise<WordServeSettings> {
  try {
    const { settings } = await browser.storage.sync.get({
      settings: DEFAULT_SETTINGS,
    });
    return normalizeSettings(settings);
  } catch (error) {
    console.error("Failed to load settings:", error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: WordServeSettings): Promise<void> {
  try {
    await browser.storage.sync.set({ settings });
  } catch (error) {
    console.error("Failed to save settings:", error);
    throw error;
  }
}
