/**
 * Shared default values for WordServe settings
 */

import type { WordServeSettings } from "@/types";

// Minimal curated high-risk payment / financial endpoints; no broad wildcards
export const DOMAIN_BLACKLIST = [
  'paypal.com',
  '*.paypal.com',
  'checkout.stripe.com',
  'pay.google.com',
  'payments.amazon.com',
  'pay.amazon.com',
  'secure.venmo.com',
  'checkout.square.site',
  'login.live.com',
  'accounts.google.com',
];

export const DEFAULT_DOMAIN_WHITELIST: string[] = [];

export const DEFAULT_SETTINGS: WordServeSettings = {
  minWordLength: 3,
  maxSuggestions: 64,
  debounceTime: 100,
  numberSelection: true,
  showRankingOverride: false,
  compactMode: false,
  ghostTextEnabled: true,
  fontSize: 14,
  fontWeight: "normal",
  debugMode: false,
  abbreviationsEnabled: true,
  autoInsertion: true,
  autoInsertionCommitMode: "space-commits",
  smartBackspace: true,
  rankingPosition: "right",
  menuBorderRadius: true,
  menuBorder: true,
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
