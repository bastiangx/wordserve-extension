import type {
  InputState,
  KeyboardHandlerCallbacks,
  KeyboardHandlerSettings,
  RawSuggestion as WASMSuggestion,
  WASMCompleterStats,
  WordServeSettings,
} from "@/types";
import {KeyboardHandler} from "./kbd";
import {shouldActivateForDomain} from "./domains";
import {buildWordServeScopedVars, WS_RADIUS_VAR} from "./theme";
import {ReactSuggestionMenuRenderer} from "@/components/wordserve/render";

interface WordServeEngine {
  waitForReady(): Promise<void>;
  complete(prefix: string, limit?: number): Promise<WASMSuggestion[]>;
  getStats(): Promise<WASMCompleterStats>;
  readonly ready: boolean;
}

export class DOMManager {
  private wordserve: WordServeEngine;
  private settings: WordServeSettings;
  private inputStates = new Map<HTMLElement, InputState>();
  private suggestionMenu: HTMLElement | null = null;
  private menuRenderer: ReactSuggestionMenuRenderer | null = null;
  private debounceTimers = new Map<HTMLElement, number>();
  private observers: MutationObserver[] = [];
  private mutationObserver: MutationObserver | null = null;

  private readonly INPUT_SELECTORS = "textarea, input, [contentEditable]";

  constructor(wordserve: WordServeEngine, settings: WordServeSettings) {
    this.wordserve = wordserve;
    this.settings = settings;

    console.debug("[WordServe] DOMManager constructor", {
      hostname: window.location.hostname,
      shouldActivate: shouldActivateForDomain(
        window.location.hostname,
        this.settings.domains
      ),
      debugMode: this.settings.debugMode,
    });

    if (
      shouldActivateForDomain(window.location.hostname, this.settings.domains)
    ) {
      this.init();
    }
  }

  private init() {
    console.debug("[WordServe] DOMManager init starting");
    this.setupMutationObserver();
    this.attachToExistingInputs();
    this.createGlobalStyles();
    
    // Pre-warm WASM engine with a common prefix
    this.preWarmWASM();
    
    console.debug("[WordServe] DOMManager init completed");
  }

  private async preWarmWASM() {
    // Pre-warm WASM engine after a short delay to avoid blocking initialization
    setTimeout(async () => {
      try {
        if (this.wordserve.ready) {
          // Use common prefixes to warm up the engine
          await this.wordserve.complete("the", 5);
          await this.wordserve.complete("and", 5);
          console.debug("[WordServe] WASM pre-warming completed");
        }
      } catch (error) {
        console.debug("[WordServe] WASM pre-warming failed:", error);
      }
    }, 1000);
  }

  private setupMutationObserver() {
    this.mutationObserver = new MutationObserver((mutations) => {
      // Use setTimeout to avoid blocking the main thread
      setTimeout(() => this.processMutations(mutations), 0);
    });

    this.mutationObserver.observe(document.documentElement, {
      childList: true,
      attributes: true,
      attributeFilter: ["contenteditable", "type", "name", "id", "style"],
      subtree: true,
    });
  }

