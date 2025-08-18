import { AutocompleteController } from "@/lib/controller";
import { DEFAULT_SETTINGS } from "@/types";
import { normalizeSettings } from "@/lib/settings";
import type { WordServeSettings } from "@/types";
import { browser } from "wxt/browser";
import { GhostTextManager } from "@/lib/ghost-text";

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    console.log("WordServe content script loaded");

    class WordServeContentScript {
      private controllers = new Map<HTMLElement, AutocompleteController>();
      private ghostManagers = new Map<HTMLElement, GhostTextManager>();
      private settings: WordServeSettings = DEFAULT_SETTINGS;
      private isEnabled = true;
      private observer: MutationObserver | null = null;
      private domainEnabledCache: boolean | null = null;

      constructor() {
        this.initializeSettings();
        this.setupMessageListener();
        this.setupDOMObserver();
        this.attachToExistingInputs();
        this.checkWASMStatus();
      }

      private async checkWASMStatus(): Promise<void> {
        try {
          const response = await browser.runtime.sendMessage({
            type: "wordserve-status",
          });
          console.log("WordServe: WASM status check:", response);

          if (!response?.ready) {
            // Also check for any error messages
            const errorResponse = await browser.runtime.sendMessage({
              type: "wordserve-last-error",
            });
            if (errorResponse) {
              console.error("WordServe: Background error:", errorResponse);
            }

            console.log(
              "WordServe: WASM not ready, will check again in 2 seconds"
            );
            setTimeout(() => this.checkWASMStatus(), 2000);
          } else {
            console.log("WordServe: WASM is ready!");
          }
        } catch (error) {
          console.error("WordServe: Failed to check WASM status:", error);
          setTimeout(() => this.checkWASMStatus(), 2000);
        }
      }

      private async initializeSettings(): Promise<void> {
        try {
          const stored = await browser.storage.sync.get("wordserveSettings");
          if (stored.wordserveSettings) {
            this.settings = normalizeSettings(stored.wordserveSettings);
          }
          console.log("WordServe: Loaded settings:", this.settings);
        } catch (error) {
          console.error("Failed to load settings:", error);
        }
      }

      private setupMessageListener(): void {
        browser.runtime.onMessage.addListener(
          (message, sender, sendResponse) => {
            switch (message.type) {
              case "settingsUpdated":
              case "wordserve-settings-updated":
                this.updateSettings(message.settings);
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

        // Only target specific input elements, not contenteditable divs
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

        // Skip elements in sensitive contexts
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

        console.log("WordServe: Checking domain enablement for:", hostname);

        if (domainSettings.blacklistMode) {
          // Blacklist mode: check if domain is blocked
          for (const pattern of domainSettings.blacklist) {
            if (this.matchesDomainPattern(hostname, pattern)) {
              console.log("WordServe: Domain blocked by pattern:", pattern);
              this.domainEnabledCache = false;
              return false;
            }
          }
          console.log("WordServe: Domain not blocked, enabled");
          this.domainEnabledCache = true;
          return true; // Not blocked, so enabled
        } else {
          // Whitelist mode: check if domain is allowed
          if (domainSettings.whitelist.length > 0) {
            const allowed = domainSettings.whitelist.some((pattern) =>
              this.matchesDomainPattern(hostname, pattern)
            );
            console.log("WordServe: Whitelist mode, allowed:", allowed);
            this.domainEnabledCache = allowed;
            return allowed;
          }
          console.log(
            "WordServe: Whitelist mode with empty whitelist, disabled"
          );
          this.domainEnabledCache = false;
          return false; // No whitelist entries, so disabled
        }
      }

      private matchesDomainPattern(hostname: string, pattern: string): boolean {
        // Simple wildcard matching
        const regexPattern = pattern.replace(/\./g, "\\.").replace(/\*/g, ".*");

        const regex = new RegExp(`^${regexPattern}$`, "i");
        return regex.test(hostname);
      }

      private attachToInput(element: HTMLElement): void {
        if (this.controllers.has(element)) return;
        console.log(
          "WordServe: Attaching to element:",
          element.tagName,
          element instanceof HTMLInputElement ? element.type : "N/A"
        );
        try {
          const controller = new AutocompleteController({
            element,
            settings: this.settings,
            onSelectionMade: (word, originalWord) => {
              this.logSelection(word, originalWord);
            },
          });
          this.controllers.set(element, controller);
          this.attachGhostText(element);
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
          console.error("Failed to attach autocomplete to element:", error);
        }
      }

      private detachFromInput(element: HTMLElement): void {
        const controller = this.controllers.get(element);
        if (controller) {
          controller.destroy();
          this.controllers.delete(element);
        }
        this.detachGhostText(element);
      }

      private attachGhostText(element: HTMLElement): void {
        if (
          this.ghostManagers.has(element) ||
          !this.shouldAttachGhostText(element)
        ) {
          console.log("WordServe: Skipping ghost text attachment for element:", element.tagName, 
                     "Already has ghost text:", this.ghostManagers.has(element),
                     "Suitable:", this.shouldAttachGhostText(element));
          return;
        }
        
        console.log("WordServe: Attaching ghost text to element:", element.tagName);
        
        try {
          // Get the corresponding autocomplete controller
          const controller = this.controllers.get(element);
          if (!controller) {
            console.warn("WordServe: No controller found for ghost text element");
            return;
          }

          const ghostManager = new GhostTextManager(element, {
            getSuggestion: async (text: string, signal: AbortSignal) => {
              // Instead of making API calls, get the current suggestion from the controller
              return this.getCurrentSuggestionFromController(element);
            },
            debounceMs: 50, // Much faster response
            acceptKey: "Tab",
            rejectKey: "Escape",
          });
          
          this.ghostManagers.set(element, ghostManager);
          console.log("WordServe: Successfully attached ghost text to element");
        } catch (error) {
          console.warn("Failed to attach ghost text to element:", error);
        }
      }

      private detachGhostText(element: HTMLElement): void {
        const ghostManager = this.ghostManagers.get(element);
        if (ghostManager) {
          ghostManager.destroy();
          this.ghostManagers.delete(element);
        }
      }

      private shouldAttachGhostText(element: HTMLElement): boolean {
        if ((element as HTMLInputElement).type === "password") return false;
        const rect = element.getBoundingClientRect();
        if (rect.width < 50 || rect.height < 20) return false;
        const skipContainers = [
          ".CodeMirror",
          ".monaco-editor",
          ".ace_editor",
          "[data-slate-editor]",
          ".prosemirror-editor",
        ];

        for (const selector of skipContainers) {
          if (element.closest(selector)) return false;
        }
        return true;
      }

      private getCurrentSuggestionFromController(element: HTMLElement): string | null {
        const controller = this.controllers.get(element);
        if (!controller) {
          return null;
        }

        // Only show ghost text when the menu is visible
        if (!controller.isMenuVisible()) {
          return null;
        }

        // Get the current suggestions from the controller
        const suggestions = controller.getCurrentSuggestions();
        if (!suggestions || suggestions.length === 0) {
          return null;
        }

        // Get the selected/first suggestion
        const selectedIndex = controller.getSelectedIndex() || 0;
        const suggestion = suggestions[selectedIndex];
        
        if (!suggestion) {
          return null;
        }

        // Return just the completion part (remove the prefix that was already typed)
        const currentWord = controller.getCurrentWord();
        if (suggestion.word.startsWith(currentWord)) {
          const completion = suggestion.word.substring(currentWord.length);
          console.log("WordServe: Ghost text showing completion:", `"${completion}"`, "for word:", `"${currentWord}"`);
          return completion;
        }

        return null;
      }

      private async getSuggestionForGhostText(
        text: string,
        signal: AbortSignal
      ): Promise<string | null> {
        if (!this.isEnabled || !text.trim()) return null;

        try {
          // Use the same API as the main controller
          const response = await browser.runtime.sendMessage({
            type: "wordserve-complete",
            prefix: text.trim(),
            limit: 1,
          });

          if (signal.aborted) return null;

          if (response?.suggestions && response.suggestions.length > 0) {
            // Return the first suggestion word
            return response.suggestions[0].word;
          }
        } catch (error) {
          if (!signal.aborted) {
            console.warn("Ghost text suggestion error:", error);
          }
        }

        return null;
      }

      private updateSettings(newSettings: Partial<WordServeSettings>): void {
        this.settings = normalizeSettings({ ...this.settings, ...newSettings });
        this.domainEnabledCache = null;
        console.log("WordServe: Updated settings:", this.settings);
        this.controllers.forEach((controller) => {
          controller.updateSettings(this.settings);
        });
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
        // Destroy all existing controllers and ghost managers
        this.controllers.forEach((controller) => controller.destroy());
        this.controllers.clear();

        this.ghostManagers.forEach((manager) => manager.destroy());
        this.ghostManagers.clear();

        // Reload settings and reattach
        this.initializeSettings().then(() => {
          this.attachToExistingInputs();
        });
      }

      private logSelection(word: string, originalWord: string): void {
        if (this.settings.debugMode) {
          console.log(
            `WordServe: Selected "${word}" to replace "${originalWord}"`
          );
        }
      }

      public destroy(): void {
        // Cleanup all controllers
        this.controllers.forEach((controller) => controller.destroy());
        this.controllers.clear();

        // Disconnect observer
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
