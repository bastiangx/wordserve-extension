import type { DefaultConfig } from "@/types";

export interface AbbreviationMatch {
  key: string;
  value: string;
}

// Returns an expansion if currentWord exactly matches a shortcut (case-sensitive by default)
export function findAbbreviation(
  currentWord: string,
  settings: Pick<DefaultConfig, "abbreviations" | "abbreviationsEnabled">
): AbbreviationMatch | null {
  if (!settings.abbreviationsEnabled) return null;
  if (!currentWord) return null;
  const map = settings.abbreviations || {};
  const val = map[currentWord];
  if (typeof val === "string" && val.length > 0) {
    return { key: currentWord, value: val };
  }
  return null;
}

// Replace the word in a given text range; returns new text and caret position.
export function applyAbbreviation(
  text: string,
  wordStart: number,
  wordEnd: number,
  expansion: string,
  addTrailingSpace = false
): { text: string; caret: number } {
  const replacement = expansion + (addTrailingSpace ? " " : "");
  const newText = text.slice(0, wordStart) + replacement + text.slice(wordEnd);
  const caret = wordStart + replacement.length;
  return { text: newText, caret };
}
