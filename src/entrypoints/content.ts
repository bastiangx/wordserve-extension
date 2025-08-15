import { AutocompleteMenu } from "@/components/autocomplete-menu-fluenttyper";
import { getSettings } from "@/lib/settings";
import { shouldActivateForDomain } from "@/lib/domains";
import type { WordServeSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";

export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    let currentSettings: WordServeSettings = DEFAULT_SETTINGS;
    const activeMenus = new Map<HTMLElement, AutocompleteMenu>();

    async function loadSettings() {
      try {
        const settings = await getSettings();
        currentSettings = settings;
      } catch (error) {
        console.error("[WordServe] Failed to load settings:", error);
        currentSettings = DEFAULT_SETTINGS;
      }
    }

    function initializeAutocomplete() {
      const elements = findTextInputElements();

      elements.forEach((element) => {
        if (!activeMenus.has(element) && shouldEnableForElement(element)) {
          attachAutocomplete(element);
        }
      });
    }

    function findTextInputElements(): HTMLElement[] {
      const selectors = [
        'input[type="text"]',
        'input[type="search"]',
        'input[type="email"]',
        'input[type="url"]',
        "input:not([type])",
        "textarea",
        '[contenteditable="true"]',
        '[contenteditable=""]',
      ];

      const elements: HTMLElement[] = [];
      selectors.forEach((selector) => {
        const found = document.querySelectorAll(selector);
        found.forEach((el) => {
          if (el instanceof HTMLElement) {
            elements.push(el);
          }
        });
      });

      return elements;
    }

    function shouldEnableForElement(element: HTMLElement): boolean {
      // Skip if element has data attributes indicating it should be ignored
      if (element.dataset.wordserveDisabled === "true") {
        return false;
      }

      // Skip if parent has disabled wordserve
      let parent = element.parentElement;
      while (parent) {
        if (parent.dataset.wordserveDisabled === "true") {
          return false;
        }
        parent = parent.parentElement;
      }

      // Check domain settings
      const hostname = window.location.hostname;
      return shouldActivateForDomain(hostname, currentSettings.domains);
    }

    function attachAutocomplete(element: HTMLElement) {
      try {
        const menu = new AutocompleteMenu({
          element,
          settings: currentSettings,
        });
        activeMenus.set(element, menu);
      } catch (error) {
        console.error("[WordServe] Failed to attach autocomplete:", error);
      }
    }

    function updateAllMenus() {
      // Remove menus for elements that should no longer have autocomplete
      for (const [element, menu] of activeMenus) {
        if (!shouldEnableForElement(element)) {
          menu.destroy();
          activeMenus.delete(element);
        } else {
          // Update existing menu with new settings
          menu.updateSettings(currentSettings);
        }
      }

      // Add menus for elements that should now have autocomplete
      const elements = findTextInputElements();
      elements.forEach((element) => {
        if (!activeMenus.has(element) && shouldEnableForElement(element)) {
          attachAutocomplete(element);
        }
      });
    }

    function observeNewElements() {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === "childList") {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as HTMLElement;

                // Check if the added element or any of its descendants are text inputs
                const inputs = [
                  element,
                  ...element.querySelectorAll(
                    'input[type="text"], input[type="search"], input[type="email"], input[type="url"], input:not([type]), textarea, [contenteditable="true"], [contenteditable=""]'
                  ),
                ];

                inputs.forEach((input) => {
                  if (
                    input instanceof HTMLElement &&
                    !activeMenus.has(input) &&
                    shouldEnableForElement(input)
                  ) {
                    attachAutocomplete(input);
                  }
                });
              }
            });

            // Clean up menus for removed elements
            mutation.removedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as HTMLElement;
                if (activeMenus.has(element)) {
                  activeMenus.get(element)?.destroy();
                  activeMenus.delete(element);
                }

                // Also check descendants
                activeMenus.forEach((menu, el) => {
                  if (!document.contains(el)) {
                    menu.destroy();
                    activeMenus.delete(el);
                  }
                });
              }
            });
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      return observer;
    }

    // Initialize everything
    loadSettings().then(() => {
      initializeAutocomplete();
      const observer = observeNewElements();

      // Settings change listener
      browser.storage.onChanged.addListener((changes) => {
        if (changes.settings) {
          currentSettings = changes.settings.newValue || DEFAULT_SETTINGS;
          updateAllMenus();
        }
      });

      // Handle focus events for better UX
      document.addEventListener("focus", (event) => {
        const target = event.target as HTMLElement;
        if (activeMenus.has(target)) {
          activeMenus.get(target)?.setEnabled(true);
        }
      });

      document.addEventListener("blur", (event) => {
        const target = event.target as HTMLElement;
        if (activeMenus.has(target)) {
          activeMenus.get(target)?.setEnabled(false);
        }
      });

      console.log(`[WordServe] Content script initialized with ${activeMenus.size} autocomplete instances`);
    });

    console.log("[WordServe] Content script loading...");
  },
});
