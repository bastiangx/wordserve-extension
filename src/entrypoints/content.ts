import { AutocompleteController } from "@/lib/render/controller";
import { shouldActivateForDomain } from "@/lib/domains";
import { normalizeConfig } from "@/lib/config";
import type { DefaultConfig } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";
import { browser } from "wxt/browser";

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    class WordServeContentScript {
      private controllers = new Map<HTMLElement, AutocompleteController>();
      private settings: DefaultConfig = DEFAULT_SETTINGS;
      private isEnabled = true;
      private observer: MutationObserver | null = null;
      private domainEnabledCache: boolean | null = null;

      constructor() {
        this.setupMessageListener();
        this.startup();
      }

      private async startup(): Promise<void> {
        await this.initializeSettings();
        this.setupStorageListener();
        this.setupDOMObserver();
        this.attachToExistingInputs();
        this.checkEngineStatus();
      }

      private async checkEngineStatus(): Promise<void> {
        try {
          const response = await browser.runtime.sendMessage({
            type: "wordserve-status",
          });
          if (!response?.ready) {
            const errorResponse = await browser.runtime.sendMessage({
              type: "wordserve-last-error",
            });
            if (errorResponse) {
              console.error("WordServe: Background error:", errorResponse);
            }
            setTimeout(() => this.checkEngineStatus(), 2000);
          } else {
            return;
          }
        } catch (error) {
          setTimeout(() => this.checkEngineStatus(), 2000);
        }
      }

      private async initializeSettings(): Promise<void> {
        try {
          let stored: any = {};
          try {
            if ((browser as any).storage?.sync?.get) {
              console.info("[WordServe] Content: settings load via storage.sync");
              stored = await (browser as any).storage.sync.get("wordserveSettings");
            } else {
              console.info("[WordServe] Content: settings load via storage.local (no sync)");
              stored = await browser.storage.local.get("wordserveSettings");
            }
          } catch (e) {
            console.info("[WordServe] Content: sync load failed, falling back to local");
            stored = await browser.storage.local.get("wordserveSettings");
          }
          const source = stored.wordserveSettings
            ? stored.wordserveSettings
            : undefined;
          if (source) {
            this.settings = normalizeConfig(source);
            this.domainEnabledCache = null;
          }
        } catch (error) {
          console.error("Failed to load settings:", error);
        }
      }

      private setupMessageListener(): void {
        browser.runtime.onMessage.addListener(
          (message, _sender, _sendResponse) => {
            switch (message.type) {
              case "settingsUpdated":
              case "wordserve-settings-updated":
                this.updateSettings(message.settings);
                break;
              case "domainSettingsChanged":
                // Backward compat: merge domain only updates
                if (message.settings) {
                  this.updateSettings({ domains: message.settings });
                }
                break;
              case "wordserve-toggle":
                this.toggle(message.enabled);
                break;
              case "wordserve-reload":
                this.reload();
                break;
            }
          }
        );
      }

      private setupStorageListener(): void {
        try {
          browser.storage.onChanged.addListener((changes, area) => {
            if (area !== "sync" && area !== "local") return;
            const changed = changes["wordserveSettings"];
            if (!changed) return;
            const next = (changed as any).newValue ?? (changed as any).oldValue;
            if (!next) return;
            this.updateSettings(next);
          });
        } catch {}
      }

      private setupDOMObserver(): void {
        this.observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            if (mutation.type === "childList") {
              mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  this.attachToInputsInElement(node as Element);
                }
              });
            }
          }
        });

        this.observer.observe(document.body, {
          childList: true,
          subtree: true,
        });
      }

      private attachToExistingInputs(): void {
        this.attachToInputsInElement(document.body);
      }

      private attachToInputsInElement(element: Element): void {
        if (!this.isEnabled) return;

        // Check if the element itself is an input
        if (this.isTargetElement(element)) {
          this.attachToInput(element as HTMLElement);
        }

        // Find all input elements within the element
        const inputs = element.querySelectorAll(
          'input[type="text"], input[type="search"], input[type="email"], input[type="url"], ' +
            'input:not([type]), textarea, [contenteditable="true"], [contenteditable=""]'
        );
        inputs.forEach((input) => {
          if (this.isTargetElement(input)) {
            this.attachToInput(input as HTMLElement);
          }
        });
      }

      private isTargetElement(element: Element): boolean {
        if (!(element instanceof HTMLElement)) return false;
        // Check domain settings first (cached)
        if (!this.isEnabledForCurrentDomain()) return false;
        const isInput =
          element.nodeName === "INPUT" || element.nodeName === "TEXTAREA";
        const isContentEditable =
          element.contentEditable === "true" ||
          element.getAttribute("contenteditable") === "true";
        if (!isInput && !isContentEditable) return false;
        // Skip elements that are too small or hidden
        const rect = element.getBoundingClientRect();
        if (rect.width < 50 || rect.height < 20) return false;
        // Skip password fields and sensitive inputs
        if (element instanceof HTMLInputElement) {
          const type = element.type.toLowerCase();
          if (
            [
              "password",
              "hidden",
              "file",
              "color",
              "range",
              "checkbox",
              "radio",
              "submit",
              "button",
              "reset",
            ].includes(type)
          ) {
            return false;
          }
        }
        const sensitiveSelectors = [
          "[data-sensitive]",
          "[data-no-autocomplete]",
          ".password",
          ".credit-card",
          ".sensitive",
          'form[action*="login"]',
          'form[action*="signin"]',
          'form[action*="password"]',
          'form[action*="payment"]',
        ];
        for (const selector of sensitiveSelectors) {
          if (element.matches(selector) || element.closest(selector)) {
            return false;
          }
        }
        return true;
      }

      private isEnabledForCurrentDomain(): boolean {
        if (this.domainEnabledCache !== null) {
          return this.domainEnabledCache;
        }
        const hostname = window.location.hostname;
        const domainSettings = this.settings.domains;
        const isEnabled = shouldActivateForDomain(hostname, domainSettings);
        this.domainEnabledCache = isEnabled;
        return isEnabled;
      }

      private attachToInput(element: HTMLElement): void {
        if (this.controllers.has(element)) return;
        try {
          const controller = new AutocompleteController({
            element,
            settings: this.settings,
            onSelectionChanged: () => {},
          });
          this.controllers.set(element, controller);
          const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
              if (mutation.type === "childList") {
                mutation.removedNodes.forEach((node) => {
                  if (
                    node === element ||
                    (node instanceof Element && node.contains(element))
                  ) {
                    this.detachFromInput(element);
                    observer.disconnect();
                  }
                });
              }
            }
          });
          observer.observe(document.body, {
            childList: true,
            subtree: true,
          });
        } catch (error) {
          console.error("Failed to attach to input:", error);
        }
      }

      private detachFromInput(element: HTMLElement): void {
        const controller = this.controllers.get(element);
        if (controller) {
          controller.destroy();
          this.controllers.delete(element);
        }
      }

      private updateSettings(newSettings: Partial<DefaultConfig>): void {
        this.settings = normalizeConfig({ ...this.settings, ...newSettings });
        this.domainEnabledCache = null;
        const allowedNow = shouldActivateForDomain(
          window.location.hostname,
          this.settings.domains
        );
        if (!allowedNow) {
          // Domain disabled: tear down all controllers immediately
          this.controllers.forEach((controller) => controller.destroy());
          this.controllers.clear();
        } else {
          // Domain enabled: ensure controllers exist and are up to date
          this.controllers.forEach((controller) => {
            controller.updateSettings(this.settings);
          });
          this.attachToExistingInputs();
        }
      }

      private toggle(enabled: boolean): void {
        this.isEnabled = enabled;
        if (enabled) {
          this.controllers.forEach((controller) => controller.enable());
          this.attachToExistingInputs();
        } else {
          this.controllers.forEach((controller) => controller.disable());
        }
      }

      private reload(): void {
        this.controllers.forEach((controller) => controller.destroy());
        this.controllers.clear();
        this.initializeSettings().then(() => {
          this.attachToExistingInputs();
        });
      }

      public destroy(): void {
        this.controllers.forEach((controller) => controller.destroy());
        this.controllers.clear();
        if (this.observer) {
          this.observer.disconnect();
          this.observer = null;
        }
      }
    }
    const wordServe = new WordServeContentScript();
    window.addEventListener("beforeunload", () => {
      wordServe.destroy();
    });
  },
});
