import "@/globals.css";
import { getWASMInstance } from "@/lib/wordserve-wasm-proxy";
import { DOMManager, WordServeSettings } from "@/lib/dom-manager";

const DEFAULT_SETTINGS: WordServeSettings = {
  minWordLength: 3,
  maxSuggestions: 64,
  debounceTime: 100,
  numberSelection: true,
  showRankingOverride: false,
  compactMode: false,
  ghostTextEnabled: true,
  fontSize: "editor",
  fontWeight: "normal",
  debugMode: false,
  abbreviationsEnabled: true,
  autoInsertion: true,
  autoInsertionCommitMode: "space-commits",
  smartBackspace: true,
  accessibility: {
    boldSuffix: false,
    uppercaseSuggestions: false,
    prefixColorIntensity: "normal",
    ghostTextColorIntensity: "muted",
  },
  domains: {
    blacklistMode: true,
    blacklist: [
      "*.paypal.com",
      "*.stripe.com",
      "*.checkout.com",
      "*.square.com",
      "*.braintreepayments.com",
      "*.authorize.net",
      "*.payment.*",
      "*checkout*",
      "*payment*",
      "*billing*",
      "*.bank.*",
      "*banking*",
      "online.chase.com",
      "www.wellsfargo.com",
      "www.bankofamerica.com",
      "secure.*",
      "login.*",
      "auth.*",
      "*signin*",
      "*signup*",
    ],
    whitelist: [],
  },
};

let domManager: DOMManager | null = null;

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    console.log("WordServe content script loaded");

    try {
      // Load settings from storage
      const settings = await loadSettings();

      // Check if we should activate on this domain
      if (!shouldActivateForDomain(window.location.hostname, settings)) {
        return;
      }

      // Show loading indicator
      showIndicator("WordServe Loading...", "#f59e0b");

      // Initialize WASM proxy
      const wordserve = getWASMInstance();
      await wordserve.waitForReady();

      // Initialize DOM manager
      domManager = new DOMManager(wordserve, settings);

      // Show ready indicator
      showIndicator("WordServe Active", "#10b981");

      // Listen for settings updates
      browser.runtime.onMessage.addListener((message) => {
        if (message.type === "settingsUpdated" && domManager) {
          domManager.updateSettings(message.settings);
        }
      });
    } catch (error) {
      console.error("WordServe initialization error:", error);
      showIndicator("WordServe Error", "#ef4444");
    }
  },
});

async function loadSettings(): Promise<WordServeSettings> {
  try {
    const result = await browser.storage.sync.get("wordserveSettings");
    return { ...DEFAULT_SETTINGS, ...result.wordserveSettings };
  } catch (error) {
    console.warn("Failed to load settings, using defaults:", error);
    return DEFAULT_SETTINGS;
  }
}

function shouldActivateForDomain(
  hostname: string,
  settings: WordServeSettings
): boolean {
  const { blacklistMode, blacklist, whitelist } = settings.domains;

  if (blacklistMode) {
    return !matchesDomainList(hostname, blacklist);
  } else {
    return matchesDomainList(hostname, whitelist);
  }
}

function matchesDomainList(hostname: string, domainList: string[]): boolean {
  return domainList.some((pattern) => {
    const regexPattern = pattern
      .replace(/\./g, "\\.")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");

    const regex = new RegExp(`^${regexPattern}$`, "i");
    return (
      regex.test(hostname) || hostname.includes(pattern.replace(/\*/g, ""))
    );
  });
}

function showIndicator(text: string, color: string) {
  // Remove existing indicator
  const existing = document.getElementById("wordserve-indicator");
  if (existing) {
    existing.remove();
  }

  const indicator = document.createElement("div");
  indicator.id = "wordserve-indicator";
  indicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 999999;
    background: ${color};
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-family: "Space Mono", monospace;
    font-size: 12px;
    font-weight: 500;
    opacity: 0.9;
    pointer-events: none;
    transition: opacity 0.3s ease;
  `;
  indicator.textContent = text;

  document.body.appendChild(indicator);

  // Remove after 3 seconds
  setTimeout(() => {
    indicator.style.opacity = "0";
    setTimeout(() => indicator.remove(), 300);
  }, 3000);
}
