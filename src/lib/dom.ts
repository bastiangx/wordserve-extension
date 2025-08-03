import {
  WordServeWASMProxy,
  type Suggestion as WASMSuggestion,
  type WASMCompleterStats,
} from "./wasm/ws-wasm";
import {
  ReactSuggestionMenuRenderer,
  type Suggestion,
} from "@/components/wordserve";
import { 
  KeyboardHandler,
  type KeyboardHandlerCallbacks,
  type KeyboardHandlerSettings 
} from "./kbd";
import { shouldActivateForDomain, type DomainSettings } from "./domains";

interface WordServeEngine {
  waitForReady(): Promise<void>;
  complete(prefix: string, limit?: number): Promise<WASMSuggestion[]>;
  getStats(): Promise<WASMCompleterStats>;
  readonly ready: boolean;
}

export interface WordServeSettings {
  minWordLength: number;
  maxSuggestions: number;
  debounceTime: number;
  numberSelection: boolean;
  showRankingOverride: boolean;
  compactMode: boolean;
  ghostTextEnabled: boolean;
  fontSize: string;
  fontWeight: string;
  debugMode: boolean;
  abbreviationsEnabled: boolean;
  autoInsertion: boolean;
  autoInsertionCommitMode: "space-commits" | "enter-only";
  smartBackspace: boolean;
  accessibility: {
    boldSuffix: boolean;
    uppercaseSuggestions: boolean;
    prefixColorIntensity: "normal" | "muted" | "faint" | "accent";
    ghostTextColorIntensity: "normal" | "muted" | "faint" | "accent";
    customColor?: string;
    customFontFamily?: string;
    customFontSize?: number;
  };
  domains: DomainSettings;
}

export interface InputState {
  currentWord: string;
  wordStart: number;
  wordEnd: number;
  suggestions: Array<{ word: string; rank: number }>;
  selectedIndex: number;
  isActive: boolean;
  position?: { x: number; y: number }; // Store initial position to prevent shifting
  currentValue: string;
  caretPosition: number;
  keyboardHandler?: KeyboardHandler;
}

export class DOMManager {
  private wordserve: WordServeEngine;
  private settings: WordServeSettings;
  private inputStates = new Map<HTMLElement, InputState>();
  private suggestionMenu: HTMLElement | null = null;
  private menuRenderer: ReactSuggestionMenuRenderer | null = null;
  private debounceTimers = new Map<HTMLElement, number>();
  private observers: MutationObserver[] = [];

  constructor(wordserve: WordServeEngine, settings: WordServeSettings) {
    this.wordserve = wordserve;
    this.settings = settings;

    if (shouldActivateForDomain(window.location.hostname, this.settings.domains)) {
      this.init();
    }
  }

  private init() {
    this.setupMutationObserver();
    this.attachToExistingInputs();
    this.createGlobalStyles();
  }

