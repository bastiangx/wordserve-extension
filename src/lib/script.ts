import React from "react";
import { createRoot, Root } from "react-dom/client";
import {
  AutocompleteMenu,
  type AutocompleteSuggestion,
} from "@/components/ws-menu";
import { InputHandler } from "@/lib/input";
import type { WordServeSettings } from "@/types";
import { normalizeSettings } from "@/lib/settings";

export class ContentScriptManager {
  private inputHandler: InputHandler;
  private settings: WordServeSettings;
  private menuRoot: Root | null = null;
  private menuContainer: HTMLDivElement | null = null;
  private isMenuOpen = false;
  private currentElement: HTMLInputElement | HTMLTextAreaElement | null = null;
  private currentSuggestions: AutocompleteSuggestion[] = [];

  constructor(settings: WordServeSettings) {
    this.settings = normalizeSettings(settings);
    this.inputHandler = new InputHandler(settings, {
      onSuggestionsRequested: (
        suggestions: AutocompleteSuggestion[],
        element: HTMLInputElement | HTMLTextAreaElement
      ) => {
        this.showMenu(suggestions, element);
      },
      onMenuHide: () => {
        this.hideMenu();
      },
    });
    this.initializeMenuContainer();
    this.startObserving();
  }

  public updateSettings(newSettings: WordServeSettings): void {
    const normalized = normalizeSettings(newSettings);
    this.settings = normalized;
    this.inputHandler.updateSettings(normalized);
    this.renderMenu();
  }

  private initializeMenuContainer(): void {
    this.menuContainer = document.createElement("div");
    this.menuContainer.id = "wordserve-menu-container";
    this.menuContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 2147483647;
      pointer-events: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    `;

    // Ensure the container is added after DOM content is loaded
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        document.body.appendChild(this.menuContainer!);
      });
    } else {
      document.body.appendChild(this.menuContainer);
    }

    this.menuRoot = createRoot(this.menuContainer);
  }

  private startObserving(): void {
    // Observe existing elements
    this.scanForInputElements();

    // Observe for new elements
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.scanElementForInputs(node as Element);
            }
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Handle focus events for input elements
    document.addEventListener("focusin", this.handleFocusIn);
    document.addEventListener("focusout", this.handleFocusOut);
  }

  private scanForInputElements(): void {
    const inputs = document.querySelectorAll("input, textarea");
    inputs.forEach((element) => {
      this.setupElementListener(
        element as HTMLInputElement | HTMLTextAreaElement
      );
    });
  }

  private scanElementForInputs(element: Element): void {
    if (this.isValidInput(element)) {
      this.setupElementListener(
        element as HTMLInputElement | HTMLTextAreaElement
      );
    }

    const inputs = element.querySelectorAll("input, textarea");
    inputs.forEach((input) => {
      this.setupElementListener(
        input as HTMLInputElement | HTMLTextAreaElement
      );
    });
  }

  private isValidInput(element: Element): boolean {
    if (
      !(
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement
      )
    ) {
      return false;
    }

    // Skip password fields and other sensitive inputs
    if (element instanceof HTMLInputElement) {
      const type = element.type.toLowerCase();
      if (
        [
          "password",
          "email",
          "tel",
          "url",
          "search",
          "number",
          "date",
          "time",
          "datetime-local",
          "month",
          "week",
        ].includes(type)
      ) {
        return false;
      }
    }

    // Skip elements with autocomplete="off"
    if (element.getAttribute("autocomplete") === "off") {
      return false;
    }

    // Skip contenteditable elements (they need special handling)
    if (element.isContentEditable) {
      return false;
    }

    return true;
  }

  private setupElementListener(
    element: HTMLInputElement | HTMLTextAreaElement
  ): void {
    if (!this.isValidInput(element)) return;

    // Mark element to avoid duplicate setup
    if (element.dataset.wordserveEnabled) return;
    element.dataset.wordserveEnabled = "true";

    // Add event listeners for this specific element
    element.addEventListener("input", () => {
      if (this.currentElement === element) {
        this.updateMenu();
      }
    });
  }

  private handleFocusIn = (event: FocusEvent): void => {
    console.log("ContentScriptManager: focus in event", event.target);
    const target = event.target as Element;
    if (this.isValidInput(target)) {
      console.log("ContentScriptManager: valid input element focused");
      this.currentElement = target as HTMLInputElement | HTMLTextAreaElement;
      this.inputHandler.attachToElement(this.currentElement);
      this.updateMenu();
    }
  };

  private handleFocusOut = (): void => {
    // Delay to allow menu interactions
    setTimeout(() => {
      this.currentElement = null;
      this.inputHandler.detachFromElement();
      this.closeMenu();
    }, 200);
  };

  private updateMenu(): void {
    if (!this.currentElement) return;

    const inputState = this.inputHandler.getInputState();
    if (inputState.isActive && inputState.suggestions.length > 0) {
      this.openMenu();
    } else {
      this.closeMenu();
    }
  }

  private openMenu(): void {
    this.isMenuOpen = true;
    this.renderMenu();
  }

  private closeMenu(): void {
    this.isMenuOpen = false;
    this.renderMenu();
  }

  private renderMenu(): void {
    if (!this.menuRoot || !this.currentElement) return;

    const inputState = this.inputHandler.getInputState();

    // Create a positioned trigger element
    const triggerElement = React.createElement("div", {
      style: {
        position: "fixed",
        left: inputState.position?.x || 0,
        top: inputState.position?.y || 0,
        width: "1px",
        height: "1px",
        pointerEvents: "none",
      },
    });

    this.menuRoot.render(
      React.createElement(AutocompleteMenu, {
        isOpen: this.isMenuOpen,
        onOpenChange: (open) => {
          if (!open) {
            this.closeMenu();
          }
        },
        suggestions: this.currentSuggestions,
        onSelect: (suggestion: AutocompleteSuggestion, addSpace?: boolean) => {
          this.inputHandler.insertSuggestion(suggestion, addSpace);
          this.closeMenu();
        },
        settings: this.settings,
        children: triggerElement,
      })
    );
  }

  private showMenu(
    suggestions: AutocompleteSuggestion[],
    element: HTMLInputElement | HTMLTextAreaElement
  ): void {
    this.currentElement = element;
    this.isMenuOpen = true;
    this.currentSuggestions = suggestions;
    this.renderMenu();
  }

  private hideMenu(): void {
    this.isMenuOpen = false;
    this.currentSuggestions = [];
    this.renderMenu();
  }

  public destroy(): void {
    document.removeEventListener("focusin", this.handleFocusIn);
    document.removeEventListener("focusout", this.handleFocusOut);

    this.inputHandler.detachFromElement();

    if (this.menuContainer) {
      this.menuRoot?.unmount();
      this.menuContainer.remove();
    }
  }
}
