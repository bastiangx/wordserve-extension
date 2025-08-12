import { getWASMInstance } from "@/lib/wasm/ws-wasm";
import type { WordServeSettings } from "@/types";
import { shouldActivateForDomain } from "@/lib/domains";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import browser from "webextension-polyfill";

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    console.log("WordServe content script loaded");

    // Set up message listener for settings updates
    browser.runtime.onMessage.addListener(async (message: any) => {
      if (message.type === "wordserve-error") {
        console.error("WordServe error:", message.message || "Unknown error");
        return;
      }

      if (message.type === "settingsUpdated") {
        console.log("Settings updated");
        return;
      }

      if (message.type === "globalToggle") {
        if (message.enabled) {
          console.log("WordServe enabled globally");
        } else {
          console.log("WordServe disabled globally");
        }
        return;
      }

      if (message.type === "domainSettingsChanged") {
        const shouldActivate = shouldActivateForDomain(
          window.location.hostname,
          message.settings
        );
        console.log(
          "Domain settings changed, should activate:",
          shouldActivate
        );
        return;
      }
    });

    try {
      const settings = await loadSettings();
      const globalSettings = await browser.storage.sync.get("globalEnabled");
      const globalEnabled = globalSettings.globalEnabled !== false;

      if (!globalEnabled) {
        console.log("WordServe globally disabled");
        return;
      }

      if (
        !shouldActivateForDomain(window.location.hostname, settings.domains)
      ) {
        console.log("WordServe not activated for this domain");
        return;
      }

      // Initialize WASM instance
      const wordserve = getWASMInstance();
      await wordserve.waitForReady();
      console.log("WordServe WASM initialized successfully");
    } catch (error) {
      console.error("WordServe initialization error:", error);
    }
  },
});

async function loadSettings(): Promise<WordServeSettings> {
  try {
    const result = (await browser.storage.sync.get("wordserveSettings")) as {
      wordserveSettings?: WordServeSettings;
    };
    const stored = result.wordserveSettings ?? {};
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch (error) {
    console.warn("Failed to load settings, using defaults:", error);
    return DEFAULT_SETTINGS;
  }
}
