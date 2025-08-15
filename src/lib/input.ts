import type { WordServeSettings, InputState } from "@/types";
import type { AutocompleteSuggestion } from "@/lib/handle";
import { AUTOCOMPLETE_DEFAULTS } from "@/types";

type Callbacks = {
  onSuggestionsRequested?: (
    suggestions: AutocompleteSuggestion[],
    element: HTMLInputElement | HTMLTextAreaElement
  ) => void;
  onMenuHide?: () => void;
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  onNavigatePageUp?: () => void;
  onNavigatePageDown?: () => void;
  onNavigateHome?: () => void;
  onNavigateEnd?: () => void;
  onSelectCurrent?: () => void;
  onSelectByNumber?: (number: number) => void;
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
    el.addEventListener("keydown", this.handleKeyDown);
    this.recomputeStateFromElement(el);
  }

  detachFromElement() {
    if (!this.currentElement) return;
    this.currentElement.removeEventListener("input", this.handleInput);
    this.currentElement.removeEventListener("blur", this.handleBlur);
    this.currentElement.removeEventListener("focus", this.handleFocus);
    this.currentElement.removeEventListener("keydown", this.handleKeyDown);
    this.currentElement = null;
  }

  getInputState(): InputState {
    return { ...this.inputState };
  }

  updateSuggestions(suggestions: AutocompleteSuggestion[]) {
    // Convert AutocompleteSuggestion to the simpler type used in InputState
    this.inputState.suggestions = suggestions.map((s) => ({
      word: s.word,
      rank: s.rank,
    }));
    this.inputState.selectedIndex = 0;
    this.inputState.isActive = suggestions.length > 0;
  }

  getSelectedIndex(): number {
    return this.inputState.selectedIndex;
  }

  getCurrentSuggestion(): { word: string; rank: number } | null {
    if (this.inputState.suggestions.length === 0) return null;
    return this.inputState.suggestions[this.inputState.selectedIndex] || null;
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

  private handleKeyDown = (e: Event) => {
    const keyEvent = e as KeyboardEvent;
    // Only handle keys when menu is active and has suggestions
    if (!this.inputState.isActive || this.inputState.suggestions.length === 0) {
      return;
    }

    const totalItems = this.inputState.suggestions.length;

    switch (keyEvent.key) {
      case "ArrowDown":
        keyEvent.preventDefault();
        this.inputState.selectedIndex =
          this.inputState.selectedIndex < totalItems - 1
            ? this.inputState.selectedIndex + 1
            : 0;
        this.callbacks.onNavigateDown?.();
        break;

      case "ArrowUp":
        keyEvent.preventDefault();
        this.inputState.selectedIndex =
          this.inputState.selectedIndex > 0
            ? this.inputState.selectedIndex - 1
            : totalItems - 1;
        this.callbacks.onNavigateUp?.();
        break;

      case "Enter":
      case "Tab":
        keyEvent.preventDefault();
        this.callbacks.onSelectCurrent?.();
        break;

      case "Escape":
        keyEvent.preventDefault();
        this.inputState.isActive = false;
        this.inputState.suggestions = [];
        this.callbacks.onMenuHide?.();
        break;

      case "PageDown":
        keyEvent.preventDefault();
        this.inputState.selectedIndex = Math.min(
          this.inputState.selectedIndex +
            AUTOCOMPLETE_DEFAULTS.DEFAULT_VISIBLE_ITEMS,
          totalItems - 1
        );
        this.callbacks.onNavigatePageDown?.();
        break;

      case "PageUp":
        keyEvent.preventDefault();
        this.inputState.selectedIndex = Math.max(
          this.inputState.selectedIndex -
            AUTOCOMPLETE_DEFAULTS.DEFAULT_VISIBLE_ITEMS,
          0
        );
        this.callbacks.onNavigatePageUp?.();
        break;

      case "Home":
        keyEvent.preventDefault();
        this.inputState.selectedIndex = 0;
        this.callbacks.onNavigateHome?.();
        break;

      case "End":
        keyEvent.preventDefault();
        this.inputState.selectedIndex = totalItems - 1;
        this.callbacks.onNavigateEnd?.();
        break;

      default:
        // Handle digit key selection (1-9)
        if (this.settings?.numberSelection) {
          const digit = Number.parseInt(keyEvent.key);
          if (
            digit >= 1 &&
            digit <= AUTOCOMPLETE_DEFAULTS.MAX_DIGIT_SELECTABLE &&
            digit <= totalItems
          ) {
            keyEvent.preventDefault();
            this.callbacks.onSelectByNumber?.(digit - 1);
          }
        }
        break;
    }
  };
}
