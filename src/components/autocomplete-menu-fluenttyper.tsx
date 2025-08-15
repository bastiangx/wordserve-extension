import * as React from "react";
import {
  InputHandler,
  type InputContext,
  type InputHandlerCallbacks,
} from "@/lib/input";
import {
  MenuRenderer,
  type SuggestionItem,
  type MenuRenderOptions,
} from "@/lib/render";
import { getWASMInstance } from "@/lib/wasm/ws-wasm";
import type { WordServeSettings, RawSuggestion } from "@/types";
import { AUTOCOMPLETE_DEFAULTS } from "@/types";

export interface AutocompleteMenuProps {
  element: HTMLElement;
  settings: WordServeSettings;
  isEnabled?: boolean;
  onSelectionMade?: (word: string, originalWord: string) => void;
  className?: string;
}

export interface AutocompleteMenuState {
  isVisible: boolean;
  suggestions: SuggestionItem[];
  selectedIndex: number;
  currentWord: string;
  hoveredIndex: number | null;
}

export class AutocompleteMenu {
  private element: HTMLElement;
  private settings: WordServeSettings;
  private inputHandler: InputHandler;
  private menuRenderer: MenuRenderer;
  private state: AutocompleteMenuState;
  private wasmInstance = getWASMInstance();
  private debounceTimer: number | null = null;
  private isEnabled: boolean;
  private onSelectionMade?: (word: string, originalWord: string) => void;

  constructor(props: AutocompleteMenuProps) {
    this.element = props.element;
    this.settings = props.settings;
    this.isEnabled = props.isEnabled ?? true;
    this.onSelectionMade = props.onSelectionMade;

    this.state = {
      isVisible: false,
      suggestions: [],
      selectedIndex: 0,
      currentWord: "",
      hoveredIndex: null,
    };

    this.menuRenderer = new MenuRenderer(this.settings);
    this.inputHandler = new InputHandler(
      this.element,
      this.settings,
      this.getInputCallbacks()
    );
  }

  private getInputCallbacks(): InputHandlerCallbacks {
    return {
      onWordChange: this.handleWordChange.bind(this),
      onHideMenu: this.hideMenu.bind(this),
      onNavigate: this.handleNavigate.bind(this),
      onSelect: this.handleSelect.bind(this),
      onSelectByNumber: this.handleSelectByNumber.bind(this),
    };
  }

  private async handleWordChange(context: InputContext): Promise<void> {
    if (!this.isEnabled) return;

    const { currentWord } = context;
    this.state.currentWord = currentWord;

    // Clear previous debounce
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Debounce the API call
    this.debounceTimer = window.setTimeout(async () => {
      await this.fetchSuggestions(currentWord);
    }, this.settings.debounceTime);
  }

  private async fetchSuggestions(word: string): Promise<void> {
    try {
      await this.wasmInstance.waitForReady();

      const rawSuggestions = await this.wasmInstance.complete(
        word.toLowerCase(),
        Math.min(this.settings.maxSuggestions, AUTOCOMPLETE_DEFAULTS.DEFAULT_VISIBLE_ITEMS)
      );

      const suggestions: SuggestionItem[] = rawSuggestions.map(
        (suggestion: RawSuggestion, index: number) => ({
          word: suggestion.word,
          rank: suggestion.rank,
          id: `${suggestion.word}-${index}`,
          description: undefined, // Could be extended later
        })
      );

      this.updateSuggestions(suggestions);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      this.updateSuggestions([]);
    }
  }

  private updateSuggestions(suggestions: SuggestionItem[]): void {
    this.state.suggestions = suggestions;
    this.state.selectedIndex = 0;
    this.state.hoveredIndex = null;

    if (suggestions.length > 0) {
      this.showMenu();
    } else {
      this.hideMenu();
    }
  }

  private showMenu(): void {
    if (!this.isEnabled || this.state.suggestions.length === 0) return;

    this.state.isVisible = true;
    this.inputHandler.setActive(true);

    // Position and render menu
    this.menuRenderer.positionMenu(this.element);
    this.renderMenu();
    this.menuRenderer.show();
  }

  private hideMenu(): void {
    this.state.isVisible = false;
    this.inputHandler.setActive(false);
    this.menuRenderer.hide();

    // Clear debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  private renderMenu(): void {
    if (!this.state.isVisible) return;

    const options: MenuRenderOptions = {
      suggestions: this.state.suggestions,
      selectedIndex: this.state.selectedIndex,
      settings: this.settings,
      onSelect: this.handleSuggestionSelect.bind(this),
      onMouseEnter: this.handleMouseEnter.bind(this),
      onMouseLeave: this.handleMouseLeave.bind(this),
    };

    this.menuRenderer.render(options);
  }

