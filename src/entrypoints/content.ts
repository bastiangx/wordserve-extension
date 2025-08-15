import { getWASMInstance } from "@/lib/wasm/ws-wasm";
import type { WordServeSettings } from "@/types";
import { shouldActivateForDomain } from "@/lib/domains";
import { normalizeSettings } from "@/lib/settings";
import { ContentScriptManager } from "@/lib/handle";
import browser from "webextension-polyfill";

let contentManager: ContentScriptManager | null = null;

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    browser.runtime.onMessage.addListener(async (message: any) => {
      if (message.type === "wordserve-error") {
        return;
      }

      if (message.type === "settingsUpdated") {
        if (contentManager) {
          const newSettings = await loadSettings();
          contentManager.updateSettings(newSettings);
        }
        return;
      }

      if (message.type === "globalToggle") {
        if (message.enabled) {
          if (!contentManager) {
            await initializeWordServe();
          }
        } else {
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
      return;
    }

    const shouldActivate = shouldActivateForDomain(
      window.location.hostname,
      settings.domains
    );

    if (!shouldActivate) {
      return;
    }

    const wordserve = getWASMInstance();
    await wordserve.waitForReady();

    if (!contentManager) {
      contentManager = new ContentScriptManager();
    }
  } catch (error) {
    // Silent initialization
  }
}

async function loadSettings(): Promise<WordServeSettings> {
  try {
    const result = (await browser.storage.sync.get("wordserveSettings")) as {
      wordserveSettings?: WordServeSettings;
    };
    const stored = result.wordserveSettings ?? {};
    return normalizeSettings(stored);
  } catch (error) {
    return normalizeSettings({});
  }
}
