import type { DefaultConfig, InputState } from "@/types";
import { eventMatchesAny, normalizeEventKey } from "@/lib/input/kbd";
import { browser } from "wxt/browser";
import { AUTOCOMPLETE_DEFAULTS } from "@/types";
import {
  getCaretCoordinates,
  getCaretCoordinatesContentEditable,
  type CaretPosition,
} from "@/lib/input/caret";
import { smartBackspace } from "@/lib/input/backspace";
import { findAbbreviation } from "@/lib/input/abbrv";

export interface InputContext {
  element: HTMLElement;
  currentWord: string;
  wordStart: number;
  wordEnd: number;
  caretPosition: number;
  currentValue: string;
  caretCoords: CaretPosition;
}

export interface KeyboardEvent {
  key: string;
  code: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  preventDefault: () => void;
  stopPropagation: () => void;
}

export interface InputHandlerCallbacks {
  onWordChange: (context: InputContext) => void;
  onHideMenu: () => void;
  onNavigate: (direction: "up" | "down") => void;
  onSelect: (addSpace?: boolean) => void;
  onSelectByNumber: (index: number) => void;
  onBackspace: (context: InputContext, event: KeyboardEvent) => void;
}

export class InputHandler {
  private element: HTMLElement;
  private settings: DefaultConfig;
  private callbacks: InputHandlerCallbacks;
  private isActive = false;
  private lastWord = "";
  private autocompleteSeparator: RegExp;
  private menuVisible = false;
  private lastInputWasFromSuggestion = false;

  constructor(
    element: HTMLElement,
    settings: DefaultConfig,
    callbacks: InputHandlerCallbacks
  ) {
    this.element = element;
    this.settings = settings;
    this.callbacks = callbacks;
    this.autocompleteSeparator = /\s+/;
    this.isActive = true;
    this.attach();
  }

  private attach() {
    this.element.addEventListener("input", this.handleInput, true);
    this.element.addEventListener("keydown", this.handleKeydown, true);
    this.element.addEventListener("blur", this.handleBlur, true);
    this.element.addEventListener("click", this.handleClick, true);
  }

  public detach() {
    this.element.removeEventListener("input", this.handleInput, true);
    this.element.removeEventListener("keydown", this.handleKeydown, true);
    this.element.removeEventListener("blur", this.handleBlur, true);
    this.element.removeEventListener("click", this.handleClick, true);
  }

  private handleInput = (event: Event) => {
    if (!this.isActive) {
      return;
    }
    const context = this.getCurrentContext();
    if (!context) {
      return;
    }
    // Only invalidate smart backspace if this wasn't from our suggestion system
    // AND if the user typed a space or punctuation (indicating they moved on from the last word)
    if (!this.lastInputWasFromSuggestion && this.settings.smartBackspace) {
      // Check the last character typed to see if it's a space or punctuation
      const lastChar = this.getLastTypedCharacter();
      if (lastChar && (/\s/.test(lastChar) || /[^\w]/.test(lastChar))) {
        smartBackspace.invalidateForElement(this.element);
      }
    }
    this.lastInputWasFromSuggestion = false;
    if (
      this.settings.abbreviationsEnabled &&
      this.settings.abbreviationInsertMode === "immediate"
    ) {
      const match = findAbbreviation(context.currentWord, this.settings);
      if (match) {
        this.replaceCurrentWord(match.value, true);
        this.markInputFromSuggestion();
        const newContext = this.getCurrentContext();
        if (
          newContext &&
          newContext.currentWord.length >= this.settings.minWordLength
        ) {
          this.lastWord = newContext.currentWord;
          this.callbacks.onWordChange(newContext);
        } else {
          this.lastWord = "";
          this.callbacks.onHideMenu();
        }
        return;
      }
    }

    if (context.currentWord.length >= this.settings.minWordLength) {
      if (context.currentWord !== this.lastWord) {
        this.lastWord = context.currentWord;
        this.callbacks.onWordChange(context);
      }
    } else {
      this.lastWord = "";
      this.callbacks.onHideMenu();
    }
  };

