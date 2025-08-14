import { getWASMInstance } from "@/lib/wasm/ws-wasm";
import type { WordServeSettings } from "@/types";
import { shouldActivateForDomain } from "@/lib/domains";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { ContentScriptManager } from "@/lib/content-script-manager";
import browser from "webextension-polyfill";

let contentManager: ContentScriptManager | null = null;

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
        if (contentManager) {
          const newSettings = await loadSettings();
          contentManager.updateSettings(newSettings);
        }
        return;
      }

      if (message.type === "globalToggle") {
        if (message.enabled) {
          console.log("WordServe enabled globally");
          if (!contentManager) {
            await initializeWordServe();
          }
        } else {
          console.log("WordServe disabled globally");
          if (contentManager) {
            contentManager.destroy();
            contentManager = null;
          }
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
        
        if (shouldActivate && !contentManager) {
          await initializeWordServe();
        } else if (!shouldActivate && contentManager) {
          contentManager.destroy();
          contentManager = null;
        }
        return;
      }
    });

    await initializeWordServe();
  },
});

async function initializeWordServe(): Promise<void> {
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

    // Initialize content manager
    if (!contentManager) {
      contentManager = new ContentScriptManager(settings);
      console.log("WordServe content manager initialized");
    }
  } catch (error) {
    console.error("WordServe initialization error:", error);
  }
}

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
