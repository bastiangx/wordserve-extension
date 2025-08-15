import type { WordServeSettings, InputState } from "@/types";
import { AUTOCOMPLETE_DEFAULTS } from "@/types";

export interface InputContext {
  element: HTMLElement;
  currentWord: string;
  wordStart: number;
  wordEnd: number;
  caretPosition: number;
  currentValue: string;
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
}

export class InputHandler {
  private element: HTMLElement;
  private settings: WordServeSettings;
  private callbacks: InputHandlerCallbacks;
  private isActive = false;
  private lastWord = "";
  private autocompleteSeparator: RegExp;

  constructor(
    element: HTMLElement,
    settings: WordServeSettings,
    callbacks: InputHandlerCallbacks
  ) {
    this.element = element;
    this.settings = settings;
    this.callbacks = callbacks;
    this.autocompleteSeparator = /\s+/;
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
    const context = this.getCurrentContext();
    if (!context) return;

    // Check if we should trigger autocomplete
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
    // Don't handle if modifier keys are pressed (except shift for special cases)
    if (event.ctrlKey || event.metaKey || event.altKey) {
      this.callbacks.onHideMenu();
      return;
    }

    if (!this.isActive) return;

    const { key } = event;

    switch (key) {
      case "ArrowDown":
        event.preventDefault();
        event.stopPropagation();
        this.callbacks.onNavigate("down");
        break;
      case "ArrowUp":
        event.preventDefault();
        event.stopPropagation();
        this.callbacks.onNavigate("up");
        break;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        this.callbacks.onHideMenu();
        break;
      case "Enter":
        if (this.shouldHandleKey("enter")) {
          event.preventDefault();
          event.stopPropagation();
          const addSpace =
            this.settings.keyBindings.insertWithSpace.key === "enter";
          this.callbacks.onSelect(addSpace);
        }
        break;
      case "Tab":
        if (this.shouldHandleKey("tab")) {
          event.preventDefault();
          event.stopPropagation();
          const addSpace =
            this.settings.keyBindings.insertWithSpace.key === "tab";
          this.callbacks.onSelect(addSpace);
        }
        break;
      case " ":
        if (this.shouldHandleKey("space")) {
          event.preventDefault();
          event.stopPropagation();
          const addSpace =
            this.settings.keyBindings.insertWithSpace.key === "space";
          this.callbacks.onSelect(addSpace);
        }
        break;
      default:
        // Handle number key selection (1-9)
        if (this.settings.numberSelection && /^[1-9]$/.test(key)) {
          const index = parseInt(key) - 1;
          if (index >= 0 && index < AUTOCOMPLETE_DEFAULTS.MAX_DIGIT_SELECTABLE) {
            event.preventDefault();
            event.stopPropagation();
            this.callbacks.onSelectByNumber(index);
          }
        } else if (!/^[a-zA-Z0-9]$/.test(key) && key.length === 1) {
          // Non-alphanumeric character typed, hide menu
          this.callbacks.onHideMenu();
        }
        break;
    }
  };

  private shouldHandleKey(key: "enter" | "tab" | "space"): boolean {
    return (
      this.settings.keyBindings.insertWithoutSpace.key === key ||
      this.settings.keyBindings.insertWithSpace.key === key
    );
  }

  private handleBlur = () => {
    setTimeout(() => {
      this.callbacks.onHideMenu();
    }, 150);
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

    return {
      element: this.element,
      currentWord,
      wordStart,
      wordEnd,
      caretPosition,
      currentValue: text,
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

    return {
      element: this.element,
      currentWord,
      wordStart,
      wordEnd,
      caretPosition,
      currentValue: text,
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

  public updateSettings(settings: WordServeSettings): void {
    this.settings = settings;
  }
}
