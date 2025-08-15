import type { WordServeSettings, InputState } from "@/types";
import type { AutocompleteSuggestion } from "@/components/ws-menu";

type Callbacks = {
  onSuggestionsRequested?: (
    suggestions: AutocompleteSuggestion[],
    element: HTMLInputElement | HTMLTextAreaElement
  ) => void;
  onMenuHide?: () => void;
};

// Lightweight stub implementation to satisfy type-checking and the content script manager.
// This does not implement the full suggestion logic (WASM, parsing) — it's a minimal
// scaffold that other modules can call until a full implementation is restored.
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
    // Minimal event wiring to keep behavior predictable; real implementation will be richer
    el.addEventListener("input", this.handleInput);
    el.addEventListener("blur", this.handleBlur);
    el.addEventListener("focus", this.handleFocus);
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
    // Minimal insertion logic: replace current value at caret with suggestion.word
    if (!this.currentElement) return;
    const el = this.currentElement;
    try {
      const value = el.value;
      const before = value.slice(0, this.inputState.wordStart);
      const after = value.slice(this.inputState.wordEnd);
      const insert = suggestion.word + (addSpace ? " " : "");
      el.value = before + insert + after;
      const caret = (before + insert).length;
      el.setSelectionRange(caret, caret);
      // Trigger input event so React and other listeners update
      el.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (e) {
      // noop
    }
    // Hide menu after insertion
    this.inputState.isActive = false;
    this.inputState.suggestions = [];
    this.callbacks.onMenuHide?.();
  }

  // Basic handlers to update internal state and call callbacks.
  private handleInput = (e: Event) => {
    const el = e.target as HTMLInputElement | HTMLTextAreaElement;
    const caret = el.selectionStart ?? el.value.length;
    // naive word extraction
    const upto = el.value.slice(0, caret);
    const match = upto.match(/([\w']+)$/);
    const word = match ? match[0] : "";
    const start = match ? caret - word.length : caret;
    this.inputState = {
      ...this.inputState,
      currentWord: word,
      wordStart: start,
      wordEnd: caret,
      currentValue: el.value,
      caretPosition: caret,
    };

    // For the stub we won't compute real suggestions; call onSuggestionsRequested with empty list
    if (this.inputState.currentWord.length >= this.settings.minWordLength) {
      this.inputState.isActive = true;
      this.inputState.suggestions = [];
      this.callbacks.onSuggestionsRequested?.(
        this.inputState.suggestions.map(
          (s, i) => ({ id: `s-${i}`, word: s.word, rank: s.rank } as any)
        ),
        el
      );
    } else {
      this.inputState.isActive = false;
      this.inputState.suggestions = [];
      this.callbacks.onMenuHide?.();
    }
  };

  private handleBlur = () => {
    // Hide suggestions shortly after blur
    setTimeout(() => {
      this.inputState.isActive = false;
      this.inputState.suggestions = [];
      this.callbacks.onMenuHide?.();
    }, 150);
  };

  private handleFocus = () => {
    // no-op for stub
  };
}