  private handleKeydown = (event: KeyboardEvent) => {
    const { key } = event;

    const hasAnyModifier = () =>
      event.ctrlKey || event.metaKey || event.altKey || event.shiftKey;

    // Allow these global actions even when inactive
    if (eventMatchesAny(event as any, this.settings.keyBindings.openSettings)) {
      event.preventDefault();
      event.stopPropagation();
      browser.runtime
        .sendMessage({ type: "wordserve-open-settings" })
        .catch(() => {});
      return;
    }
    if (eventMatchesAny(event as any, this.settings.keyBindings.toggleGlobal)) {
      event.preventDefault();
      event.stopPropagation();
      browser.runtime
        .sendMessage({ type: "wordserve-toggle-global" })
        .catch(() => {});
      return;
    }

    if (!this.isActive) {
      return;
    }

    // Handle backspace for smart backspace functionality
    if (
      key === "Backspace" &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      const context = this.getCurrentContext();
      if (context) {
        // Pass the event to the callback so it can prevent default if needed
        this.callbacks.onBackspace(context, event);
      }
    }

    // Handle custom chords for navigation/close/open/toggle
    if (eventMatchesAny(event as any, this.settings.keyBindings.navDown)) {
      if (this.menuVisible) {
        event.preventDefault();
        event.stopPropagation();
        this.callbacks.onNavigate("down");
      }
      return;
    }
    if (eventMatchesAny(event as any, this.settings.keyBindings.navUp)) {
      if (this.menuVisible) {
        event.preventDefault();
        event.stopPropagation();
        this.callbacks.onNavigate("up");
      }
      return;
    }
    if (eventMatchesAny(event as any, this.settings.keyBindings.closeMenu)) {
      if (this.menuVisible) {
        event.preventDefault();
        event.stopPropagation();
        this.callbacks.onHideMenu();
      }
      return;
    }
  // handled above

    // Only handle these keys when menu is visible
    if (!this.menuVisible) {
      return;
    }

    // Handle selection via configured chords first
    if (eventMatchesAny(event as any, this.settings.keyBindings.insertWithSpace)) {
      event.preventDefault();
      event.stopPropagation();
      this.callbacks.onSelect(true);
      return;
    }
    if (eventMatchesAny(event as any, this.settings.keyBindings.insertWithoutSpace)) {
      event.preventDefault();
      event.stopPropagation();
      this.callbacks.onSelect(false);
      return;
    }
    // Space fallback for abbreviation-on-space
    const norm = normalizeEventKey(event.key, event.code);
    if (
      norm === "space" &&
      this.settings.abbreviationsEnabled &&
      this.settings.abbreviationInsertMode === "space"
    ) {
      const context = this.getCurrentContext();
      if (context && context.currentWord) {
        const match = findAbbreviation(context.currentWord, this.settings);
        if (match) {
          event.preventDefault();
          event.stopPropagation();
          this.replaceCurrentWord(match.value, true);
          this.markInputFromSuggestion();
          this.callbacks.onHideMenu();
          return;
        }
      }
      if (this.settings.smartBackspace) {
        smartBackspace.invalidateForElement(this.element);
      }
    }
    // Digit quick select
    if (
      this.settings.numberSelection &&
      !hasAnyModifier() &&
      /^[1-9]$/.test(key)
    ) {
      const index = parseInt(key) - 1;
      if (
        index >= 0 &&
        index < AUTOCOMPLETE_DEFAULTS.MAX_DIGIT_SELECTABLE
      ) {
        event.preventDefault();
        event.stopPropagation();
        this.callbacks.onSelectByNumber(index);
        return;
      }
    }
    // Non-alphanumeric single characters hide menu
    if (!/^[a-zA-Z0-9]$/.test(key) && key.length === 1) {
      this.callbacks.onHideMenu();
    }
  };

  // removed legacy shouldHandleKey

  private handleBlur = () => {
    setTimeout(() => {
      this.callbacks.onHideMenu();
    }, 300);
  };

  private handleClick = () => {
    const context = this.getCurrentContext();
    if (context && context.currentWord.length >= this.settings.minWordLength) {
      this.callbacks.onWordChange(context);
    } else {
      this.callbacks.onHideMenu();
    }
  };

  public getCurrentContext(): InputContext | null {
    if (!this.isContentEditable() && !this.isInputElement()) {
      return null;
    }

    try {
      if (this.isContentEditable()) {
        return this.getContentEditableContext();
      } else {
        return this.getInputElementContext();
      }
    } catch (error) {
      console.error("Error getting input context:", error);
      return null;
    }
  }

  private isContentEditable(): boolean {
    return (
      this.element.contentEditable === "true" ||
      this.element.getAttribute("contenteditable") === "true"
    );
  }

  private isInputElement(): boolean {
    return (
      this.element.nodeName === "INPUT" || this.element.nodeName === "TEXTAREA"
    );
  }

  private getContentEditableContext(): InputContext | null {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return null;

    const range = selection.getRangeAt(0);
    const text = this.element.textContent || "";
    const caretPosition = this.getCaretPositionInContentEditable(range);

    const { currentWord, wordStart, wordEnd } = this.extractWordAtPosition(
      text,
      caretPosition
    );

    const caretCoords = getCaretCoordinatesContentEditable(this.element);

    return {
      element: this.element,
      currentWord,
      wordStart,
      wordEnd,
      caretPosition,
      currentValue: text,
      caretCoords,
    };
  }

