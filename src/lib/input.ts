import type { WordServeSettings, InputState } from "@/types";
import type { AutocompleteSuggestion } from "@/components/ws-menu";

type Callbacks = {
  onSuggestionsRequested?: (
    suggestions: AutocompleteSuggestion[],
    element: HTMLInputElement | HTMLTextAreaElement
  ) => void;
  onMenuHide?: () => void;
};

// Tracks caret/word state and supports committing insertions.
export class InputHandler {
  private settings: WordServeSettings;
  private callbacks: Callbacks;
  private currentElement: HTMLInputElement | HTMLTextAreaElement | null = null;
  private inputState: InputState = {
    currentWord: "",
    wordStart: 0,
    wordEnd: 0,
    suggestions: [],
    selectedIndex: 0,
    isActive: false,
    currentValue: "",
    caretPosition: 0,
  };

  constructor(settings: WordServeSettings, callbacks: Callbacks = {}) {
    this.settings = settings;
    this.callbacks = callbacks;
  }

  updateSettings(settings: WordServeSettings) {
    this.settings = settings;
  }

  attachToElement(el: HTMLInputElement | HTMLTextAreaElement) {
    this.detachFromElement();
    this.currentElement = el;
    el.addEventListener("input", this.handleInput);
    el.addEventListener("blur", this.handleBlur);
    el.addEventListener("focus", this.handleFocus);
    this.recomputeStateFromElement(el);
  }

  detachFromElement() {
    if (!this.currentElement) return;
    this.currentElement.removeEventListener("input", this.handleInput);
    this.currentElement.removeEventListener("blur", this.handleBlur);
    this.currentElement.removeEventListener("focus", this.handleFocus);
    this.currentElement = null;
  }

  getInputState(): InputState {
    return { ...this.inputState };
  }

  insertSuggestion(suggestion: AutocompleteSuggestion, addSpace = false) {
    if (!this.currentElement) return;
    const el = this.currentElement;
    try {
      const value = el.value;
      const before = value.slice(0, this.inputState.wordStart);
      const after = value.slice(this.inputState.wordEnd);
      const insert = suggestion.word + (addSpace ? " " : "");
      el.value = before + insert + after;
      const caret = (before + insert).length;
      // restore focus and caret
      el.focus();
      el.setSelectionRange(caret, caret);
      // Notify other listeners
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (e) {
      // noop
    }

    // hide menu
    this.inputState.isActive = false;
    this.inputState.suggestions = [];
    this.callbacks.onMenuHide?.();
  }

  // recompute input state (word, selection, position) from element
  private recomputeStateFromElement(
    el: HTMLInputElement | HTMLTextAreaElement
  ) {
    const caret = el.selectionStart ?? el.value.length;
    const upto = el.value.slice(0, caret);
    const match = upto.match(/([\w']+)$/);
    const word = match ? match[0] : "";
    const start = match ? caret - word.length : caret;

    const rect = el.getBoundingClientRect();
    const position = {
      x: rect.left + window.scrollX,
      y: rect.bottom + window.scrollY,
    };

    this.inputState = {
      ...this.inputState,
      currentWord: word,
      wordStart: start,
      wordEnd: caret,
      currentValue: el.value,
      caretPosition: caret,
      position,
    };
  }

  private handleInput = (e: Event) => {
    const el = e.target as HTMLInputElement | HTMLTextAreaElement;
    this.recomputeStateFromElement(el);

    if (this.inputState.currentWord.length >= this.settings.minWordLength) {
      this.inputState.isActive = true;
      // fetching suggestions is handled by the content script
    } else {
      this.inputState.isActive = false;
      this.inputState.suggestions = [];
      this.callbacks.onMenuHide?.();
    }
  };

  private handleBlur = () => {
    // Hide suggestions shortly after blur to allow clicks on the menu
    setTimeout(() => {
      this.inputState.isActive = false;
      this.inputState.suggestions = [];
      this.callbacks.onMenuHide?.();
    }, 150);
  };

  private handleFocus = (e?: Event) => {
    const el = (e?.target || this.currentElement) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    if (!el) return;
    this.recomputeStateFromElement(el);
    // content script will decide whether to fetch suggestions on focus
  };
}
