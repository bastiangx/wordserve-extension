export type { DomainSettings } from "@/lib/domains";

export interface RawSuggestion {
  word: string;
  frequency: number;
  rank: number;
}

export interface DisplaySuggestion {
  word: string;
  rank: number;
}

export interface WASMCompleterStats {
  totalWords: number;
  maxFrequency: number;
  [key: string]: number;
}

export interface KeyboardHandlerCallbacks {
  onNavigate: (direction: number) => void;
  onCommit: (addSpace: boolean) => void;
  onHide: () => void;
  onSelectByNumber: (index: number) => void;
}
export interface KeyboardHandlerSettings {
  numberSelection: boolean;
  smartBackspace: boolean;
}

export interface SensitivityResult {
  score: number;
  reasons: string[];
  blocked: boolean;
}

export interface WordServeSettings {
  minWordLength: number;
  maxSuggestions: number;
  debounceTime: number;
  numberSelection: boolean;
  showRankingOverride: boolean;
  compactMode: boolean;
  ghostTextEnabled: boolean;
  fontSize: string | number;
  fontWeight: string;
  debugMode?: boolean;
  abbreviationsEnabled: boolean;
  autoInsertion: boolean;
  smartBackspace: boolean;
  rankingPosition: "left" | "right";
  menuBorderRadius: boolean;
  menuBorder: boolean;
  themeMode: "adaptive" | "isolated";
  keyBindings: {
    insertWithoutSpace: {
      key: "enter" | "tab" | "space";
      modifiers: string[];
    };
    insertWithSpace: {
      key: "enter" | "tab" | "space";
      modifiers: string[];
    };
  };
  accessibility: {
    boldSuffix: boolean;
    uppercaseSuggestions: boolean;
    prefixColorIntensity: "normal" | "muted" | "faint" | "accent";
    ghostTextColorIntensity: "normal" | "muted" | "faint" | "accent";
    customColor?: string;
    customFontFamily?: string;
    customFontSize?: number;
  };
  domains: import("@/lib/domains").DomainSettings;
}

export interface InputState {
  currentWord: string;
  wordStart: number;
  wordEnd: number;
  suggestions: Array<{ word: string; rank: number }>;
  selectedIndex: number;
  isActive: boolean;
  position?: { x: number; y: number };
  currentValue: string;
  caretPosition: number;
  keyboardHandler?: any;
}
