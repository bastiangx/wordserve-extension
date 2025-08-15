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
  menuBorder: boolean;
  menuBorderRadius: boolean;
  fontSize: string | number;
  fontWeight: string;
  debugMode?: boolean;
  abbreviationsEnabled: boolean;
  autoInsertion: boolean;
  smartBackspace: boolean;
  rankingPosition: "left" | "right";
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

export const DEFAULT_SETTINGS: WordServeSettings = {
  minWordLength: 3,
  maxSuggestions: 32,
  debounceTime: 10,
  numberSelection: true,
  showRankingOverride: false,
  compactMode: false,
  ghostTextEnabled: true,
  menuBorder: true,
  menuBorderRadius: true,
  fontSize: 16,
  fontWeight: "normal",
  debugMode: false,
  abbreviationsEnabled: false,
  autoInsertion: false,
  smartBackspace: true,
  rankingPosition: "right",
  themeMode: "isolated",
  keyBindings: {
    insertWithoutSpace: {
      key: "enter",
      modifiers: [],
    },
    insertWithSpace: {
      key: "tab",
      modifiers: [],
    },
  },
  accessibility: {
    boldSuffix: false,
    uppercaseSuggestions: false,
    prefixColorIntensity: "normal",
    ghostTextColorIntensity: "muted",
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