  private createGlobalStyles() {
    const style = document.createElement("style");
    style.id = "ws-styles";
    style.textContent = `
      /* Rose Pine theme colors for WordServe suggestion menu */
      .ws-suggestion-menu {
        position: fixed;
        background: #191724;
        border: 1px solid #26233a;
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2);
        z-index: 999999;
        max-height: 300px;
        overflow-y: auto;
        min-width: 200px;
        max-width: 400px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: ${this.getFontSize()}px;
        font-weight: ${this.settings.fontWeight};
        backdrop-filter: blur(8px);
        animation: ws-fade-in 0.15s ease-out;
      }
      
      @keyframes ws-fade-in {
        from {
          opacity: 0;
          transform: scale(0.95) translateY(-4px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
      
      .ws-suggestion-menu.compact {
        font-size: ${this.getFontSize() * 0.9}px;
      }
      
      .ws-suggestion-item {
        padding: ${this.settings.compactMode ? "6px 12px" : "8px 12px"};
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        transition: background-color 0.1s ease;
        color: #e0def4;
        border-radius: 4px;
        margin: 2px 4px;
      }
      
      .ws-suggestion-item:hover {
        background: #1f1d2e;
      }
      
      .ws-suggestion-item.selected {
        background: #31748f;
        color: #e0def4;
      }
      
      .ws-suggestion-word {
        flex: 1;
        display: flex;
        align-items: center;
      }
      
      .ws-suggestion-prefix {
        color: #908caa;
        font-weight: 500;
        ${this.settings.accessibility.boldSuffix ? "font-weight: bold;" : ""}
      }
      
      .ws-suggestion-suffix {
        color: #e0def4;
        ${this.settings.accessibility.boldSuffix ? "font-weight: bold;" : ""}
        ${
          this.settings.accessibility.uppercaseSuggestions
            ? "text-transform: uppercase;"
            : ""
        }
      }
      
      .ws-suggestion-meta {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-left: 8px;
      }
      
      .ws-suggestion-number,
      .ws-suggestion-rank {
        font-size: 0.75rem;
        color: #6e6a86;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
      }
      
      .ws-suggestion-item.selected .ws-suggestion-number,
      .ws-suggestion-item.selected .ws-suggestion-rank {
        color: #e0def4;
        opacity: 0.8;
      }
      
      .ws-suggestion-menu::-webkit-scrollbar {
        width: 6px;
      }
      
      .ws-suggestion-menu::-webkit-scrollbar-track {
        background: transparent;
      }
      
      .ws-suggestion-menu::-webkit-scrollbar-thumb {
        background: #26233a;
        border-radius: 3px;
      }
      
      .ws-suggestion-menu::-webkit-scrollbar-thumb:hover {
        background: #403d52;
      }
    `;

    if (this.settings.accessibility.customColor) {
      style.textContent += `
        .ws-suggestion-item.selected {
          background: ${this.settings.accessibility.customColor} !important;
        }
      `;
    }

    if (this.settings.accessibility.customFontFamily) {
      style.textContent += `
        .ws-suggestion-menu {
          font-family: ${this.settings.accessibility.customFontFamily};
        }
      `;
    }

    document.head.appendChild(style);
  }

  private getFontSize(): number {
    if (this.settings.accessibility.customFontSize) {
      return this.settings.accessibility.customFontSize;
    }

    const sizeMap = {
      smallest: 10,
      smaller: 12,
      small: 13,
      editor: 14,
      "ui-small": 13,
      "ui-medium": 14,
      "ui-larger": 16,
    };

    return sizeMap[this.settings.fontSize as keyof typeof sizeMap] || 14;
  }

  private getColorIntensity(intensity: string): string {
    const colorMap = {
      normal: "rgba(107, 114, 128, 1)",
      muted: "rgba(107, 114, 128, 0.7)",
      faint: "rgba(107, 114, 128, 0.4)",
      accent: "rgba(59, 130, 246, 0.8)",
    };

    return colorMap[intensity as keyof typeof colorMap] || colorMap.normal;
  }

