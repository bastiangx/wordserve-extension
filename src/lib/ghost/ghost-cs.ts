/**
 * Content script integration for ghost text functionality
 * Automatically enables ghost text on detected input fields
 */

import { GhostTextManager, GhostTextOptions } from "./ghost";

interface WordserveAPI {
  getSuggestion: (text: string, signal: AbortSignal) => Promise<string | null>;
}

class GhostTextContentScript {
  private managers: Map<HTMLElement, GhostTextManager> = new Map();
  private observer: MutationObserver;
  private wordserveAPI: WordserveAPI;

  constructor(api: WordserveAPI) {
    this.wordserveAPI = api;
    this.observer = new MutationObserver(this.handleMutations.bind(this));
    this.init();
  }

  private init(): void {
    // Process existing elements
    this.processExistingElements();

    // Start observing for new elements
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["contenteditable"],
    });

    // Cleanup on page unload
    window.addEventListener("beforeunload", () => {
      this.destroy();
    });
  }

  private processExistingElements(): void {
    const elements = this.findInputElements();
    elements.forEach((element) => this.attachGhostText(element));
  }

  private findInputElements(): HTMLElement[] {
    const selectors = [
      'input[type="text"]',
      'input[type="search"]',
      'input[type="email"]',
      'input[type="url"]',
      "input:not([type])", // inputs without type default to text
      "textarea",
      '[contenteditable="true"]',
      '[contenteditable=""]', // empty contenteditable is also true
    ];

    const elements: HTMLElement[] = [];

    selectors.forEach((selector) => {
      document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        if (this.shouldAttachGhostText(element)) {
          elements.push(element);
        }
      });
    });

    return elements;
  }

  private shouldAttachGhostText(element: HTMLElement): boolean {
    // Skip if already has ghost text
    if (this.managers.has(element)) return false;

    // Skip if element is hidden or disabled
    if (element.offsetParent === null) return false;
    if ((element as HTMLInputElement).disabled) return false;

    // Skip password fields
    if ((element as HTMLInputElement).type === "password") return false;

    // Skip elements that are too small (likely not for text input)
    const rect = element.getBoundingClientRect();
    if (rect.width < 50 || rect.height < 20) return false;

    // Skip elements inside certain containers (code editors, etc.)
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

  private attachGhostText(element: HTMLElement): void {
    if (this.managers.has(element)) return;

    const options: GhostTextOptions = {
      getSuggestion: this.wordserveAPI.getSuggestion,
      debounceMs: 300,
      acceptKey: "Tab",
      rejectKey: "Escape",
    };

    try {
      const manager = new GhostTextManager(element, options);
      this.managers.set(element, manager);
    } catch (error) {
      console.warn("Failed to attach ghost text to element:", error);
    }
  }

  private detachGhostText(element: HTMLElement): void {
    const manager = this.managers.get(element);
    if (manager) {
      manager.destroy();
      this.managers.delete(element);
    }
  }

  private handleMutations(mutations: MutationRecord[]): void {
    for (const mutation of mutations) {
      // Handle added nodes
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;

            // Check if the element itself is an input
            if (this.shouldAttachGhostText(element)) {
              this.attachGhostText(element);
            }

            // Check for input elements within the added node
            const inputElements = this.findInputElementsIn(element);
            inputElements.forEach((input) => this.attachGhostText(input));
          }
        });
      }

      // Handle removed nodes
      if (mutation.type === "childList") {
        mutation.removedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;

            // Clean up if the element itself had ghost text
            this.detachGhostText(element);

            // Clean up any input elements within the removed node
            this.managers.forEach((manager, managedElement) => {
              if (!document.contains(managedElement)) {
                this.detachGhostText(managedElement);
              }
            });
          }
        });
      }

      // Handle attribute changes (contenteditable)
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "contenteditable"
      ) {
        const element = mutation.target as HTMLElement;
        if (element.isContentEditable && this.shouldAttachGhostText(element)) {
          this.attachGhostText(element);
        } else {
          this.detachGhostText(element);
        }
      }
    }
  }

  private findInputElementsIn(container: HTMLElement): HTMLElement[] {
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
      container.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        if (this.shouldAttachGhostText(element)) {
          elements.push(element);
        }
      });
    });

    return elements;
  }

  public destroy(): void {
    this.observer.disconnect();
    this.managers.forEach((manager) => manager.destroy());
    this.managers.clear();
  }
}

// Initialize when DOM is ready
function initGhostText() {
  // Mock API - replace with actual Wordserve API integration
  const mockAPI: WordserveAPI = {
    getSuggestion: async (
      text: string,
      signal: AbortSignal
    ): Promise<string | null> => {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (signal.aborted) return null;

      // Mock suggestions based on input
      const suggestions: Record<string, string> = {
        hello: "world",
        how: "are you",
        what: "is your name",
        the: "quick brown fox",
        javascript: "is awesome",
        typescript: "is better",
      };

      const lastWord = text.split(/\s+/).pop()?.toLowerCase();
      return lastWord && suggestions[lastWord] ? suggestions[lastWord] : null;
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      new GhostTextContentScript(mockAPI);
    });
  } else {
    new GhostTextContentScript(mockAPI);
  }
}
initGhostText();
