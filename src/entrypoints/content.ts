import "@/globals.css";
import { getWASMInstance } from "@/lib/wasm/ws-wasm";
import { DOMManager, WordServeSettings } from "@/lib/dom";
import {
  shouldActivateForDomain,
  type DomainSettings,
} from "@/lib/domains";

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
  autoInsertionCommitMode: "enter-only",
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
      const globalSettings = await browser.storage.sync.get("globalEnabled");
      const globalEnabled = globalSettings.globalEnabled !== false; // default to true

      // Check if globally disabled
      if (!globalEnabled) {
        return;
      }

      // Check if we should activate on this domain
      if (
        !shouldActivateForDomain(window.location.hostname, settings.domains)
      ) {
        return;
      }

      // Initialize WASM proxy
      const wordserve = getWASMInstance();
      await wordserve.waitForReady();

      // Initialize DOM manager
      domManager = new DOMManager(wordserve, settings);

      // Listen for settings updates
      browser.runtime.onMessage.addListener(async (message) => {
        if (message.type === "settingsUpdated" && domManager) {
          domManager.updateSettings(message.settings);
        }

        if (message.type === "globalToggle") {
          if (message.enabled) {
            if (!domManager) {
              const settings = await loadSettings();
              if (
                shouldActivateForDomain(
                  window.location.hostname,
                  settings.domains
                )
              ) {
                const wordserve = getWASMInstance();
                await wordserve.waitForReady();
                domManager = new DOMManager(wordserve, settings);
              }
            }
          } else {
            if (domManager) {
              domManager.destroy();
              domManager = null;
            }
          }
        }

        if (message.type === "domainSettingsChanged") {
          const shouldActivate = shouldActivateForDomain(
            window.location.hostname,
            message.settings
          );

          if (shouldActivate && !domManager) {
            const settings = await loadSettings();
            settings.domains = message.settings;
            const wordserve = getWASMInstance();
            await wordserve.waitForReady();
            domManager = new DOMManager(wordserve, settings);
          } else if (!shouldActivate && domManager) {
            domManager.destroy();
            domManager = null;
          }
        }
      });
    } catch (error) {
      console.error("WordServe initialization error:", error);
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
