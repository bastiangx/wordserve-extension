import "@/components/styles.css";
import { getRowHeight } from "@/lib/utils";
import { AUTOCOMPLETE_DEFAULTS } from "@/types";

export interface Suggestion {
  word: string;
  rank: number;
  id: string;
}

export interface AutocompleteMenuOptions {
  suggestions: Suggestion[];
  selectedIndex: number;
  onSelect: (suggestion: Suggestion, addSpace?: boolean) => void;
  onHover: (index: number) => void;
  position: { x: number; y: number };
  visible: boolean;
  maxHeight?: number;
  maxItems?: number;
  compact?: boolean;
  fontSize?: number;
  fontWeight?: string;
  menuBorder?: boolean;
  menuBorderRadius?: boolean;
  // ranking and digit-selection settings
  numberSelection?: boolean;
  showRankingOverride?: boolean;
  rankingPosition?: "left" | "right";
}

export class AutocompleteMenuRenderer {
  private container: HTMLElement | null = null;
  private menu: HTMLElement | null = null;
  private isVisible = false;

  constructor() {
    this.createContainer();
  }

  private createContainer(): void {
    this.container = document.createElement("div");
    this.container.className = "wordserve-menu-container";
    document.body.appendChild(this.container);
  }

  private createMenu(): HTMLElement {
    const menu = document.createElement("div");
    menu.className = "wordserve-autocomplete-menu";
    return menu;
  }

  public render(options: AutocompleteMenuOptions): void {
    console.log("WordServe: Renderer render called with:", options);
    if (!this.container) {
      console.log("WordServe: No container, creating one");
      this.createContainer();
    }

    if (!options.visible || options.suggestions.length === 0) {
      console.log("WordServe: Not visible or no suggestions, hiding");
      this.hide();
      return;
    }
    if (!this.menu) {
      this.menu = this.createMenu();
      this.container!.appendChild(this.menu);
    }
    this.container!.className = `wordserve-menu-container ${
      options.compact ? "compact" : ""
    }`;
    const fontSize = options.fontSize ?? 14;
    const fontWeight = options.fontWeight ?? "400";
    const showBorder = options.menuBorder ?? true;
    const useRadius = options.menuBorderRadius ?? true;
    const menuEl = this.menu!;
    menuEl.style.fontSize = `${fontSize}px`;
    menuEl.style.fontWeight = fontWeight;
    menuEl.style.borderColor = showBorder ? "#403d52" : "transparent";
    menuEl.style.borderRadius = useRadius ? "6px" : "0px";
    this.container!.style.left = `${options.position.x}px`;
    this.container!.style.top = `${options.position.y}px`;
    this.container!.style.display = "block";
    if (options.maxHeight) {
      this.menu.style.maxHeight = `${options.maxHeight}px`;
    }
    this.menu.innerHTML = "";
    const displaySuggestions = options.suggestions.slice(
      0,
      options.maxItems || 9
    );
    displaySuggestions.forEach((suggestion, index) => {
      const item = this.createMenuItem(suggestion, index, options);
      this.menu!.appendChild(item);
    });
    this.scrollToSelected(options.selectedIndex);
    this.isVisible = true;
  }

  private createMenuItem(
    suggestion: Suggestion,
    index: number,
    options: AutocompleteMenuOptions
  ): HTMLElement {
    const isSelected = index === options.selectedIndex;
    const showRanking =
      !!options.showRankingOverride ||
      (options.numberSelection &&
        index < AUTOCOMPLETE_DEFAULTS.MAX_DIGIT_SELECTABLE);

  const item = document.createElement("div");
    item.className = `wordserve-menu-item ${isSelected ? "selected" : ""} ${
      options.rankingPosition === "right" ? "justify-between" : ""
    }`;
    // remove left padding when badge on left to align content
    if (options.rankingPosition === "left") {
      item.style.paddingLeft = "0px";
    }
    const fontSize = options.fontSize ?? 14;
    const compact = options.compact ?? false;
    const rowHeight = getRowHeight(fontSize, compact);
    item.style.height = `${rowHeight}px`;
    const content = document.createElement("div");
    content.className = "wordserve-menu-item-content";
    const badgeEl = document.createElement("span");
    badgeEl.className = "wordserve-menu-item-rank";
    badgeEl.textContent = suggestion.rank.toString();
    if (options.rankingPosition === "left" && showRanking) {
      content.appendChild(badgeEl);
    }
    const wordEl = document.createElement("span");
    wordEl.className = "wordserve-menu-item-word";
    wordEl.textContent = suggestion.word;
    wordEl.style.fontWeight = options.fontWeight || "400";
    content.appendChild(wordEl);
    item.appendChild(content);
    if (options.rankingPosition === "right" && showRanking) {
      item.appendChild(badgeEl);
    }
    item.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        options.onSelect(suggestion, true);
      },
      { capture: true }
    );
    item.addEventListener("mouseenter", () => {
      options.onHover(index);
    });

    return item;
  }

  private scrollToSelected(selectedIndex: number): void {
    if (!this.menu) return;
    const selectedItem = this.menu.children[selectedIndex] as HTMLElement;
    const menuRect = this.menu.getBoundingClientRect();
    const itemRect = selectedItem.getBoundingClientRect();
    if (!selectedItem) return;
    if (itemRect.bottom > menuRect.bottom) {
      this.menu.scrollTop += itemRect.bottom - menuRect.bottom;
    } else if (itemRect.top < menuRect.top) {
      this.menu.scrollTop -= menuRect.top - itemRect.top;
    }
  }

  public hide(): void {
    if (this.container) {
      this.container.style.display = "none";
    }
    this.isVisible = false;
  }

  public destroy(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
      this.container = null;
      this.menu = null;
    }
    this.isVisible = false;
  }

  public isMenuVisible(): boolean {
    return this.isVisible;
  }
}
