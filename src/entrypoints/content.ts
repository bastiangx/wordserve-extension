// IMPORTANT: Do NOT import global Tailwind / shadcn stylesheet here.
// Tailwind preflight + utility classes globally injected into arbitrary pages
// were breaking host site layouts (images resized, elements shifting).
// The content script now relies solely on scoped inline styles injected
// by DOMManager (ws-* prefixed classes) to avoid CSS collisions.
import { getWASMInstance } from "@/lib/wasm/ws-wasm";
import { DOMManager } from "@/lib/dom";
import type { SensitivityResult, WordServeSettings } from "@/types";
import { scanPageSensitivity, shouldActivateForDomain } from "@/lib/domains";
import { DEFAULT_SETTINGS, } from "@/lib/defaults";
import browser from "webextension-polyfill";

// UI override pill for sensitivity blocks
function ensureAlertStack(): HTMLElement {
  let stack = document.querySelector(".ws-alert-stack") as HTMLElement | null;
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "ws-alert-stack";
    document.body.appendChild(stack);
  }
  return stack;
}

function pushAlert(
  title: string,
  desc?: string,
  variant: "default" | "error" = "default",
  timeout = 6000
) {
  const stack = ensureAlertStack();
  const el = document.createElement("div");
  el.className = "ws-alert" + (variant === "error" ? " ws-error" : "");
  el.innerHTML = `<div class="ws-alert-title">${title}</div>${desc ? `<div class="ws-alert-desc">${desc}</div>` : ""
    }`;
  stack.prepend(el);
  if (timeout > 0) setTimeout(() => el.remove(), timeout);
  return el;
}

function showOverrideUI(sensitivity: SensitivityResult) {
  const existing = document.querySelector(".ws-override-pill");
  if (existing) existing.remove();
  const pill = document.createElement("div");
  pill.className = "ws-override-pill";
  const msg = `WordServe disabled: ${sensitivity.reasons.join(", ")}`;
  pill.innerHTML = `
    <div class="text-[13px] leading-snug">${msg}</div>
    <div class="ws-override-pill-buttons">
      <button class="ws-btn" data-once>Enable once</button>
      <button class="ws-btn ws-btn-primary" data-always>Always allow domain</button>
    </div>
  `;
  document.body.appendChild(pill);
  pill.querySelector("[data-once]")?.addEventListener("click", async () => {
    const settings = await loadSettings();
    const wordserve = getWASMInstance();
    await wordserve.waitForReady();
    domManager = new DOMManager(wordserve, settings);
    pill.remove();
    pushAlert("Enabled for this session");
  });
  pill.querySelector("[data-always]")?.addEventListener("click", async () => {
    await browser.runtime.sendMessage({
      type: "domain-override",
      mode: "allowAlways",
      host: window.location.hostname,
    });
    const settings = await loadSettings();
    const wordserve = getWASMInstance();
    await wordserve.waitForReady();
    domManager = new DOMManager(wordserve, settings);
    pill.remove();
    pushAlert("Domain added to whitelist");
  });
}

let domManager: DOMManager | null = null;

export default defineContentScript({
  matches: ["<all_urls>"],
  async main() {
    console.log("WordServe content script loaded");

    // Set up single message listener for all message types
    browser.runtime.onMessage.addListener(async (message: any) => {
      if (message.type === "wordserve-error") {
        pushAlert(
          "WordServe error",
          message.message || "Unknown error",
          "error",
          8000
        );
        return;
      }

      if (message.type === "settingsUpdated" && domManager) {
        domManager.updateSettings(message.settings);
        return;
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
        return;
      }

      if (message.type === "domainSettingsChanged") {
        const shouldActivate = shouldActivateForDomain(
          window.location.hostname,
          message.settings
        );

        if (shouldActivate && !domManager) {
          const settings = await loadSettings();
          const wordserve = getWASMInstance();
          await wordserve.waitForReady();
          domManager = new DOMManager(wordserve, settings);
        } else if (!shouldActivate && domManager) {
          domManager.destroy();
          domManager = null;
        }
        return;
      }
    });

    try {
      const settings = await loadSettings();
      const globalSettings = await browser.storage.sync.get("globalEnabled");
      const globalEnabled = globalSettings.globalEnabled !== false;

      if (!globalEnabled) {
        return;
      }

      const sensitivity = scanPageSensitivity();
      if (sensitivity.blocked) {
        console.warn(
          "WordServe auto-blocked due to sensitive content:",
          sensitivity.reasons
        );
        showOverrideUI(sensitivity);
        return;
      }
      if (
        !shouldActivateForDomain(window.location.hostname, settings.domains)
      ) {
        return;
      }
      const wordserve = getWASMInstance();
      await wordserve.waitForReady();
      domManager = new DOMManager(wordserve, settings);
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
