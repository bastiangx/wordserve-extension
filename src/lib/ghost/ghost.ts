/**
 * Ghost text implementation using mirror element approach
 * Works with any input field (input, textarea, contenteditable)
 */

import type { WordServeSettings } from "@/types";

class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;
  constructor(maxSize: number = 25) {
    this.maxSize = maxSize;
  }
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }
  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }
  clear(): void {
    this.cache.clear();
  }
}

export interface GhostTextOptions {
  ghostTextClass?: string;
  debounceMs?: number;
  acceptKey?: string;
  rejectKey?: string;
  getSuggestion?: (text: string, signal: AbortSignal) => Promise<string | null>;
  settings: WordServeSettings;
  isMenuActive?: () => boolean;
  getSelectedSuggestion?: () => string | null;
}

export interface GhostTextPosition {
  left: number;
  top: number;
  width: number;
  height: number;
}

const GHOST_TEXT_ID = "wordserve-ghost-text";
const MIRROR_ELEMENT_ID = "wordserve-mirror";

export class GhostTextManager {
  private targetElement: HTMLElement;
  private ghostElement: HTMLElement | null = null;
  private mirrorElement: HTMLElement | null = null;
  private currentSuggestion: string = "";
  private abortController: AbortController | null = null;
  private debounceTimer: number | null = null;
  private options: GhostTextOptions;
  private suggestionCache: LRUCache<string, string>;

  constructor(element: HTMLElement, options: GhostTextOptions) {
    console.log(
      "WordServe: Creating GhostTextManager for element:",
      element.tagName
    );
    this.targetElement = element;
    this.options = {
      ghostTextClass: "wordserve-ghost-text",
      debounceMs: 300,
      acceptKey: "Tab",
      rejectKey: "Escape",
      getSuggestion: async () => null,
      isMenuActive: () => false,
      getSelectedSuggestion: () => null,
      ...options,
    };
    this.suggestionCache = new LRUCache<string, string>(25);
    this.init();
    console.log("WordServe: GhostTextManager initialization complete");
  }

  private init(): void {
    this.createMirrorElement();
    this.attachEventListeners();
    this.injectStyles();
  }

