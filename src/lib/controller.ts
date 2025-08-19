import { AutocompleteMenuRenderer, type Suggestion } from "@/lib/render";
import {
  InputHandler,
  type InputContext,
  type InputHandlerCallbacks,
} from "@/lib/input";
import { calculateMenuPosition } from "@/lib/caret";
import { smartBackspace } from "@/lib/backspace";
import type { WordServeSettings, RawSuggestion } from "@/types";
import { browser } from "wxt/browser";

export interface AutocompleteControllerOptions {
  element: HTMLElement;
  settings: WordServeSettings;
  onSelectionMade?: (word: string, originalWord: string) => void;
  onSelectionChanged?: () => void;
}

export class AutocompleteController {
  private element: HTMLElement;
  private settings: WordServeSettings;
  private inputHandler: InputHandler;
  private menuRenderer: AutocompleteMenuRenderer;
  private isVisible = false;
  private suggestions: Suggestion[] = [];
  private selectedIndex = 0;
  private currentWord = "";
  private debounceTimer: number | null = null;
  private onSelectionMade?: (word: string, originalWord: string) => void;
  private onSelectionChanged?: () => void;
  private keyboardNavigationActive = false;

  constructor(options: AutocompleteControllerOptions) {
    console.log(
      "WordServe: Creating controller for element:",
      options.element.tagName
    );
    this.element = options.element;
    this.settings = options.settings;
    this.onSelectionMade = options.onSelectionMade;
    this.onSelectionChanged = options.onSelectionChanged;

    this.inputHandler = new InputHandler(
      this.element,
      this.settings,
      this.createCallbacks()
    );

    this.menuRenderer = new AutocompleteMenuRenderer();
    console.log("WordServe: Controller created successfully");
  }

  private createCallbacks(): InputHandlerCallbacks {
    return {
      onWordChange: this.handleWordChange.bind(this),
      onHideMenu: this.hideMenu.bind(this),
      onNavigate: this.handleNavigation.bind(this),
      onSelect: this.handleSelection.bind(this),
      onSelectByNumber: this.handleNumberSelection.bind(this),
      onBackspace: this.handleBackspace.bind(this),
    };
  }

  private async handleWordChange(context: InputContext): Promise<void> {
    console.log(
      "WordServe: handleWordChange called with:",
      context.currentWord
    );
    this.currentWord = context.currentWord;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(async () => {
      try {
        console.log(
          "WordServe: Fetching suggestions for:",
          context.currentWord
        );
        const suggestions = await this.fetchSuggestions(context.currentWord);
        console.log("WordServe: Got suggestions:", suggestions);
        this.showSuggestions(suggestions, context);
      } catch (error) {
        console.error("Failed to fetch suggestions:", error);
        this.hideMenu();
      }
    }, this.settings.debounceTime) as any;
  }

  private async fetchSuggestions(word: string): Promise<Suggestion[]> {
    console.log(
      "WordServe: fetchSuggestions called with:",
      word,
      "minLength:",
      this.settings.minWordLength
    );
    if (word.length < this.settings.minWordLength) {
      console.log("WordServe: Word too short, returning empty suggestions");
      return [];
    }
    try {
      console.log("WordServe: Calling background service for completion");
      const response = await browser.runtime.sendMessage({
        type: "wordserve-complete",
        prefix: word,
        limit: this.settings.maxSuggestions,
      });
      if (response?.error) {
        console.error("WordServe: Background service error:", response.error);
        return [];
      }
      const rawSuggestions = response?.suggestions || [];
      console.log(
        "WordServe: Raw suggestions from background:",
        rawSuggestions
      );
      const suggestions = rawSuggestions.map(
        (raw: RawSuggestion, index: number) => ({
          word: raw.word,
          rank: raw.rank,
          id: `${raw.word}-${index}`,
        })
      );
      console.log("WordServe: Converted suggestions:", suggestions);
      return suggestions;
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
      return [];
    }
  }

  private showSuggestions(
    suggestions: Suggestion[],
    context: InputContext
  ): void {
    console.log(
      "WordServe: showSuggestions called with:",
      suggestions.length,
      "suggestions"
    );
    if (suggestions.length === 0) {
      console.log("WordServe: No suggestions, hiding menu");
      this.hideMenu();
      return;
    }
    this.suggestions = suggestions;
    this.selectedIndex = 0;
    this.isVisible = true;
    this.keyboardNavigationActive = false;
    this.inputHandler.setMenuVisible(true);
    const menuSize = {
      width: 300,
      height: Math.min(suggestions.length * 32 + 16, 200),
    };
    const position = calculateMenuPosition(context.caretCoords, menuSize);
    this.renderMenu(position);
    if (this.onSelectionChanged) {
      this.onSelectionChanged();
    }
  }

  private renderMenu(position: { x: number; y: number }): void {
    console.log(
      "WordServe: renderMenu called with position:",
      position,
      "suggestions:",
      this.suggestions.length
    );
    this.menuRenderer.render({
      suggestions: this.suggestions,
      selectedIndex: this.selectedIndex,
      onSelect: this.handleMenuSelect.bind(this),
      onHover: this.handleMenuHover.bind(this),
      position: position,
      visible: this.isVisible,
      maxItems: this.settings.maxSuggestions,
      compact: this.settings.compactMode,
    });
    console.log("WordServe: Menu render called");
  }

  private handleMenuSelect(
    suggestion: Suggestion,
    addSpace: boolean = false
  ): void {
    this.insertSuggestion(suggestion.word, addSpace);
    this.hideMenu();
  }

  private handleMenuHover(index: number): void {
    if (!this.keyboardNavigationActive && this.selectedIndex !== index) {
      this.selectedIndex = index;
      this.renderMenuWithCurrentPosition();
      if (this.onSelectionChanged) {
        this.onSelectionChanged();
      }
    }
  }

