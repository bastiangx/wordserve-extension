import "@/components/styles.css";

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
  enableBlur?: boolean;
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

    // Create or reuse menu
    if (!this.menu) {
      console.log("WordServe: Creating new menu");
      this.menu = this.createMenu();
      this.container!.appendChild(this.menu);
      
      // Debug: Add click listeners to containers
      this.container!.addEventListener("click", (e) => {
        console.log("WordServe: Container clicked, target:", e.target);
      });
      
      this.menu.addEventListener("click", (e) => {
        console.log("WordServe: Menu clicked, target:", e.target);
      });
    }

    // Update container classes
    this.container!.className = `wordserve-menu-container ${
      options.compact ? "compact" : ""
    } ${options.enableBlur ? "blur-enabled" : ""}`;

    // Position the container
    this.container!.style.left = `${options.position.x}px`;
    this.container!.style.top = `${options.position.y}px`;
    this.container!.style.display = "block";
    console.log("WordServe: Positioned container at:", options.position);

    // Set menu max height
    if (options.maxHeight) {
      this.menu.style.maxHeight = `${options.maxHeight}px`;
    }

    // Clear existing items
    this.menu.innerHTML = "";

    // Limit suggestions for digit key navigation
    const displaySuggestions = options.suggestions.slice(
      0,
      options.maxItems || 9
    );

    console.log("WordServe: Creating", displaySuggestions.length, "menu items");

    // Create menu items
    displaySuggestions.forEach((suggestion, index) => {
      const item = this.createMenuItem(suggestion, index, options);
      this.menu!.appendChild(item);
    });

    // Scroll to selected item
    this.scrollToSelected(options.selectedIndex);

    this.isVisible = true;
    console.log("WordServe: Menu should now be visible");
  }

  private createMenuItem(
    suggestion: Suggestion,
    index: number,
    options: AutocompleteMenuOptions
  ): HTMLElement {
    const isSelected = index === options.selectedIndex;
    const showRanking = index < 9; // Only show ranking for first 9 items

    const item = document.createElement("div");
    item.className = `wordserve-menu-item ${isSelected ? "selected" : ""}`;

    // Content container
    const content = document.createElement("div");
    content.className = "wordserve-menu-item-content";

    // Word
    const word = document.createElement("span");
    word.className = "wordserve-menu-item-word";
    word.textContent = suggestion.word;
    content.appendChild(word);

    item.appendChild(content);

    // Rank badge - only for first 9 items
    if (showRanking) {
      const rank = document.createElement("span");
      rank.className = "wordserve-menu-item-rank";
      rank.textContent = suggestion.rank.toString();
      item.appendChild(rank);
    }

    // Event listeners
    item.addEventListener("click", (e) => {
      console.log("WordServe: Click event triggered on item:", suggestion.word);
      e.preventDefault();
      e.stopPropagation();
      console.log("WordServe: About to call onSelect with:", suggestion);
      options.onSelect(suggestion, true);
      console.log("WordServe: onSelect called successfully");
    }, { capture: true });

    item.addEventListener("mouseenter", () => {
      options.onHover(index);
    });

    return item;
  }

  private scrollToSelected(selectedIndex: number): void {
    if (!this.menu) return;

    const selectedItem = this.menu.children[selectedIndex] as HTMLElement;
    if (!selectedItem) return;

    const menuRect = this.menu.getBoundingClientRect();
    const itemRect = selectedItem.getBoundingClientRect();

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
