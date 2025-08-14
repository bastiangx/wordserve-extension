/**
 * Shared default values for WordServe settings
 */

import type { WordServeSettings } from "@/types";

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
  "fidelity.com", // Investment
  "schwab.com", // Investment
  "robinhood.com", // Investment
  "coinbase.com", // Cryptocurrency
  "blockchain.com", // Cryptocurrency wallet
  "binance.com", // Cryptocurrency exchange
  "kraken.com", // Cryptocurrency exchange
  "etrade.com", // Trading platform
  "ameritrade.com", // Trading platform
  "zellepay.com", // P2P payment
  "cash.app", // Square Cash App
  "transferwise.com", // Now Wise.com
  "wise.com", // Money transfer
  // emails
  "mail.google.com", // Gmail
  "outlook.live.com", // Outlook webmail
  "outlook.office365.com", // O365 Outlook
  "mail.yahoo.com", // Yahoo Mail
  "protonmail.com", // Secure email
  "tutanota.com", // Secure email
  "web.whatsapp.com", // WhatsApp web
  "web.telegram.org", // Telegram web
  "messages.google.com", // Google Messages web
  // cloud
  "drive.google.com", // Google Drive
  "onedrive.live.com", // OneDrive
  "dropbox.com",
  "box.com",
  "docs.google.com", // Google Docs, Sheets, Slides (for editing sensitive content)
  "outlook.office.com", // Office 365 apps
  // e-commerce
  "checkout.shopify.com", // Shopify checkouts
  "secure.bigcommerce.com", // BigCommerce checkouts
  "woocommerce.com/checkout/", // Common WooCommerce pattern (if applicable, but often on merchant domain)
  // healthcare
  "mychart.com", // Common patient portal
  "patientportal.com", // Generic example
  "epiccare.com", // Generic example
  // gov
  "irs.gov", // US Tax
  "usa.gov", // General US Gov
  "tax.gov", // Generic tax sites
  "uscis.gov", // Immigration
  "dmv.org", // Driver's license related
  "socialsecurity.gov", // Social Security Administration
  // password managers
  "lastpass.com",
  "1password.com",
  "bitwarden.com",
  "keepassxc.org", // Often self-hosted, but some web interfaces exist
  // misc
  "console.aws.amazon.com", // AWS Console
  "portal.azure.com", // Azure Portal
  "console.cloud.google.com", // GCP Console
  "github.com/settings/", // GitHub settings (where tokens/keys might be visible)
  "gitlab.com/profile/personal_access_tokens", // GitLab tokens
];

export const DEFAULT_DOMAIN_WHITELIST: string[] = [];

export const AUTOCOMPLETE_DEFAULTS = {
  DEFAULT_VISIBLE_ITEMS: 10,
  MAX_DIGIT_SELECTABLE: 9,
  MAX_HEIGHT: 300,
  POSITION_OFFSET: 4,
  TOOLTIP_DELAY: 500,
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
