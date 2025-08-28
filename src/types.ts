/**
 * Types and constants used throughout WordServe
 * Most of them get their values in lib/config.ts
 */

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

export interface EngineStats {
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

import type { ThemeId } from "@/lib/render/themes";
import type { KeyChord } from "@/lib/input/kbd";

export interface DefaultConfig {
  minWordLength: number;
  maxSuggestions: number;
  debounceTime: number;
  theme?: ThemeId;
  numberSelection: boolean;
  showRankingOverride: boolean;
  compactMode: boolean;
  menuBorder: boolean;
  menuBorderRadius: boolean;
  fontSize: string | number;
  fontWeight: number; // 100-900
  fontItalic?: boolean;
  fontBold?: boolean;
  /** Ordered list of preferred fonts for suggestions/PMenu (not settings UI) */
  fontFamilyList?: string[];
  /** Optional custom CSS font-family list string entered by user */
  customFontList?: string;
  debugMode?: boolean;
  abbreviationsEnabled: boolean;
  abbreviations: Record<string, string>;
  maxAbbreviationLength: number;
  abbreviationInsertMode: "immediate" | "space";
  abbreviationHintClamp: number;
  autoInsertion: boolean;
  smartBackspace: boolean;
  rankingPosition: "left" | "right";
  // Interaction toggles
  allowMouseInsert?: boolean;
  allowMouseInteractions?: boolean;
  keyBindings: {
    /** Select/commit without adding a trailing space */
    insertWithoutSpace: KeyChord[];
    /** Select/commit and add a trailing space */
    insertWithSpace: KeyChord[];
    /** Move selection up in the menu */
    navUp: KeyChord[];
    /** Move selection down in the menu */
    navDown: KeyChord[];
    /** Close the menu */
    closeMenu: KeyChord[];
    /** Open the WordServe settings page (optional) */
    openSettings: KeyChord[];
    /** Toggle WordServe globally on/off (optional) */
    toggleGlobal: KeyChord[];
  };
  accessibility: {
    boldSuffix: boolean;
    boldPrefix: boolean;
    uppercaseSuggestions: boolean;
    prefixColorIntensity: "normal" | "muted" | "faint" | "accent";
    suffixColorIntensity: "normal" | "muted" | "faint" | "accent";
    prefixColor?: string;
    suffixColor?: string;
    dyslexicFont?: boolean;
  rankingColor?: string;
    customColor?: string;
    customFontFamily?: string;
    customFontSize?: number;
  };
  domains: import("@/lib/domains").DomainSettings;
}

export const DOMAIN_BLACKLIST = [
  "paypal.com",
  "*.paypal.com",
  "checkout.stripe.com",
  "pay.google.com",
  "payments.amazon.com",
  "pay.amazon.com",
  "secure.venmo.com",
  "checkout.square.site",
  "login.live.com",
  "accounts.google.com",
  "login.microsoftonline.com",
  "id.apple.com",
  "oauth.net",
  "sso.mozilla.com",
  "accounts.amazon.com",
  "okta.com",
  "auth0.com",
  "duosecurity.com",
  // Financial
  "bankofamerica.com",
  "wellsfargo.com",
  "chase.com",
  "citibank.com",
  "fidelity.com",
  "schwab.com",
  "robinhood.com",
  "coinbase.com",
  "blockchain.com",
  "binance.com",
  "kraken.com",
  "etrade.com",
  "ameritrade.com",
  "zellepay.com",
  "cash.app",
  "transferwise.com",
  "wise.com",
  // emails
  "mail.google.com",
  "outlook.live.com",
  "outlook.office365.com",
  "mail.yahoo.com",
  "protonmail.com",
  "tutanota.com",
  "web.whatsapp.com",
  "web.telegram.org",
  "messages.google.com",
  // cloud
  "drive.google.com",
  "onedrive.live.com",
  "dropbox.com",
  "box.com",
  "docs.google.com",
  "outlook.office.com",
  // e-commerce
  "checkout.shopify.com",
  "secure.bigcommerce.com",
  "woocommerce.com/checkout/",
  // healthcare
  "mychart.com",
  "patientportal.com",
  "epiccare.com",
  // gov
  "irs.gov",
  "usa.gov",
  "tax.gov",
  "uscis.gov",
  "dmv.org",
  "socialsecurity.gov",
  // password managers
  "lastpass.com",
  "1password.com",
  "bitwarden.com",
  "keepassxc.org",
  // misc
  "console.aws.amazon.com",
  "portal.azure.com",
  "console.cloud.google.com",
  "github.com/settings/",
  "gitlab.com/profile/personal_access_tokens",
];

export const DEFAULT_DOMAIN_WHITELIST: string[] = [];

export const AUTOCOMPLETE_DEFAULTS = {
  DEFAULT_VISIBLE_ITEMS: 10,
  MAX_DIGIT_SELECTABLE: 9,
  MAX_HEIGHT: 300,
  POSITION_OFFSET: 4,
  TOOLTIP_DELAY: 700,
  MIN_WIDTH: 280,
  MAX_WIDTH: 400,
} as const;

export const ABBREVIATION_CONFIG = {
  MAX_LENGTH: 16,
  HINT_CLAMP: 12,
  SPACE_BADGE: "abbrv",
} as const;

export const DEFAULT_SETTINGS: DefaultConfig = {
  minWordLength: 3,
  maxSuggestions: 16,
  debounceTime: 5,
  theme: "dark",
  numberSelection: true,
  showRankingOverride: false,
  compactMode: false,
  menuBorder: true,
  menuBorderRadius: true,
  fontSize: 13,
  fontWeight: 400,
  fontItalic: false,
  fontBold: false,
  fontFamilyList: [
    "JetBrains Mono",
    "Atkinson Hyperlegible",
    "Monaco",
    "monospace",
  ],
  customFontList: "",
  debugMode: false,
  abbreviationsEnabled: true,
  abbreviations: {
    STR: "Star WordServe on github!!",
  },
  maxAbbreviationLength: ABBREVIATION_CONFIG.MAX_LENGTH,
  abbreviationInsertMode: "immediate",
  abbreviationHintClamp: ABBREVIATION_CONFIG.HINT_CLAMP,
  autoInsertion: false,
  smartBackspace: true,
  rankingPosition: "right",
  allowMouseInsert: true,
  allowMouseInteractions: true,
  keyBindings: {
    insertWithoutSpace: [{ key: "enter", modifiers: [] }],
    insertWithSpace: [{ key: "tab", modifiers: [] }],
    navUp: [{ key: "up", modifiers: [] }],
    navDown: [{ key: "down", modifiers: [] }],
    closeMenu: [{ key: "escape", modifiers: [] }],
    openSettings: [],
    toggleGlobal: [],
  },
  accessibility: {
    boldSuffix: false,
    boldPrefix: false,
    uppercaseSuggestions: false,
    prefixColorIntensity: "normal",
    suffixColorIntensity: "normal",
    prefixColor: undefined,
    suffixColor: undefined,
    dyslexicFont: false,
  rankingColor: undefined,
  },
  domains: {
    blacklistMode: true,
    blacklist: DOMAIN_BLACKLIST,
    whitelist: DEFAULT_DOMAIN_WHITELIST,
  },
};

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