  private createMirrorElement(): void {
    this.mirrorElement = document.createElement("div");
    this.mirrorElement.id = MIRROR_ELEMENT_ID;
    this.mirrorElement.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      visibility: hidden;
      white-space: pre-wrap;
      word-wrap: break-word;
      pointer-events: none;
      z-index: -1;
    `;
    document.body.appendChild(this.mirrorElement);
  }

  private copyElementStyles(from: HTMLElement, to: HTMLElement): void {
    const computedStyle = window.getComputedStyle(from);
    const stylesToCopy = [
      "font-family",
      "font-size",
      "font-weight",
      "font-style",
      "line-height",
      "letter-spacing",
      "text-transform",
      "padding-left",
      "padding-right",
      "padding-top",
      "padding-bottom",
      "border-left-width",
      "border-right-width",
      "border-top-width",
      "border-bottom-width",
      "box-sizing",
      "width",
      "text-align",
    ];
    stylesToCopy.forEach((prop) => {
      to.style.setProperty(prop, computedStyle.getPropertyValue(prop));
    });
  }

  private getCaretPosition(): GhostTextPosition {
    if (!this.mirrorElement) {
      return { left: 0, top: 0, width: 0, height: 0 };
    }
    if (
      this.targetElement instanceof HTMLInputElement ||
      this.targetElement instanceof HTMLTextAreaElement
    ) {
      const targetRect = this.targetElement.getBoundingClientRect();
      const styles = window.getComputedStyle(this.targetElement);
      const measureSpan = document.createElement("span");
      measureSpan.style.cssText = `
        position: absolute;
        top: -9999px;
        left: -9999px;
        font-family: ${styles.fontFamily};
        font-size: ${styles.fontSize};
        font-weight: ${styles.fontWeight};
        letter-spacing: ${styles.letterSpacing};
        white-space: pre;
      `;
      const currentText = this.getCurrentText();
      measureSpan.textContent = currentText;
      document.body.appendChild(measureSpan);
      const textWidth = measureSpan.getBoundingClientRect().width;
      document.body.removeChild(measureSpan);
      const paddingLeft = parseInt(styles.paddingLeft, 10) || 0;
      const paddingTop = parseInt(styles.paddingTop, 10) || 0;
      const position = {
        left: targetRect.left + paddingLeft + textWidth,
        top: targetRect.top + paddingTop,
        width: 0,
        height: parseInt(styles.fontSize, 10) || 16,
      };
      return position;
    }
    // fallback
    return { left: 0, top: 0, width: 0, height: 20 };
  }

  private getCurrentText(): string {
    if (
      this.targetElement instanceof HTMLInputElement ||
      this.targetElement instanceof HTMLTextAreaElement
    ) {
      return this.targetElement.value.substring(
        0,
        this.targetElement.selectionStart || 0
      );
    } else if (this.targetElement.isContentEditable) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return "";

      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(this.targetElement);
      preCaretRange.setEnd(range.endContainer, range.endOffset);

      return preCaretRange.toString();
    }
    return "";
  }

  private getCurrentWord(): string {
    const fullText = this.getCurrentText();
    const words = fullText.split(/\s+/);
    const lastWord = words[words.length - 1] || "";
    console.log(
      "WordServe: Ghost text current word:",
      lastWord,
      "from full text:",
      fullText
    );
    return lastWord;
  }

  private createGhostElement(): HTMLElement {
    const ghost = document.createElement("span");
    ghost.id = GHOST_TEXT_ID;
    ghost.className = this.options.ghostTextClass || "wordserve-ghost-text";
    const { fontStyle, colorIntensity } = this.options.settings.ghostText;

    ghost.style.cssText = `
      position: absolute;
      pointer-events: none;
      color: var(--wordserve-ghost-color-${colorIntensity}, #999);
      opacity: 0.6;
      z-index: 1000;
      white-space: pre;
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      font-style: ${fontStyle};
      font-weight: ${fontStyle === "bold" ? "bold" : "inherit"};
    `;
    return ghost;
  }

  private showGhostText(suggestion: string): void {
    console.log(
      "WordServe: Ghost text showGhostText called with:",
      `"${suggestion}"`
    );
    this.hideGhostText();
    if (!suggestion) {
      console.log("WordServe: Ghost text - no suggestion provided");
      return;
    }
    this.currentSuggestion = suggestion;
    this.ghostElement = this.createGhostElement();
    this.ghostElement.textContent = suggestion;
    const position = this.getCaretPosition();
    this.ghostElement.style.left = `${position.left}px`;
    this.ghostElement.style.top = `${position.top}px`;
    document.body.appendChild(this.ghostElement);
  }

  private hideGhostText(): void {
    if (this.ghostElement) {
      console.log("WordServe: Ghost text hiding ghost element");
      this.ghostElement.remove();
      this.ghostElement = null;
    }
    this.currentSuggestion = "";
  }

  private async getSuggestionDebounced(): Promise<void> {
    console.log("WordServe: Ghost text getSuggestionDebounced called");
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(async () => {
      if (!this.options.settings.ghostText.enabled) {
        this.hideGhostText();
        return;
      }
      if (!this.options.isMenuActive || !this.options.isMenuActive()) {
        this.hideGhostText();
        return;
      }
      if (this.options.getSelectedSuggestion) {
        const selectedSuggestion = this.options.getSelectedSuggestion();
        if (selectedSuggestion) {
          this.showGhostText(selectedSuggestion);
          return;
        }
      }
      const currentWord = this.getCurrentWord().trim();
      console.log("WordServe: Ghost text processing word:", `"${currentWord}"`);
      if (
        !currentWord ||
        currentWord.length < this.options.settings.minWordLength
      ) {
        console.log("WordServe: Ghost text - no word or too short, hiding");
        this.hideGhostText();
        return;
      }
      let suggestion = this.suggestionCache.get(currentWord);
      console.log(
        "WordServe: Ghost text cache lookup for:",
        currentWord,
        "result:",
        suggestion
      );

      if (!suggestion && this.options.getSuggestion) {
        if (this.abortController) {
          this.abortController.abort();
        }
        this.abortController = new AbortController();
        try {
          const result = await this.options.getSuggestion(
            currentWord,
            this.abortController.signal
          );
          if (result && !this.abortController.signal.aborted) {
            suggestion = result;
            this.suggestionCache.set(currentWord, suggestion);
          }
        } catch (error) {
          if (error instanceof Error && error.name !== "AbortError") {
            console.warn("Ghost text suggestion error:", error);
          }
          return;
        }
      }
      if (suggestion && !this.abortController?.signal.aborted) {
        this.showGhostText(suggestion);
      }
    }, this.options.debounceMs || 300);
  }

  private acceptSuggestion(): void {
    if (!this.currentSuggestion) return;
    const suggestion = this.currentSuggestion;
    this.hideGhostText();
    if (
      this.targetElement instanceof HTMLInputElement ||
      this.targetElement instanceof HTMLTextAreaElement
    ) {
      const start = this.targetElement.selectionStart || 0;
      const end = this.targetElement.selectionEnd || 0;
      const currentValue = this.targetElement.value;
      this.targetElement.value =
        currentValue.substring(0, start) +
        suggestion +
        currentValue.substring(end);
      this.targetElement.selectionStart = this.targetElement.selectionEnd =
        start + suggestion.length;
      this.targetElement.dispatchEvent(new Event("input", { bubbles: true }));
    } else if (this.targetElement.isContentEditable) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(suggestion));
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }

  private attachEventListeners(): void {
    const handleInput = () => {
      console.log("WordServe: Ghost text input event triggered");
      this.getSuggestionDebounced();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      console.log("WordServe: Ghost text keydown event:", event.key);
      if (event.key === this.options.acceptKey && this.currentSuggestion) {
        console.log(
          "WordServe: Ghost text accepting suggestion:",
          this.currentSuggestion
        );
        event.preventDefault();
        this.acceptSuggestion();
      } else if (event.key === this.options.rejectKey) {
        console.log("WordServe: Ghost text rejecting suggestion");
        event.preventDefault();
        this.hideGhostText();
      }
    };

    const handleBlur = () => {
      console.log("WordServe: Ghost text blur event");
      this.hideGhostText();
    };

    const handleScroll = () => {
      if (this.ghostElement) {
        const position = this.getCaretPosition();
        this.ghostElement.style.left = `${position.left}px`;
        this.ghostElement.style.top = `${position.top}px`;
      }
    };

    console.log("WordServe: Ghost text attaching event listeners");
    this.targetElement.addEventListener("input", handleInput);
    this.targetElement.addEventListener("keydown", handleKeyDown);
    this.targetElement.addEventListener("blur", handleBlur);
    this.targetElement.addEventListener("scroll", handleScroll);
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);
  }

  private injectStyles(): void {
    if (document.getElementById("wordserve-ghost-styles")) return;

    const { colorIntensity, fontStyle } = this.options.settings.ghostText;

    const style = document.createElement("style");
    style.id = "wordserve-ghost-styles";
    style.textContent = `
      .${this.options.ghostTextClass || "wordserve-ghost-text"} {
        color: var(--wordserve-ghost-color-${colorIntensity}, #999) !important;
        opacity: 0.6 !important;
        font-style: ${fontStyle} !important;
        font-weight: ${fontStyle === "bold" ? "bold" : "inherit"} !important;
      }
      
      :root {
        --wordserve-ghost-color-normal: #333;
        --wordserve-ghost-color-muted: #666;
        --wordserve-ghost-color-faint: #999;
        --wordserve-ghost-color-accent: #0066cc;
      }
      
      @media (prefers-color-scheme: dark) {
        :root {
          --wordserve-ghost-color-normal: #ccc;
          --wordserve-ghost-color-muted: #999;
          --wordserve-ghost-color-faint: #666;
          --wordserve-ghost-color-accent: #4da6ff;
        }
      }
    `;
    document.head.appendChild(style);
  }

  public destroy(): void {
    this.hideGhostText();

    if (this.mirrorElement) {
      this.mirrorElement.remove();
      this.mirrorElement = null;
    }

    if (this.abortController) {
      this.abortController.abort();
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.suggestionCache.clear();
  }

  public updateSettings(settings: WordServeSettings): void {
    this.options.settings = settings;

    // Re-inject styles with new settings
    const existingStyles = document.getElementById("wordserve-ghost-styles");
    if (existingStyles) {
      existingStyles.remove();
    }
    this.injectStyles();

    // Hide ghost text if disabled
    if (!settings.ghostText.enabled) {
      this.hideGhostText();
    }
  }

  public forceUpdate(): void {
    if (this.options.settings.ghostText.enabled) {
      this.getSuggestionDebounced();
    } else {
      this.hideGhostText();
    }
  }
}