  private getInputElementContext(): InputContext | null {
    const input = this.element as HTMLInputElement | HTMLTextAreaElement;
    const text = input.value;
    const caretPosition = input.selectionStart || 0;

    const { currentWord, wordStart, wordEnd } = this.extractWordAtPosition(
      text,
      caretPosition
    );

    const caretCoords = getCaretCoordinates(input);

    return {
      element: this.element,
      currentWord,
      wordStart,
      wordEnd,
      caretPosition,
      currentValue: text,
      caretCoords,
    };
  }

  private getCaretPositionInContentEditable(range: Range): number {
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(this.element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
  }

  private extractWordAtPosition(
    text: string,
    position: number
  ): {
    currentWord: string;
    wordStart: number;
    wordEnd: number;
  } {
    // Find word boundaries
    let wordStart = position;
    let wordEnd = position;

    // Find start of word (go backwards until we hit a separator or start of text)
    while (
      wordStart > 0 &&
      !this.autocompleteSeparator.test(text[wordStart - 1])
    ) {
      wordStart--;
    }

    // Find end of word (go forwards until we hit a separator or end of text)
    while (
      wordEnd < text.length &&
      !this.autocompleteSeparator.test(text[wordEnd])
    ) {
      wordEnd++;
    }

    const currentWord = text.substring(wordStart, wordEnd);

    return {
      currentWord,
      wordStart,
      wordEnd,
    };
  }

  public replaceCurrentWord(newWord: string, addSpace = false): void {
    const context = this.getCurrentContext();
    if (!context) return;

    const replacement = newWord + (addSpace ? " " : "");

    if (this.isContentEditable()) {
      this.replaceWordInContentEditable(context, replacement);
    } else {
      this.replaceWordInInputElement(context, replacement);
    }
  }

  private replaceWordInContentEditable(
    context: InputContext,
    replacement: string
  ): void {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    try {
      const range = selection.getRangeAt(0);
      const startContainer = range.startContainer;

      // Create a new range that selects the current word
      const wordRange = document.createRange();

      if (startContainer.nodeType === Node.TEXT_NODE) {
        const textNode = startContainer as Text;
        const textContent = textNode.textContent || "";
        const caretOffset = range.startOffset;

        // Find word boundaries relative to this text node
        let wordStart = caretOffset;
        let wordEnd = caretOffset;

        while (
          wordStart > 0 &&
          !this.autocompleteSeparator.test(textContent[wordStart - 1])
        ) {
          wordStart--;
        }

        while (
          wordEnd < textContent.length &&
          !this.autocompleteSeparator.test(textContent[wordEnd])
        ) {
          wordEnd--;
        }

        wordRange.setStart(textNode, wordStart);
        wordRange.setEnd(textNode, wordEnd);
      }

      // Replace the word
      wordRange.deleteContents();
      const textNode = document.createTextNode(replacement);
      wordRange.insertNode(textNode);

      // Position cursor at end of replacement
      const newRange = document.createRange();
      newRange.setStartAfter(textNode);
      newRange.collapse(true);

      selection.removeAllRanges();
      selection.addRange(newRange);
    } catch (error) {
      console.error("Error replacing word in contenteditable:", error);
    }
  }

  private replaceWordInInputElement(
    context: InputContext,
    replacement: string
  ): void {
    const input = this.element as HTMLInputElement | HTMLTextAreaElement;
    const { currentValue, wordStart, wordEnd } = context;

    const newValue =
      currentValue.substring(0, wordStart) +
      replacement +
      currentValue.substring(wordEnd);

    input.value = newValue;

    // Position cursor at end of replacement
    const newCursorPosition = wordStart + replacement.length;
    input.setSelectionRange(newCursorPosition, newCursorPosition);

    // Trigger input event for any listeners
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  public setActive(active: boolean): void {
    this.isActive = active;
  }

  public isMenuActive(): boolean {
    return this.isActive;
  }

  public enable(): void {
    this.isActive = true;
  }

  public disable(): void {
    this.isActive = false;
  }

  public updateSettings(settings: DefaultConfig): void {
    this.settings = settings;
  }

  public setMenuVisible(visible: boolean): void {
    this.menuVisible = visible;
  }

  public markInputFromSuggestion(): void {
    this.lastInputWasFromSuggestion = true;
  }

  private getLastTypedCharacter(): string | null {
    if (this.isInputElement()) {
      const input = this.element as HTMLInputElement | HTMLTextAreaElement;
      const cursorPos = input.selectionStart || 0;
      if (cursorPos > 0) {
        return input.value.charAt(cursorPos - 1);
      }
    } else if (this.isContentEditable()) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const textNode = range.startContainer;
        const offset = range.startOffset;
        if (textNode.nodeType === Node.TEXT_NODE && offset > 0) {
          return textNode.textContent?.charAt(offset - 1) || null;
        }
      }
    }
    return null;
  }
}