  private renderMenuWithCurrentPosition(): void {
    if (!this.isVisible) return;
    const menuSize = {
      width: 300,
      height: Math.min(this.suggestions.length * 32 + 16, 200),
    };
    const context = this.inputHandler.getCurrentContext();
    if (context) {
      const position = calculateMenuPosition(context.caretCoords, menuSize);
      this.renderMenu(position);
    }
  }

  private handleNavigation(direction: "up" | "down"): void {
    if (!this.isVisible || this.suggestions.length === 0) return;
    this.keyboardNavigationActive = true;
    if (direction === "down") {
      this.selectedIndex = (this.selectedIndex + 1) % this.suggestions.length;
    } else {
      this.selectedIndex =
        this.selectedIndex === 0
          ? this.suggestions.length - 1
          : this.selectedIndex - 1;
    }
    this.renderMenuWithCurrentPosition();
    if (this.onSelectionChanged) {
      this.onSelectionChanged();
    }
    setTimeout(() => {
      this.keyboardNavigationActive = false;
    }, 200);
  }

  private handleSelection(addSpace: boolean = false): void {
    if (!this.isVisible || this.suggestions.length === 0) return;
    const selectedSuggestion = this.suggestions[this.selectedIndex];
    if (selectedSuggestion) {
      this.insertSuggestion(selectedSuggestion.word, addSpace);
      this.hideMenu();
    }
  }

  private handleNumberSelection(index: number): void {
    console.log(
      "WordServe: Number selection for index:",
      index,
      "visible:",
      this.isVisible,
      "suggestions:",
      this.suggestions.length
    );
    if (!this.isVisible || this.suggestions.length === 0) return;
    if (index >= 0 && index < this.suggestions.length) {
      const suggestion = this.suggestions[index];
      this.insertSuggestion(suggestion.word, true);
      this.hideMenu();
    }
  }

  private handleBackspace(context: InputContext, event: any): void {
    console.log(
      "WordServe handleBackspace - checking at current position:",
      context.caretPosition
    );
    const state = smartBackspace.canRestore(
      context.element,
      context.caretPosition
    );
    if (state) {
      console.log(
        "WordServe handleBackspace - preventing default, restoring:",
        state
      );
      event.preventDefault();
      event.stopPropagation();
      smartBackspace.restore(context.element, state);
      return;
    }
    this.hideMenu();
  }

  private insertSuggestion(word: string, addSpace: boolean): void {
    const context = this.inputHandler.getCurrentContext();
    if (!context) return;
    const { element, wordStart, wordEnd, currentValue } = context;
    const beforeWord = currentValue.substring(0, wordStart);
    const afterWord = currentValue.substring(wordEnd);
    const newValue = beforeWord + word + (addSpace ? " " : "") + afterWord;
    if (this.settings.smartBackspace) {
      const commitPosition = wordStart + word.length;
      smartBackspace.recordCommit(
        element,
        word,
        this.currentWord,
        commitPosition
      );
    }
    if (element.nodeName === "INPUT" || element.nodeName === "TEXTAREA") {
      const input = element as HTMLInputElement | HTMLTextAreaElement;
      input.value = newValue;
      const newCursorPos = wordStart + word.length + (addSpace ? 1 : 0);
      input.setSelectionRange(newCursorPos, newCursorPos);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const textNode = this.findTextNodeAtPosition(element, wordStart);
        if (textNode) {
          const nodeOffset =
            wordStart - this.getTextNodeOffset(element, textNode);
          const wordEndInNode = nodeOffset + (wordEnd - wordStart);
          const nodeText = textNode.textContent || "";
          const newText =
            nodeText.substring(0, nodeOffset) +
            word +
            (addSpace ? " " : "") +
            nodeText.substring(wordEndInNode);
          textNode.textContent = newText;
          const newCursorPos = nodeOffset + word.length + (addSpace ? 1 : 0);
          range.setStart(textNode, newCursorPos);
          range.setEnd(textNode, newCursorPos);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }
    if (this.onSelectionMade) {
      this.onSelectionMade(word, this.currentWord);
    }
  }

  private findTextNodeAtPosition(
    element: HTMLElement,
    position: number
  ): Text | null {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );
    let currentPos = 0;
    let node: Text | null = null;
    while ((node = walker.nextNode() as Text)) {
      const nodeLength = node.textContent?.length || 0;
      if (currentPos + nodeLength > position) {
        return node;
      }
      currentPos += nodeLength;
    }
    return null;
  }

  private getTextNodeOffset(element: HTMLElement, targetNode: Text): number {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );
    let offset = 0;
    let node: Text | null = null;
    while ((node = walker.nextNode() as Text)) {
      if (node === targetNode) {
        return offset;
      }
      offset += node.textContent?.length || 0;
    }
    return offset;
  }

  private hideMenu(): void {
    this.isVisible = false;
    this.suggestions = [];
    this.selectedIndex = 0;
    this.inputHandler.setMenuVisible(false);
    this.menuRenderer.hide();
  }

  public destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.inputHandler.detach();
    this.menuRenderer.destroy();
  }

  public updateSettings(settings: Partial<WordServeSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.inputHandler.updateSettings(this.settings);
    this.hideMenu();
  }

  public enable(): void {
    this.inputHandler.enable();
  }

  public disable(): void {
    this.inputHandler.disable();
    this.hideMenu();
  }

  public getCurrentSuggestions(): Suggestion[] {
    return this.suggestions;
  }

  public getSelectedIndex(): number {
    return this.selectedIndex;
  }

  public getCurrentWord(): string {
    return this.currentWord;
  }

  public isMenuVisible(): boolean {
    return this.isVisible;
  }
}