  private handleNavigate(direction: "up" | "down"): void {
    if (!this.state.isVisible || this.state.suggestions.length === 0) return;

    const maxIndex = this.state.suggestions.length - 1;
    let newIndex = this.state.selectedIndex;

    if (direction === "down") {
      newIndex = newIndex < maxIndex ? newIndex + 1 : 0;
    } else {
      newIndex = newIndex > 0 ? newIndex - 1 : maxIndex;
    }

    this.state.selectedIndex = newIndex;
    this.state.hoveredIndex = null;
    this.menuRenderer.updateSelectedIndex(newIndex);
  }

  private handleSelect(addSpace = false): void {
    if (!this.state.isVisible || this.state.suggestions.length === 0) return;

    const selectedSuggestion = this.state.suggestions[this.state.selectedIndex];
    if (selectedSuggestion) {
      this.handleSuggestionSelect(selectedSuggestion, addSpace);
    }
  }

  private handleSelectByNumber(index: number): void {
    if (!this.state.isVisible || index >= this.state.suggestions.length) return;

    const suggestion = this.state.suggestions[index];
    if (suggestion) {
      // Use settings to determine if space should be added
      const addSpace =
        this.settings.keyBindings.insertWithSpace.key !== "enter";
      this.handleSuggestionSelect(suggestion, addSpace);
    }
  }

  private handleSuggestionSelect(
    suggestion: SuggestionItem,
    addSpace = false
  ): void {
    const originalWord = this.state.currentWord;

    // Replace the current word with the selected suggestion
    this.inputHandler.replaceCurrentWord(suggestion.word, addSpace);

    // Notify callback if provided
    if (this.onSelectionMade) {
      this.onSelectionMade(suggestion.word, originalWord);
    }

    this.hideMenu();
  }

  private handleMouseEnter(index: number): void {
    this.state.hoveredIndex = index;
    this.state.selectedIndex = index;
    this.menuRenderer.updateSelectedIndex(index);
  }

  private handleMouseLeave(): void {
    this.state.hoveredIndex = null;
  }

  // Public API methods
  public updateSettings(newSettings: WordServeSettings): void {
    this.settings = newSettings;
    this.inputHandler.updateSettings(newSettings);
    this.menuRenderer.updateSettings(newSettings);
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.hideMenu();
    }
  }

  public isActive(): boolean {
    return this.state.isVisible;
  }

  public getCurrentWord(): string {
    return this.state.currentWord;
  }

  public getSuggestions(): SuggestionItem[] {
    return [...this.state.suggestions];
  }

  public getSelectedIndex(): number {
    return this.state.selectedIndex;
  }

  public hide(): void {
    this.hideMenu();
  }

  public destroy(): void {
    this.hideMenu();
    this.inputHandler.detach();
    this.menuRenderer.destroy();

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
}

// React Hook for easier integration
export function useAutocompleteMenu(
  elementRef: React.RefObject<
    HTMLElement | HTMLInputElement | HTMLTextAreaElement | HTMLDivElement
  >,
  settings: WordServeSettings,
  options?: {
    isEnabled?: boolean;
    onSelectionMade?: (word: string, originalWord: string) => void;
  }
) {
  const [menuInstance, setMenuInstance] =
    React.useState<AutocompleteMenu | null>(null);

  React.useEffect(() => {
    if (!elementRef.current) return;

    const menu = new AutocompleteMenu({
      element: elementRef.current as HTMLElement,
      settings,
      isEnabled: options?.isEnabled,
      onSelectionMade: options?.onSelectionMade,
    });

    setMenuInstance(menu);

    return () => {
      menu.destroy();
    };
  }, [elementRef.current]); // Only re-create if element changes

  // Update settings when they change
  React.useEffect(() => {
    if (menuInstance) {
      menuInstance.updateSettings(settings);
    }
  }, [menuInstance, settings]);

  // Update enabled state
  React.useEffect(() => {
    if (menuInstance && options?.isEnabled !== undefined) {
      menuInstance.setEnabled(options.isEnabled);
    }
  }, [menuInstance, options?.isEnabled]);

  return {
    menu: menuInstance,
    isActive: menuInstance?.isActive() ?? false,
    currentWord: menuInstance?.getCurrentWord() ?? "",
    suggestions: menuInstance?.getSuggestions() ?? [],
    selectedIndex: menuInstance?.getSelectedIndex() ?? 0,
    hide: () => menuInstance?.hide(),
  };
}