  private processMutations(mutations: MutationRecord[]) {
    for (const mutation of mutations) {
      // Handle added nodes
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          this.attachToInputsInElement(element);
        }
      });

      // Handle attribute changes that might affect input detection
      if (
        mutation.type === "attributes" &&
        mutation.target.nodeType === Node.ELEMENT_NODE
      ) {
        const element = mutation.target as Element;
        this.attachToInputsInElement(element);
      }
    }
  }

  private createGlobalStyles() {
    const style = document.createElement("style");
    style.id = "ws-styles";
    style.textContent = `
      /* WordServe scoped tokens */
      :root, .ws-root-scope { ${buildWordServeScopedVars()} }

      @keyframes ws-fade-in { from {opacity:0;transform:scale(.95) translateY(-4px);} to {opacity:1;transform:scale(1) translateY(0);} }

  .ws-suggestion-menu { all:revert-layer; position:fixed; background:hsl(var(--ws-bg)); ${this.settings.menuBorder
        ? "border:1px solid hsl(var(--ws-border));"
        : "border:none;"
      } border-radius:${this.settings.menuBorderRadius ? "var(" + WS_RADIUS_VAR + ",6px)" : "0"
      }; box-shadow:0 10px 15px -3px rgba(0,0,0,.35),0 4px 6px -2px rgba(0,0,0,.25); z-index:2147483646; max-height:300px; overflow-y:auto; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; font-size:${this.getFontSize()}px; font-weight:${this.settings.fontWeight
      }; backdrop-filter:blur(8px); animation:ws-fade-in .15s ease-out; }
      .ws-suggestion-menu.compact { font-size:${this.getFontSize() * 0.9}px; }
  .ws-suggestion-item { padding:${this.settings.compactMode ? "6px 12px" : "8px 12px"
      }; cursor:pointer; display:flex; align-items:center; justify-content:space-between; transition:background-color .12s ease, color .12s ease; color:hsl(var(--ws-text)); border-radius:${this.settings.menuBorderRadius ? "6px" : "0"
      }; margin:2px 4px; }
  .ws-suggestion-item:hover { background:hsl(var(--ws-bgAlt)); }
  .ws-suggestion-item.selected { background:hsl(var(--ws-accent)); color:hsl(var(--ws-accentFg)); }
      .ws-suggestion-word { flex:1; display:flex; align-items:center; }
  .ws-suggestion-prefix { color:hsl(var(--ws-textMuted)); font-weight:500; ${this.settings.accessibility.boldSuffix ? "font-weight:bold;" : ""
      } }
      .ws-suggestion-suffix { color:currentColor; ${this.settings.accessibility.boldSuffix ? "font-weight:bold;" : ""
      } ${this.settings.accessibility.uppercaseSuggestions
        ? "text-transform:uppercase;"
        : ""
      } }
      .ws-suggestion-meta { display:flex; align-items:center; gap:4px; margin-left:8px; }
  .ws-suggestion-number, .ws-suggestion-rank { font-size:0.7rem; color:hsl(var(--ws-textMuted)); font-family:'SF Mono',Monaco,'Cascadia Code','Roboto Mono',Consolas,'Courier New',monospace; }
  .ws-suggestion-item.selected .ws-suggestion-number, .ws-suggestion-item.selected .ws-suggestion-rank { color:hsl(var(--ws-accentFg)); opacity:.85; }
      .ws-suggestion-menu::-webkit-scrollbar { width:6px; }
      .ws-suggestion-menu::-webkit-scrollbar-track { background:transparent; }
  .ws-suggestion-menu::-webkit-scrollbar-thumb { background:hsl(var(--ws-scrollbar)); border-radius:3px; }
  .ws-suggestion-menu::-webkit-scrollbar-thumb:hover { background:hsl(var(--ws-scrollbarHover)); }

      /* Alerts / Toasts */
  .ws-alert-stack { position:fixed; top:12px; right:12px; z-index:2147483647; display:flex; flex-direction:column; gap:8px; width:320px; }
  .ws-alert { background:hsl(var(--ws-bg)); border:1px solid hsl(var(--ws-border)); border-radius:6px; padding:10px 12px; color:hsl(var(--ws-text)); font-size:13px; line-height:1.3; box-shadow:0 6px 14px -4px rgba(0,0,0,.4); display:flex; flex-direction:column; gap:4px; }
  .ws-alert.ws-error { border-color:hsl(var(--ws-danger)); }
      .ws-alert-title { font-weight:600; }
      .ws-alert-desc { font-size:12px; opacity:.85; }

      /* Sensitivity override pill */
  .ws-override-pill { position:fixed; bottom:16px; right:16px; background:hsl(var(--ws-bg)); color:hsl(var(--ws-text)); border:1px solid hsl(var(--ws-border)); padding:12px 14px; border-radius:10px; max-width:360px; box-shadow:0 6px 18px -6px rgba(0,0,0,.45); font-size:13px; display:flex; flex-direction:column; gap:10px; }
      .ws-override-pill-buttons { display:flex; gap:8px; flex-wrap:wrap; }
  .ws-btn { background:hsl(var(--ws-bgAlt)); color:hsl(var(--ws-text)); border:1px solid hsl(var(--ws-border)); padding:6px 10px; font-size:12px; border-radius:6px; cursor:pointer; transition:background .12s ease, border-color .12s ease; }
  .ws-btn:hover { background:hsl(var(--ws-bgAlt)); border-color:hsl(var(--ws-accent)); }
  .ws-btn-primary { background:hsl(var(--ws-accent)); color:hsl(var(--ws-accentFg)); border-color:hsl(var(--ws-accent)); }
      .ws-btn-primary:hover { filter:brightness(1.05); }
    `;

    if (this.settings.accessibility.customColor) {
      style.textContent += `
  .ws-suggestion-item.selected { background: ${this.settings.accessibility.customColor} !important; }
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

    // If fontSize is a number, use it directly
    if (typeof this.settings.fontSize === 'number') {
      return this.settings.fontSize;
    }

    // If fontSize is a string preset, convert it
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

  private attachToExistingInputs() {
    console.debug("[WordServe] attachToExistingInputs starting");
    this.attachToInputsInElement(document.documentElement);
  }

  private attachToInputsInElement(element: Element) {
    // Use simple selectors like FluentTyper
    const inputs = element.querySelectorAll(this.INPUT_SELECTORS);

    console.debug(
      "[WordServe] found inputs",
      inputs.length,
      Array.from(inputs).map((i) => ({
        tag: i.tagName,
        type: (i as any).type,
        id: i.id,
        class: i.className,
      }))
    );

    inputs.forEach((input) => {
      if (!this.inputStates.has(input as HTMLElement)) {
        if (this.shouldAttachToElement(input as HTMLElement)) {
          console.debug("[WordServe] attaching to input", {
            tag: input.tagName,
            type: (input as any).type,
            id: input.id,
          });
          this.attachToInput(input as HTMLElement);
        }
      }
    });
  }

  private shouldAttachToElement(element: HTMLElement): boolean {
    // Skip if element is not visible (like ChatGPT's hidden fallback textarea)
    const computedStyle = window.getComputedStyle(element);
    if (
      computedStyle.display === "none" ||
      computedStyle.visibility === "hidden" ||
      element.offsetHeight === 0 ||
      element.offsetWidth === 0
    ) {
      console.debug("[WordServe] skipping hidden element", element);
      return false;
    }

    // Handle input elements - only allow text-like types
    if (element.tagName === "INPUT") {
      const inputType = (element as HTMLInputElement).type.toLowerCase();
      if (!["text", "search", ""].includes(inputType)) {
        console.debug("[WordServe] skipping non-text input type:", inputType);
        return false;
      }
    }

    // Check for sensitive attributes (similar to FluentTyper filtering)
    const sensitiveChecks = [
      {
        property: "name",
        sensitiveValues: ["username", "password", "email"],
        reverse: true,
      },
      {
        property: "id",
        sensitiveValues: ["username", "password", "email"],
        reverse: true,
      },
      {
        property: "type",
        sensitiveValues: ["password", "email"],
        reverse: true,
      },
      {
        property: "contentEditable",
        sensitiveValues: ["false"],
        reverse: true,
      },
    ];

    for (const check of sensitiveChecks) {
      const value = this.getElementProperty(element, check.property);
      const isSensitive = check.sensitiveValues.some((sensitive) =>
        value.toLowerCase().includes(sensitive.toLowerCase())
      );

      if (check.reverse ? isSensitive : !isSensitive) {
        console.debug(
          `[WordServe] skipping element due to ${check.property}:`,
          value
        );
        return false;
      }
    }

    // Use the existing shouldActivateForInput for additional checks
    return this.shouldActivateForInput(element);
  }

  private getElementProperty(element: HTMLElement, property: string): string {
    switch (property) {
      case "contentEditable":
        return element.contentEditable || "false";
      case "type":
        return (element as HTMLInputElement).type || "";
      case "name":
        return (element as HTMLInputElement).name || "";
      case "id":
        return element.id || "";
      default:
        return element.getAttribute(property) || "";
    }
  }

  private attachToInput(element: HTMLElement) {
    if (!this.shouldActivateForInput(element)) {
      console.debug(
        "[WordServe] skipping input (shouldActivateForInput=false)",
        element
      );
      return;
    }

    console.debug("[WordServe] creating input state for", element);

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
      onNavigate: (direction: number) =>
        this.navigateSuggestions(element, direction),
      onCommit: (addSpace: boolean) => this.commitSuggestion(element, addSpace),
      onHide: () => this.hideSuggestions(element),
      onSelectByNumber: (index: number) =>
        this.selectSuggestion(element, index),
    };

    // Create keyboard handler settings from our settings
    const keyboardSettings: KeyboardHandlerSettings = {
      numberSelection: this.settings.numberSelection,
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
    element.addEventListener(
      "keydown",
      this.handleGlobalKeys.bind(this, element)
    );
    element.addEventListener("focus", this.handleFocus.bind(this, element));
    element.addEventListener("blur", this.handleBlur.bind(this, element));
    element.addEventListener("click", this.handleClick.bind(this, element));
  }

  private shouldActivateForInput(element: HTMLElement): boolean {
    if (
      element.tagName === "INPUT" &&
      (element as HTMLInputElement).type === "password"
    ) {
      console.debug("[WordServe] skipping password input");
      return false;
    }

    const attr = (name: string) =>
      (element.getAttribute(name) || "").toLowerCase();
    const joined = [
      attr("name"),
      attr("id"),
      attr("autocomplete"),
      attr("aria-label"),
      attr("placeholder"),
      attr("data-type"),
    ].join(" ");

    console.debug("[WordServe] checking input activation", {
      element,
      tagName: element.tagName,
      type: (element as HTMLInputElement).type,
      attributes: {
        name: attr("name"),
        id: attr("id"),
        autocomplete: attr("autocomplete"),
        "aria-label": attr("aria-label"),
        placeholder: attr("placeholder"),
        "data-type": attr("data-type"),
      },
      joined,
    });

    const sensitiveHints = [
      "password",
      "passcode",
      "otp",
      "one-time",
      "2fa",
      "cvv",
      "cvc",
      "card",
      "credit",
      "debit",
      "iban",
      "account",
      "routing",
      "ssn",
      "social security",
      "tax id",
      "pin",
      "security answer",
      "secret",
      "license",
      "passport",
    ];

    if (sensitiveHints.some((k) => joined.includes(k))) {
      console.debug(
        "[WordServe] skipping sensitive input, found hints:",
        sensitiveHints.filter((k) => joined.includes(k))
      );
      return false;
    }

    if (attr("data-stripe") || attr("data-payment")) {
      console.debug("[WordServe] skipping payment input");
      return false;
    }

    if (location.protocol !== "https:" && element.isContentEditable) {
      console.debug("[WordServe] skipping contentEditable on HTTP");
      return false;
    }

    console.debug("[WordServe] input activation allowed");
    return true;
  }

  private handleInput(element: HTMLElement, _event: Event) {
    const inputState = this.inputStates.get(element);
    if (!inputState) return;

    console.debug("[WordServe] handleInput triggered", {
      element,
      value: this.getInputValue(element),
    });

    inputState.currentValue = this.getInputValue(element);
    inputState.caretPosition = this.getCaretPosition(element);

    this.updateCurrentWord(inputState);
    console.debug("[WordServe] after updateCurrentWord", {
      currentWord: inputState.currentWord,
      wordStart: inputState.wordStart,
      wordEnd: inputState.wordEnd,
      minLength: this.settings.minWordLength,
    });

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

  private handleFocus(element: HTMLElement, _event: FocusEvent) {
    const inputState = this.inputStates.get(element);
    if (!inputState) return;

    inputState.caretPosition = this.getCaretPosition(element);
    this.updateCurrentWord(inputState);
  }

  private handleBlur(element: HTMLElement, _event: FocusEvent) {
    // Reduced delay since we have click-outside handling now
    setTimeout(() => {
      this.hideSuggestions(element);
    }, 50);
  }

  private handleClick(element: HTMLElement, _event: MouseEvent) {
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

    console.debug(
      "[WordServe] debounceSearch scheduled",
      this.settings.debounceTime
    );

    const timer = window.setTimeout(() => {
      console.debug("[WordServe] debounce timer fired, calling performSearch");
      this.performSearch(element);
    }, this.settings.debounceTime);

    this.debounceTimers.set(element, timer);
  }

  private async performSearch(element: HTMLElement) {
    console.debug("[WordServe] performSearch called");
    const inputState = this.inputStates.get(element);
    console.debug(
      "[WordServe] inputState exists:",
      !!inputState,
      "currentWord:",
      inputState?.currentWord,
      "minLength:",
      this.settings.minWordLength
    );

    if (
      !inputState ||
      inputState.currentWord.length < this.settings.minWordLength
    ) {
      console.debug(
        "[WordServe] performSearch: skip (min length)",
        inputState?.currentWord
      );
      this.hideSuggestions(element);
      return;
    }

    console.debug(
      "[WordServe] checking wordserve.ready:",
      this.wordserve.ready
    );
    if (!this.wordserve.ready) {
      console.debug("[WordServe] performSearch: engine not ready, retry");
      setTimeout(() => this.performSearch(element), 200);
      return;
    }

    console.debug(
      "[WordServe] proceeding with completion for:",
      inputState.currentWord
    );
    const limit = Math.max(1, Math.min(this.settings.maxSuggestions, 128));
    try {
      const stats = await this.wordserve.getStats();
      console.debug("[WordServe] WASM stats:", stats);

      console.debug(
        "[WordServe] calling complete with word:",
        inputState.currentWord,
        "limit:",
        limit
      );

      const result = await this.wordserve.complete(
        inputState.currentWord,
        limit
      );
      
      console.debug(
        "[WordServe] raw completion result:",
        result,
        "type:",
        typeof result,
        "length:",
        result?.length
      );

      if (result.length === 0 && inputState.currentWord === "test") {
        console.debug('[WordServe] Testing with prefix "th"');
        const testResult = await this.wordserve.complete("th", 5);
        console.debug('[WordServe] "th" test result:', testResult);
      }

      if (result.length > 0) {
        inputState.suggestions = result.map((s: any, i: number) => ({
          word: s.word,
          rank: s.rank || i + 1,
        }));
        inputState.selectedIndex = 0;
        inputState.isActive = true;
        
        this.showSuggestions(element);
      } else {
        console.debug("[WordServe] no results, hiding suggestions");
        this.hideSuggestions(element);
      }
    } catch (error) {
      console.debug("[WordServe] performSearch error:", error);
      this.hideSuggestions(element);
    }
  }

  private showSuggestions(element: HTMLElement) {
    const inputState = this.inputStates.get(element);
    if (!inputState) return;

    // Initialize React renderer if needed
    if (!this.menuRenderer) {
      this.menuRenderer = new ReactSuggestionMenuRenderer();
    }

    // Calculate position (already viewport-adjusted)
    inputState.position = undefined;
    const position = this.calculateMenuPosition(element, inputState);
    const suggestions = inputState.suggestions;

    if (this.settings.debugMode) {
      console.debug(
        "[WordServe] showSuggestions (React) at",
        position,
        "count",
        suggestions.length
      );
    }

    // Render with React
    this.menuRenderer.render({
      suggestions,
      selectedIndex: inputState.selectedIndex,
      currentWord: inputState.currentWord,
      position,
      onSelect: (index: number) => this.selectSuggestion(element, index),
      onNavigate: (direction: number) =>
        this.navigateSuggestions(element, direction),
      onSetIndex: (index: number) => {
        const st = this.inputStates.get(element);
        if (!st) return;
        if (index >= 0 && index < st.suggestions.length) {
          st.selectedIndex = index;
          this.updateSuggestionSelection(element);
        }
      },
      onCommit: (addSpace: boolean) => this.commitSuggestion(element, addSpace),
      onClose: () => this.hideSuggestions(element),
      showRanking: this.settings.showRankingOverride,
      showNumbers: this.settings.numberSelection, // only show if numeric selection enabled
      compactMode: this.settings.compactMode,
      rankingPosition: this.settings.rankingPosition,
      borderRadius: this.settings.menuBorderRadius,
      menuBorder: this.settings.menuBorder,
      themeMode: this.settings.themeMode,
      keyBindings: this.settings.keyBindings,
    });
  }

  private calculateMenuPosition(
    element: HTMLElement,
    inputState: InputState
  ): { x: number; y: number } {
    // Recalculate every time to avoid stale positions when page scrolls

    const isContentEditable =
      element.isContentEditable || element.tagName === "DIV";

    let position: { x: number; y: number };
    if (isContentEditable) {
      position = this.getContentEditableCaretPosition(element);
    } else {
      position = this.getInputCaretPosition(element, inputState.caretPosition);
    }

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

    tempDiv.textContent = input.value.substring(0, caretPosition);
    document.body.appendChild(tempDiv);

    const textWidth = tempDiv.getBoundingClientRect().width;
    document.body.removeChild(tempDiv);

    const scrollLeft = input.scrollLeft || 0;
    const x = rect.left + textWidth - scrollLeft;
    const y = rect.bottom; // viewport coordinate for fixed menu

    const adjusted = this.adjustPositionForViewport({ x, y });
    if (this.settings.debugMode)
      console.debug(
        "[WordServe] caret position raw",
        { x, y },
        "adjusted",
        adjusted
      );
    return adjusted;
  }

  private getContentEditableCaretPosition(element: HTMLElement): {
    x: number;
    y: number;
  } {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      const rect = element.getBoundingClientRect();
      return this.adjustPositionForViewport({ x: rect.left, y: rect.bottom });
    }
    const range = selection.getRangeAt(0);
    if (!element.contains(range.startContainer)) {
      const rect = element.getBoundingClientRect();
      return this.adjustPositionForViewport({ x: rect.left, y: rect.bottom });
    }
    let rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      // Create a temporary range expanding by one char if possible
      const temp = range.cloneRange();
      if (range.startContainer.nodeType === Node.TEXT_NODE) {
        const text = range.startContainer as Text;
        if (range.startOffset < text.data.length) {
          temp.setEnd(range.startContainer, range.startOffset + 1);
        } else if (range.startOffset > 0) {
          temp.setStart(range.startContainer, range.startOffset - 1);
        }
        rect = temp.getBoundingClientRect();
      }
    }
    const x = rect.left;
    const y = rect.bottom;
    return this.adjustPositionForViewport({ x, y });
  }

  private adjustPositionForViewport(position: { x: number; y: number }): {
    x: number;
    y: number;
  } {
    const menuWidth = 300; // default fallback - actual width will be calculated dynamically
    const menuHeight = 200; // estimated menu height
    const padding = 10;
    const caretOffset = 20; // Space between caret and menu when positioned above

    let { x, y } = position;

    // Adjust horizontal position if menu would go off screen
    const availableSpaceRight = window.innerWidth - x;
    if (availableSpaceRight < menuWidth + padding) {
      x = Math.max(padding, window.innerWidth - menuWidth - padding);
    }

    // Adjust vertical position if menu would go off screen
    const availableSpaceBottom = window.innerHeight - y;
    if (availableSpaceBottom < menuHeight + padding) {
      // Try to place above the caret with proper spacing
      y = y - menuHeight - caretOffset;

      // If still not enough space above, clamp to viewport
      if (y < padding) {
        y = padding;
      }
    }

    return { x: Math.max(padding, x), y };
  }

  private hideSuggestions(element: HTMLElement) {
    const inputState = this.inputStates.get(element);
    if (this.settings.debugMode) console.debug("[WordServe] hideSuggestions");
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
    if (!inputState) return;

    // Re-render with new selection if using React renderer
    if (this.menuRenderer && inputState.isActive) {
      const position = this.calculateMenuPosition(element, inputState);
      this.menuRenderer.updateSelection(
        inputState.selectedIndex,
        inputState.suggestions,
        inputState.currentWord,
        position,
        (index: number) => this.selectSuggestion(element, index),
        () => this.hideSuggestions(element),
        {
          showRanking: this.settings.showRankingOverride,
          showNumbers: this.settings.numberSelection,
          compactMode: this.settings.compactMode,
          rankingPosition: this.settings.rankingPosition,
          borderRadius: this.settings.menuBorderRadius,
          menuBorder: this.settings.menuBorder,
          themeMode: this.settings.themeMode,
          keyBindings: this.settings.keyBindings,
        }
      );
    } else if (this.suggestionMenu) {
      // Fallback for DOM-based menu
      const items = this.suggestionMenu.querySelectorAll(".ws-suggestion-item");
      items.forEach((item, idx) => {
        item.classList.toggle("selected", idx === inputState.selectedIndex);
      });
    }
  }

  private getSelectedIndex(): number {
    for (const [_, state] of this.inputStates) {
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

  private updateCurrentWord(inputState: InputState) {
    const activeEl = [...this.inputStates.entries()].find(
      ([, s]) => s === inputState
    )?.[0];
    let full = inputState.currentValue;
    let caretPos = inputState.caretPosition;
    if (
      activeEl &&
      !(activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")
    ) {
      const data = this.getContentEditableTextAndCaret(activeEl);
      full = data.text;
      caretPos = data.caret;
      inputState.currentValue = full;
      inputState.caretPosition = caretPos;
    }
    let wordStart = caretPos;
    let wordEnd = caretPos;
    while (wordStart > 0 && /[A-Za-z0-9_]/.test(full[wordStart - 1]))
      wordStart--;
    while (wordEnd < full.length && /[A-Za-z0-9_]/.test(full[wordEnd]))
      wordEnd++;
    inputState.currentWord = full.substring(wordStart, caretPos);
    inputState.wordStart = wordStart;
    inputState.wordEnd = wordEnd;
  }

  private getContentEditableTextAndCaret(root: HTMLElement): {
    text: string;
    caret: number;
  } {
    const sel = window.getSelection();
    const anchorNode = sel && sel.rangeCount ? sel.anchorNode : null;
    const anchorOffset = sel && sel.rangeCount ? sel.anchorOffset : 0;
    let caret = 0;
    // Simple cache: reuse if text unchanged
    const textNow = root.innerText;
    if (
      (root as any).__wsLastText === textNow &&
      (root as any).__wsLastCaret != null
    ) {
      return { text: textNow, caret: (root as any).__wsLastCaret as number };
    }
    const parts: string[] = [];
    // Pre-allocate an array of node segments with start positions for faster mapping
    interface Segment {
      node: Text;
      start: number;
      end: number;
    }
    // segments array is created for potential future use in caret positioning
    const segments: Segment[] = [];

    function walk(node: Node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const data = (node as Text).data;
        if (!data) return;
        const start = parts.join("").length;
        parts.push(data);
        // Keep end calculation for segments array completeness
        const _end = start + data.length;
        segments.push({ node: node as Text, start, end: _end });
        if (node === anchorNode) {
          caret = start + Math.min(anchorOffset, data.length);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.tagName === "BR") {
          const _start = parts.join("").length;
          parts.push("\n");
          // No caret inside BR
          return;
        }
        for (let i = 0; i < node.childNodes.length; i++)
          walk(node.childNodes[i]);
        if (el.tagName === "DIV" && el !== root) {
          parts.push("\n");
        }
      }
    }
    walk(root);
    const full = parts.join("");
    if (caret > full.length) caret = full.length;
    (root as any).__wsLastText = full;
    (root as any).__wsLastCaret = caret;
    return { text: full, caret };
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
    }
    const data = this.getContentEditableTextAndCaret(element);
    return data.caret;
  }

  private setCaretPosition(element: HTMLElement, position: number) {
    if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
      const input = element as HTMLInputElement;
      input.setSelectionRange(position, position);
      return;
    }
    const range = document.createRange();
    const sel = window.getSelection();
    let remaining = position;
    let found = false;
    function walk(node: Node) {
      if (found) return;
      if (node.nodeType === Node.TEXT_NODE) {
        const t = (node as Text).data || "";
        if (remaining <= t.length) {
          range.setStart(node, remaining);
          found = true;
          return;
        }
        remaining -= t.length;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        for (let i = 0; i < node.childNodes.length; i++) {
          walk(node.childNodes[i]);
          if (found) return;
        }
      }
    }
    walk(element);
    if (!found) range.selectNodeContents(element);
    range.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(range);
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
      smartBackspace: newSettings.smartBackspace,
    };

    for (const [_, inputState] of this.inputStates) {
      if (inputState.keyboardHandler) {
        inputState.keyboardHandler.updateSettings(keyboardSettings);
      }
    }

    // Ghost text functionality removed - no longer needed
  }

  public destroy() {
    // Clean up mutation observer
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

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

    // Clean up React renderer
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
