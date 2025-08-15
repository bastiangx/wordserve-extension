import { getWASMInstance } from "@/lib/wasm/ws-wasm";
import type { WordServeSettings, DisplaySuggestion } from "@/types";
import { normalizeSettings } from "@/lib/settings";

export interface AutocompleteSuggestion extends DisplaySuggestion {
  id: string;
}

export class ContentScriptManager {
  private settings: WordServeSettings | null = null;
  private activeInputElement: HTMLInputElement | HTMLTextAreaElement | null =
    null;
  private menuElement: HTMLDivElement | null = null;
  private debounceTimer: number | null = null;
  private suggestions: AutocompleteSuggestion[] = [];

  constructor() {
    this.loadSettings();
    this.observeInputs();
  }

  private async loadSettings() {
    try {
      const userSettings = await browser.storage.sync.get("wordserve_settings");
      this.settings = normalizeSettings(userSettings.wordserve_settings || {});
    } catch (error) {
      this.settings = normalizeSettings({});
    }
  }

  private observeInputs() {
    this.setupExistingInputs();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement;
            this.setupInputsInElement(element);
          }
        }
      }
    });

    observer.observe(document, { childList: true, subtree: true });
  }

  private setupExistingInputs() {
    const inputs = document.querySelectorAll("input, textarea");
    for (const input of inputs) {
      if (
        this.isValidInput(input) &&
        !(input as HTMLElement).dataset.wordserveSetup
      ) {
        (input as HTMLElement).dataset.wordserveSetup = "true";
        this.setupInputElement(input as HTMLInputElement | HTMLTextAreaElement);
      }
    }
  }

  private setupInputsInElement(element: HTMLElement) {
    const inputs = element.querySelectorAll("input, textarea");
    for (const input of inputs) {
      if (
        this.isValidInput(input) &&
        !(input as HTMLElement).dataset.wordserveSetup
      ) {
        (input as HTMLElement).dataset.wordserveSetup = "true";
        this.setupInputElement(input as HTMLInputElement | HTMLTextAreaElement);
      }
    }
  }

  private isValidInput(element: Element): boolean {
    const input = element as HTMLInputElement | HTMLTextAreaElement;
    if (input.disabled || input.readOnly) return false;
    if (
      input instanceof HTMLInputElement &&
      input.type &&
      ["password", "email", "url", "number", "tel", "date", "time"].includes(
        input.type
      )
    ) {
      return false;
    }

    const style = getComputedStyle(input);
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      input.offsetWidth > 20 &&
      input.offsetHeight > 10
    );
  }

  private setupInputElement(input: HTMLInputElement | HTMLTextAreaElement) {
    input.addEventListener("input", () => this.handleInput(input));
    input.addEventListener("focus", () => this.handleFocus(input));
    input.addEventListener("blur", () => this.handleBlur());
    input.addEventListener("keydown", (e: Event) =>
      this.handleKeyDown(e as KeyboardEvent)
    );
  }

  private handleFocus(input: HTMLInputElement | HTMLTextAreaElement) {
    this.activeInputElement = input;
  }

  private handleBlur() {
    this.hideMenu();
    this.activeInputElement = null;
  }

  private handleInput(input: HTMLInputElement | HTMLTextAreaElement) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = (window as any).setTimeout(() => {
      this.processInput(input);
    }, 150);
  }

  private async processInput(input: HTMLInputElement | HTMLTextAreaElement) {
    const text = input.value;
    const cursorPos = input.selectionStart || 0;

    const beforeCursor = text.substring(0, cursorPos);
    const wordMatch = beforeCursor.match(/(\S+)$/);

    if (!wordMatch || wordMatch[1].length < 2) {
      this.hideMenu();
      return;
    }

    const prefix = wordMatch[1];
    const suggestions = await this.getSuggestions(prefix);

    if (suggestions.length > 0) {
      this.showMenu(input, suggestions);
    } else {
      this.hideMenu();
    }
  }

  private async getSuggestions(
    prefix: string
  ): Promise<AutocompleteSuggestion[]> {
    try {
      const wasm = getWASMInstance();
      if (!wasm) return [];

      const wasmSuggestions = await wasm.complete(prefix, 5);
      return wasmSuggestions.map((suggestion) => ({
        word: suggestion.word,
        rank: suggestion.rank,
        id: `${suggestion.word}-${suggestion.rank}`,
      }));
    } catch (error) {
      return [];
    }
  }

  private showMenu(
    input: HTMLInputElement | HTMLTextAreaElement,
    suggestions: AutocompleteSuggestion[]
  ) {
    this.suggestions = suggestions;

    if (!this.menuElement) {
      this.createMenu();
    }

    this.updateMenuContent();
    this.positionMenu(input);
    this.menuElement!.style.display = "block";
  }

  private createMenu() {
    this.menuElement = document.createElement("div");
    this.menuElement.style.cssText = `
      position: absolute;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      max-height: 200px;
      overflow-y: auto;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
    `;
    document.body.appendChild(this.menuElement);
  }

  private updateMenuContent() {
    if (!this.menuElement) return;

    this.menuElement.innerHTML = "";
    this.suggestions.forEach((suggestion, index) => {
      const item = document.createElement("div");
      item.textContent = suggestion.word;
      item.style.cssText = `
        padding: 8px 12px;
        cursor: pointer;
        border-bottom: 1px solid #eee;
        ${index === 0 ? "background-color: #f0f0f0;" : ""}
      `;

      item.addEventListener("click", () =>
        this.selectSuggestion(suggestion.word)
      );
      item.addEventListener("mouseenter", () => {
        Array.from(this.menuElement!.children).forEach((child) => {
          (child as HTMLElement).style.backgroundColor = "";
        });
        item.style.backgroundColor = "#f0f0f0";
      });

      this.menuElement!.appendChild(item);
    });
  }

  private positionMenu(input: HTMLInputElement | HTMLTextAreaElement) {
    if (!this.menuElement) return;

    const rect = input.getBoundingClientRect();
    this.menuElement.style.left = rect.left + "px";
    this.menuElement.style.top = rect.bottom + window.scrollY + "px";
    this.menuElement.style.minWidth = rect.width + "px";
  }

  private selectSuggestion(text: string) {
    if (!this.activeInputElement) return;

    const input = this.activeInputElement;
    const value = input.value;
    const cursorPos = input.selectionStart || 0;

    const beforeCursor = value.substring(0, cursorPos);
    const wordMatch = beforeCursor.match(/(\S+)$/);

    if (wordMatch) {
      const wordStart = beforeCursor.length - wordMatch[1].length;
      const newValue =
        value.substring(0, wordStart) + text + value.substring(cursorPos);

      input.value = newValue;
      input.setSelectionRange(wordStart + text.length, wordStart + text.length);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }

    this.hideMenu();
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (!this.menuElement || this.menuElement.style.display === "none") return;

    const items = Array.from(this.menuElement.children) as HTMLElement[];
    if (items.length === 0) return;

    const currentIndex = items.findIndex(
      (item) => item.style.backgroundColor === "rgb(240, 240, 240)"
    );

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        const nextIndex =
          currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        this.highlightItem(nextIndex);
        break;

      case "ArrowUp":
        e.preventDefault();
        const prevIndex =
          currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        this.highlightItem(prevIndex);
        break;

      case "Enter":
      case "Tab":
        e.preventDefault();
        const selectedIndex = currentIndex >= 0 ? currentIndex : 0;
        if (items[selectedIndex]) {
          const suggestion = this.suggestions[selectedIndex];
          this.selectSuggestion(suggestion.word);
        }
        break;

      case "Escape":
        this.hideMenu();
        break;
    }
  }

  private highlightItem(index: number) {
    if (!this.menuElement) return;

    const items = Array.from(this.menuElement.children) as HTMLElement[];
    items.forEach((item, i) => {
      item.style.backgroundColor = i === index ? "#f0f0f0" : "";
    });
  }

  private hideMenu() {
    if (this.menuElement) {
      this.menuElement.style.display = "none";
    }
  }

  public updateSettings(newSettings: WordServeSettings) {
    this.settings = normalizeSettings(newSettings);
  }

  public destroy() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.menuElement) {
      this.menuElement.remove();
      this.menuElement = null;
    }

    this.activeInputElement = null;
    this.suggestions = [];
  }
}