  private setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.attachToInputsInElement(node as Element);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    this.observers.push(observer);
  }

  private attachToExistingInputs() {
    this.attachToInputsInElement(document.documentElement);
  }

  private attachToInputsInElement(element: Element) {
    const inputs = element.querySelectorAll(
      'input[type="text"], input[type="search"], input[type="email"], input[type="url"], textarea, [contenteditable="true"]'
    );

    inputs.forEach((input) => {
      if (!this.inputStates.has(input as HTMLElement)) {
        this.attachToInput(input as HTMLElement);
      }
    });
  }

  private attachToInput(element: HTMLElement) {
    if (!this.shouldActivateForInput(element)) {
      return;
    }

    const inputState: InputState = {
      currentValue: this.getInputValue(element),
      caretPosition: 0,
      currentWord: "",
      wordStart: 0,
      wordEnd: 0,
      suggestions: [],
      selectedIndex: 0,
      isActive: false,
    };

    // Create keyboard handler callbacks
    const keyboardCallbacks: KeyboardHandlerCallbacks = {
      onNavigate: (direction: number) => this.navigateSuggestions(element, direction),
      onCommit: (addSpace: boolean) => this.commitSuggestion(element, addSpace),
      onHide: () => this.hideSuggestions(element),
      onSelectByNumber: (index: number) => this.selectSuggestion(element, index),
    };

    // Create keyboard handler settings from our settings
    const keyboardSettings: KeyboardHandlerSettings = {
      numberSelection: this.settings.numberSelection,
      autoInsertionCommitMode: this.settings.autoInsertionCommitMode,
      smartBackspace: this.settings.smartBackspace,
    };

    // Create keyboard handler
    inputState.keyboardHandler = new KeyboardHandler(
      element,
      inputState,
      keyboardCallbacks,
      keyboardSettings
    );

    this.inputStates.set(element, inputState);

    // Event listeners (keyboard handler manages menu navigation, but we need backspace)
    element.addEventListener("input", this.handleInput.bind(this, element));
    element.addEventListener("keydown", this.handleGlobalKeys.bind(this, element));
    element.addEventListener("focus", this.handleFocus.bind(this, element));
    element.addEventListener("blur", this.handleBlur.bind(this, element));
    element.addEventListener("click", this.handleClick.bind(this, element));
  }

  private shouldActivateForInput(element: HTMLElement): boolean {
    // Check if element is password field
    if (
      element.tagName === "INPUT" &&
      (element as HTMLInputElement).type === "password"
    ) {
      return false;
    }

    // Check for data attributes that indicate sensitive fields
    const sensitiveAttributes = [
      "password",
      "cc-number",
      "cc-exp",
      "cc-csc",
      "cc-name",
    ];
    for (const attr of sensitiveAttributes) {
      if (
        element.getAttribute("autocomplete")?.includes(attr) ||
        element.getAttribute("data-stripe") ||
        element.getAttribute("data-payment")
      ) {
        return false;
      }
    }

    return true;
  }

  private handleInput(element: HTMLElement, event: Event) {
    const inputState = this.inputStates.get(element);
    if (!inputState) return;

    inputState.currentValue = this.getInputValue(element);
    inputState.caretPosition = this.getCaretPosition(element);

    this.updateCurrentWord(inputState);
    this.debounceSearch(element);
  }

  private handleGlobalKeys(element: HTMLElement, event: KeyboardEvent) {
    const inputState = this.inputStates.get(element);
    if (!inputState) return;

    // Only handle keys that the keyboard handler doesn't manage
    // or keys that need to work even when menu isn't active
    switch (event.key) {
      case "Backspace":
        if (this.settings.smartBackspace) {
          this.handleSmartBackspace(element, event);
        }
        break;
      // Let keyboard handler manage all other keys when menu is active
    }
  }

  private handleFocus(element: HTMLElement, event: FocusEvent) {
    const inputState = this.inputStates.get(element);
    if (!inputState) return;

    inputState.caretPosition = this.getCaretPosition(element);
    this.updateCurrentWord(inputState);
  }

  private handleBlur(element: HTMLElement, event: FocusEvent) {
    // Delay hiding to allow for suggestion clicks
    setTimeout(() => {
      this.hideSuggestions(element);
    }, 150);
  }

  private handleClick(element: HTMLElement, event: MouseEvent) {
    const inputState = this.inputStates.get(element);
    if (!inputState) return;

    inputState.caretPosition = this.getCaretPosition(element);
    this.updateCurrentWord(inputState);
  }

  private debounceSearch(element: HTMLElement) {
    const existingTimer = this.debounceTimers.get(element);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = window.setTimeout(() => {
      this.performSearch(element);
    }, this.settings.debounceTime);

    this.debounceTimers.set(element, timer);
  }

  private async performSearch(element: HTMLElement) {
    const inputState = this.inputStates.get(element);
    if (
      !inputState ||
      inputState.currentWord.length < this.settings.minWordLength
    ) {
      this.hideSuggestions(element);
      return;
    }

    try {
      const result = await this.wordserve.complete(
        inputState.currentWord,
        this.settings.maxSuggestions
      );

      if (result.length > 0) {
        inputState.suggestions = result.map((s: any, i: number) => ({
          word: s.word,
          rank: s.rank || i + 1,
        }));
        inputState.selectedIndex = 0;
        inputState.isActive = true;

        this.showSuggestions(element);
      } else {
        this.hideSuggestions(element);
      }
    } catch (error) {
      if (this.settings.debugMode) {
        console.error("WordServe search error:", error);
      }
      this.hideSuggestions(element);
    }
  }

  private showSuggestions(element: HTMLElement) {
    const inputState = this.inputStates.get(element);
    if (!inputState) return;

    // Only hide old-style menu, not React menu to avoid flicker
    if (this.suggestionMenu) {
      this.suggestionMenu.remove();
      this.suggestionMenu = null;
    }

    // Initialize React menu renderer if not exists
    if (!this.menuRenderer) {
      this.menuRenderer = new ReactSuggestionMenuRenderer();
    }

    // Convert suggestions to the format expected by the React component
    const suggestions: Suggestion[] = inputState.suggestions.map((s) => ({
      word: s.word,
      rank: s.rank,
    }));

    const position = this.calculateMenuPosition(element, inputState);

    this.menuRenderer.render({
      suggestions,
      selectedIndex: inputState.selectedIndex,
      currentWord: inputState.currentWord,
      position,
      onSelect: (index: number) => {
        this.selectSuggestion(element, index);
      },
      onClose: () => {
        this.hideSuggestions(element);
      },
      showRanking: this.settings.showRankingOverride,
      showNumbers: this.settings.numberSelection,
      compactMode: this.settings.compactMode,
    });
  }

  private calculateMenuPosition(
    element: HTMLElement,
    inputState: InputState
  ): { x: number; y: number } {
    // If position is already stored, reuse it to prevent shifting during navigation
    if (inputState.position) {
      return inputState.position;
    }

    const isContentEditable =
      element.isContentEditable || element.tagName === "DIV";

    let position: { x: number; y: number };
    if (isContentEditable) {
      position = this.getContentEditableCaretPosition(element);
    } else {
      position = this.getInputCaretPosition(element, inputState.caretPosition);
    }

    // Store the position to prevent shifting during navigation
    inputState.position = position;
    return position;
  }

  private getInputCaretPosition(
    element: HTMLElement,
    caretPosition: number
  ): { x: number; y: number } {
    const input = element as HTMLInputElement;
    const rect = element.getBoundingClientRect();

    // Create a temporary element to measure text width
    const tempDiv = document.createElement("div");
    tempDiv.style.cssText = `
      position: fixed;
      visibility: hidden;
      white-space: pre;
      font: ${window.getComputedStyle(input).font};
      padding: ${window.getComputedStyle(input).padding};
      border: ${window.getComputedStyle(input).border};
    `;

    const textBeforeCaret = input.value.substring(0, caretPosition);
    tempDiv.textContent = textBeforeCaret;
    document.body.appendChild(tempDiv);

    const textWidth = tempDiv.getBoundingClientRect().width;
    document.body.removeChild(tempDiv);

    const scrollLeft = input.scrollLeft || 0;
    const x = rect.left + textWidth - scrollLeft;
    const y = rect.bottom + window.scrollY;

    return this.adjustPositionForViewport({ x, y });
  }

  private getContentEditableCaretPosition(element: HTMLElement): {
    x: number;
    y: number;
  } {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      const rect = element.getBoundingClientRect();
      return this.adjustPositionForViewport({
        x: rect.left,
        y: rect.bottom + window.scrollY,
      });
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const x = rect.left;
    const y = rect.bottom + window.scrollY;

    return this.adjustPositionForViewport({ x, y });
  }

  private adjustPositionForViewport(position: { x: number; y: number }): {
    x: number;
    y: number;
  } {
    const menuWidth = 300; // estimated menu width
    const menuHeight = 200; // estimated menu height
    const padding = 10;

    let { x, y } = position;

    // Adjust horizontal position if menu would go off screen
    const availableSpaceRight = window.innerWidth - x;
    if (availableSpaceRight < menuWidth + padding) {
      x = Math.max(padding, window.innerWidth - menuWidth - padding);
    }

    // Adjust vertical position if menu would go off screen
    const availableSpaceBottom = window.innerHeight - (y - window.scrollY);
    if (availableSpaceBottom < menuHeight + padding) {
      // Try to place above the caret
      y = position.y - menuHeight - 10;

      // If still not enough space, clamp to viewport
      if (y < window.scrollY + padding) {
        y = window.scrollY + padding;
      }
    }

    return { x: Math.max(padding, x), y };
  }

  private hideSuggestions(element: HTMLElement) {
    const inputState = this.inputStates.get(element);
    if (inputState) {
      inputState.isActive = false;
      // Clear stored position so it gets recalculated next time
      inputState.position = undefined;
    }

    // Hide React menu
    if (this.menuRenderer) {
      this.menuRenderer.hide();
    }

    // Fallback: remove old-style menu if it exists
    if (this.suggestionMenu) {
      this.suggestionMenu.remove();
      this.suggestionMenu = null;
    }
  }

  private navigateSuggestions(element: HTMLElement, direction: number) {
    const inputState = this.inputStates.get(element);
    if (!inputState || !inputState.isActive) return;

    const newIndex = inputState.selectedIndex + direction;
    if (newIndex >= 0 && newIndex < inputState.suggestions.length) {
      inputState.selectedIndex = newIndex;
      this.updateSuggestionSelection(element);
    }
  }

  private updateSuggestionSelection(element: HTMLElement) {
    const inputState = this.inputStates.get(element);
    if (!inputState || !this.menuRenderer) return;

    // Update React menu selection
    const suggestions: Suggestion[] = inputState.suggestions.map((s) => ({
      word: s.word,
      rank: s.rank,
    }));

    // Use stored position to prevent shifting during navigation
    const position = this.calculateMenuPosition(element, inputState);

    this.menuRenderer.updateSelection(
      inputState.selectedIndex,
      suggestions,
      inputState.currentWord,
      position,
      (index: number) => {
        this.selectSuggestion(element, index);
      },
      () => {
        this.hideSuggestions(element);
      },
      {
        showRanking: this.settings.showRankingOverride,
        showNumbers: this.settings.numberSelection,
        compactMode: this.settings.compactMode,
      }
    );

    // Fallback: update old-style menu if it exists
    if (this.suggestionMenu) {
      const items = this.suggestionMenu.querySelectorAll(
        ".ws-suggestion-item"
      );
      items.forEach((item, index) => {
        item.classList.toggle("selected", index === inputState.selectedIndex);
      });
    }
  }

  private getSelectedIndex(): number {
    for (const [element, state] of this.inputStates) {
      if (state.isActive) {
        return state.selectedIndex;
      }
    }
    return 0;
  }

  private selectSuggestion(element: HTMLElement, index: number) {
    const inputState = this.inputStates.get(element);
    if (!inputState) return;

    inputState.selectedIndex = index;
    this.commitSuggestion(element, true);
  }

  private commitSuggestion(element: HTMLElement, addSpace: boolean) {
    const inputState = this.inputStates.get(element);
    if (
      !inputState ||
      !inputState.isActive ||
      inputState.suggestions.length === 0
    )
      return;

    const suggestion = inputState.suggestions[inputState.selectedIndex];
    const newValue =
      inputState.currentValue.substring(0, inputState.wordStart) +
      suggestion.word +
      (addSpace ? " " : "") +
      inputState.currentValue.substring(inputState.wordEnd);

    this.setInputValue(element, newValue);

    const newCaretPosition =
      inputState.wordStart + suggestion.word.length + (addSpace ? 1 : 0);
    this.setCaretPosition(element, newCaretPosition);

    this.hideSuggestions(element);
    inputState.currentValue = newValue;
    inputState.caretPosition = newCaretPosition;
  }

  private handleSmartBackspace(element: HTMLElement, event: KeyboardEvent) {
    const inputState = this.inputStates.get(element);
    if (!inputState) return;

    // Check if we're at the end of a word that was just completed
    const value = this.getInputValue(element);
    const caretPos = this.getCaretPosition(element);

    if (caretPos > 0 && value[caretPos - 1] === " ") {
      const wordStart = value.lastIndexOf(" ", caretPos - 2) + 1;
      const wordEnd = caretPos - 1;

      if (wordEnd > wordStart) {
        event.preventDefault();
        const newValue =
          value.substring(0, wordStart) + value.substring(caretPos);
        this.setInputValue(element, newValue);
        this.setCaretPosition(element, wordStart);
      }
    }
  }

  private updateGhostText(element: HTMLElement) {
    // Ghost text functionality removed
  }

  private updateCurrentWord(inputState: InputState) {
    const value = inputState.currentValue;
    const caretPos = inputState.caretPosition;

    let wordStart = caretPos;
    let wordEnd = caretPos;

    // Find word boundaries
    while (wordStart > 0 && /\w/.test(value[wordStart - 1])) {
      wordStart--;
    }

    while (wordEnd < value.length && /\w/.test(value[wordEnd])) {
      wordEnd++;
    }

    inputState.currentWord = value.substring(wordStart, caretPos);
    inputState.wordStart = wordStart;
    inputState.wordEnd = wordEnd;
  }

  private getInputValue(element: HTMLElement): string {
    if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
      return (element as HTMLInputElement).value;
    } else {
      return element.textContent || "";
    }
  }

  private setInputValue(element: HTMLElement, value: string) {
    if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
      (element as HTMLInputElement).value = value;
    } else {
      element.textContent = value;
    }

    // Dispatch input event
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }

  private getCaretPosition(element: HTMLElement): number {
    if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
      return (element as HTMLInputElement).selectionStart || 0;
    } else {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        return range.startOffset;
      }
      return 0;
    }
  }

  private setCaretPosition(element: HTMLElement, position: number) {
    if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
      const input = element as HTMLInputElement;
      input.setSelectionRange(position, position);
    } else {
      const range = document.createRange();
      const sel = window.getSelection();

      if (element.firstChild) {
        range.setStart(
          element.firstChild,
          Math.min(position, element.textContent?.length || 0)
        );
        range.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }

  public updateSettings(newSettings: WordServeSettings) {
    this.settings = newSettings;

    // Update styles
    const existingStyle = document.getElementById("ws-styles");
    if (existingStyle) {
      existingStyle.remove();
    }
    this.createGlobalStyles();

    // Update keyboard handler settings for all inputs
    const keyboardSettings: KeyboardHandlerSettings = {
      numberSelection: newSettings.numberSelection,
      autoInsertionCommitMode: newSettings.autoInsertionCommitMode,
      smartBackspace: newSettings.smartBackspace,
    };

    for (const [element, inputState] of this.inputStates) {
      if (inputState.keyboardHandler) {
        inputState.keyboardHandler.updateSettings(keyboardSettings);
      }
    }

    // Update ghost text for all inputs
    for (const [element, inputState] of this.inputStates) {
      // Ghost text functionality removed
    }
  }

  public destroy() {
    // Clean up observers
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];

    // Clean up timers
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();

    // Clean up DOM elements
    if (this.suggestionMenu) {
      this.suggestionMenu.remove();
    }

    // Clean up React menu renderer
    if (this.menuRenderer) {
      this.menuRenderer.hide();
      this.menuRenderer = null;
    }

    // Clean up keyboard handlers
    for (const [element, inputState] of this.inputStates) {
      if (inputState.keyboardHandler) {
        inputState.keyboardHandler.detach();
      }
    }

    // Clean up input states
    this.inputStates.clear();

    // Remove styles
    const style = document.getElementById("ws-styles");
    if (style) {
      style.remove();
    }
  }
}
