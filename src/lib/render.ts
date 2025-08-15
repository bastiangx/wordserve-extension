import type { WordServeSettings } from "@/types";
import { AUTOCOMPLETE_DEFAULTS } from "@/types";

export interface MenuPosition {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  maxHeight: number;
  maxWidth: number;
  position: "absolute" | "fixed";
}

export interface MenuDimensions {
  width: number;
  height: number;
}

export interface SuggestionItem {
  word: string;
  rank: number;
  id: string;
  description?: string;
}

export interface MenuRenderOptions {
  suggestions: SuggestionItem[];
  selectedIndex: number;
  settings: WordServeSettings;
  onSelect: (suggestion: SuggestionItem, addSpace?: boolean) => void;
  onMouseEnter: (index: number) => void;
  onMouseLeave: () => void;
}

export class MenuRenderer {
  private container: HTMLElement | null = null;
  private menu: HTMLElement | null = null;
  private settings: WordServeSettings;
  private isVisible = false;

  constructor(settings: WordServeSettings) {
    this.settings = settings;
    this.createMenuContainer();
  }

  private createMenuContainer(): void {
    // Create container element
    this.container = document.createElement("div");
    this.container.className = "wordserve-menu-container";
    this.container.style.cssText = `
      position: fixed;
      z-index: 999999;
      display: none;
      pointer-events: none;
    `;

    // Apply theme classes based on settings
    if (this.settings.themeMode === "isolated") {
      this.container.classList.add("wordserve-menu-isolated");
    } else {
      this.container.classList.add("wordserve-menu-adaptive");
    }

    document.body.appendChild(this.container);
  }

  private createMenu(): HTMLElement {
    const menu = document.createElement("ul");
    menu.className = "wordserve-menu";
    
    // Apply base styles using CSS custom properties for theming
    menu.style.cssText = `
      margin: 0;
      padding: 0;
      list-style: none;
      background: hsl(var(--popover));
      color: hsl(var(--popover-foreground));
      border: ${this.settings.menuBorder ? "1px solid hsl(var(--border))" : "none"};
      border-radius: ${this.settings.menuBorderRadius ? "var(--radius)" : "0"};
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
      overflow: hidden;
      font-size: ${this.settings.fontSize}px;
      font-weight: ${this.settings.fontWeight};
      font-family: ${this.settings.accessibility.customFontFamily || "inherit"};
      max-height: ${AUTOCOMPLETE_DEFAULTS.MAX_HEIGHT}px;
      overflow-y: auto;
      pointer-events: auto;
    `;

    // Apply accessibility settings
    if (this.settings.accessibility.customColor) {
      menu.style.color = this.settings.accessibility.customColor;
    }

    return menu;
  }

  public render(options: MenuRenderOptions): void {
    if (!this.container) return;

    // Clear previous menu
    if (this.menu) {
      this.menu.remove();
    }

    this.menu = this.createMenu();
    
    const maxVisibleItems = Math.min(
      options.suggestions.length,
      this.settings.maxSuggestions
    );

    const visibleSuggestions = options.suggestions.slice(0, maxVisibleItems);

    // Render suggestions
    visibleSuggestions.forEach((suggestion, index) => {
      const item = this.createMenuItem(suggestion, index, options);
      this.menu!.appendChild(item);
    });

    // Add scroll container if needed
    if (visibleSuggestions.length > 0) {
      this.container.appendChild(this.menu);
      this.scrollToSelected(options.selectedIndex);
    }
  }

  private createMenuItem(
    suggestion: SuggestionItem,
    index: number,
    options: MenuRenderOptions
  ): HTMLElement {
    const li = document.createElement("li");
    li.className = "wordserve-menu-item";
    li.setAttribute("data-index", index.toString());

    const isSelected = index === options.selectedIndex;
    
    // Base item styles
    li.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: ${options.settings.compactMode ? "4px 12px" : "8px 12px"};
      cursor: pointer;
      transition: background-color 0.15s ease, color 0.15s ease;
      background: ${isSelected ? "hsl(var(--interaction))" : "transparent"};
      color: ${isSelected ? "hsl(var(--interaction-foreground))" : "inherit"};
    `;

    // Handle hover states
    li.addEventListener("mouseenter", () => {
      if (!isSelected) {
        li.style.background = "hsl(var(--interaction))";
        li.style.color = "hsl(var(--interaction-foreground))";
      }
      options.onMouseEnter(index);
    });

    li.addEventListener("mouseleave", () => {
      if (!isSelected) {
        li.style.background = "transparent";
        li.style.color = "inherit";
      }
      options.onMouseLeave();
    });

    // Handle click
    li.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const addSpace = options.settings.keyBindings.insertWithSpace.key === "enter";
      options.onSelect(suggestion, addSpace);
    });

    // Create ranking badge if needed
    if (this.shouldShowRanking(options.settings) && options.settings.rankingPosition === "left") {
      const badge = this.createRankingBadge(suggestion, index, options.settings);
      li.appendChild(badge);
    }

    // Create main content container
    const content = document.createElement("div");
    content.className = "wordserve-menu-item-content";
    content.style.cssText = `
      flex: 1;
      min-width: 0;
      overflow: hidden;
    `;

    // Create word element
    const word = document.createElement("div");
    word.className = "wordserve-menu-item-word";
    word.style.cssText = `
      font-weight: ${options.settings.accessibility.boldSuffix ? "600" : "inherit"};
      text-transform: ${options.settings.accessibility.uppercaseSuggestions ? "uppercase" : "none"};
      color: ${options.settings.accessibility.customColor || "inherit"};
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;
    word.textContent = suggestion.word;
    content.appendChild(word);

    // Add description if available and not in compact mode
    if (suggestion.description && !options.settings.compactMode) {
      const description = document.createElement("div");
      description.className = "wordserve-menu-item-description";
      description.style.cssText = `
        font-size: 0.75em;
        color: hsl(var(--muted-foreground));
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-top: 2px;
      `;
      description.textContent = suggestion.description;
      content.appendChild(description);
    }

    li.appendChild(content);

    // Create ranking badge if needed (right side)
    if (this.shouldShowRanking(options.settings) && options.settings.rankingPosition === "right") {
      const badge = this.createRankingBadge(suggestion, index, options.settings);
      li.appendChild(badge);
    }

    return li;
  }

  private shouldShowRanking(settings: WordServeSettings): boolean {
    return settings.showRankingOverride || (!settings.compactMode && settings.numberSelection);
  }

  private createRankingBadge(
    suggestion: SuggestionItem,
    index: number,
    settings: WordServeSettings
  ): HTMLElement {
    const badge = document.createElement("div");
    badge.className = "wordserve-menu-item-badge";
    
    const rankingValue = settings.numberSelection && index < AUTOCOMPLETE_DEFAULTS.MAX_DIGIT_SELECTABLE 
      ? (index + 1).toString() 
      : suggestion.rank.toString();

    badge.style.cssText = `
      background: hsl(var(--secondary));
      color: hsl(var(--secondary-foreground));
      font-size: 0.75em;
      font-family: "Geist Mono", monospace;
      font-weight: ${settings.accessibility.boldSuffix ? "600" : "500"};
      padding: 2px 6px;
      border-radius: calc(var(--radius) - 2px);
      min-width: 1.5rem;
      height: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    `;

    badge.textContent = rankingValue;
    return badge;
  }

  public positionMenu(targetElement: HTMLElement, caretPosition?: { x: number; y: number }): void {
    if (!this.container || !this.menu) return;

    let coordinates: MenuPosition;

    if (caretPosition) {
      coordinates = this.calculatePositionFromCaret(caretPosition);
    } else {
      coordinates = this.calculatePositionFromElement(targetElement);
    }

    this.applyPosition(coordinates);
  }

  private calculatePositionFromElement(element: HTMLElement): MenuPosition {
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    const basePosition: MenuPosition = {
      top: rect.bottom + scrollTop + AUTOCOMPLETE_DEFAULTS.POSITION_OFFSET,
      left: rect.left + scrollLeft,
      maxHeight: AUTOCOMPLETE_DEFAULTS.MAX_HEIGHT,
      maxWidth: AUTOCOMPLETE_DEFAULTS.MAX_WIDTH,
      position: "absolute",
    };

    return this.adjustForViewport(basePosition);
  }

  private calculatePositionFromCaret(caretPosition: { x: number; y: number }): MenuPosition {
    const basePosition: MenuPosition = {
      top: caretPosition.y + AUTOCOMPLETE_DEFAULTS.POSITION_OFFSET + 16, // Offset below caret
      left: caretPosition.x,
      maxHeight: AUTOCOMPLETE_DEFAULTS.MAX_HEIGHT,
      maxWidth: AUTOCOMPLETE_DEFAULTS.MAX_WIDTH,
      position: "fixed",
    };

    return this.adjustForViewport(basePosition);
  }

  private adjustForViewport(position: MenuPosition): MenuPosition {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuDimensions = this.getMenuDimensions();

    const adjusted = { ...position };

    // Adjust horizontal position
    if (position.left !== undefined && position.left + menuDimensions.width > viewportWidth - 8) {
      adjusted.right = 8;
      adjusted.left = undefined;
    }

    // Adjust vertical position
    if (position.top !== undefined && position.top + menuDimensions.height > viewportHeight - 8) {
      // Try to position above
      if (position.position === "fixed") {
        adjusted.bottom = viewportHeight - position.top + 24;
        adjusted.top = undefined;
      } else {
        adjusted.top = Math.max(8, position.top - menuDimensions.height - 8);
      }
    }

    // Ensure maximum dimensions fit in viewport
    adjusted.maxHeight = Math.min(adjusted.maxHeight, viewportHeight - 16);
    adjusted.maxWidth = Math.min(adjusted.maxWidth, viewportWidth - 16);

    return adjusted;
  }

  private getMenuDimensions(): MenuDimensions {
    if (!this.menu) return { 
      width: AUTOCOMPLETE_DEFAULTS.MIN_WIDTH, 
      height: AUTOCOMPLETE_DEFAULTS.MAX_HEIGHT 
    };

    // Temporarily make visible to measure
    const wasVisible = this.container!.style.display !== "none";
    if (!wasVisible) {
      this.container!.style.display = "block";
      this.container!.style.visibility = "hidden";
      this.container!.style.position = "fixed";
      this.container!.style.top = "0";
      this.container!.style.left = "0";
    }

    const rect = this.menu.getBoundingClientRect();
    const dimensions = {
      width: rect.width || AUTOCOMPLETE_DEFAULTS.MIN_WIDTH,
      height: rect.height || AUTOCOMPLETE_DEFAULTS.MAX_HEIGHT,
    };

    if (!wasVisible) {
      this.container!.style.display = "none";
      this.container!.style.visibility = "";
    }

    return dimensions;
  }

  private applyPosition(position: MenuPosition): void {
    if (!this.container) return;

    this.container.style.position = position.position;
    this.container.style.zIndex = "999999";

    if (position.top !== undefined) {
      this.container.style.top = `${position.top}px`;
      this.container.style.bottom = "";
    } else if (position.bottom !== undefined) {
      this.container.style.bottom = `${position.bottom}px`;
      this.container.style.top = "";
    }

    if (position.left !== undefined) {
      this.container.style.left = `${position.left}px`;
      this.container.style.right = "";
    } else if (position.right !== undefined) {
      this.container.style.right = `${position.right}px`;
      this.container.style.left = "";
    }

    if (this.menu) {
      this.menu.style.maxHeight = `${position.maxHeight}px`;
      this.menu.style.maxWidth = `${position.maxWidth}px`;
    }
  }

  public scrollToSelected(selectedIndex: number): void {
    if (!this.menu) return;

    const items = this.menu.querySelectorAll(".wordserve-menu-item");
    const selectedItem = items[selectedIndex] as HTMLElement;

    if (selectedItem) {
      const menuRect = this.menu.getBoundingClientRect();
      const itemRect = selectedItem.getBoundingClientRect();

      if (itemRect.bottom > menuRect.bottom) {
        this.menu.scrollTop += itemRect.bottom - menuRect.bottom;
      } else if (itemRect.top < menuRect.top) {
        this.menu.scrollTop -= menuRect.top - itemRect.top;
      }
    }
  }

  public show(): void {
    if (this.container) {
      this.container.style.display = "block";
      this.isVisible = true;
    }
  }

  public hide(): void {
    if (this.container) {
      this.container.style.display = "none";
      this.isVisible = false;
    }
  }

  public isShown(): boolean {
    return this.isVisible;
  }

  public updateSelectedIndex(newIndex: number): void {
    if (!this.menu) return;

    const items = this.menu.querySelectorAll(".wordserve-menu-item");
    
    items.forEach((item, index) => {
      const htmlItem = item as HTMLElement;
      const isSelected = index === newIndex;
      
      htmlItem.style.background = isSelected ? "hsl(var(--interaction))" : "transparent";
      htmlItem.style.color = isSelected ? "hsl(var(--interaction-foreground))" : "inherit";
    });

    this.scrollToSelected(newIndex);
  }

  public updateSettings(settings: WordServeSettings): void {
    this.settings = settings;
    
    if (this.container) {
      // Update theme classes
      this.container.classList.remove("wordserve-menu-isolated", "wordserve-menu-adaptive");
      if (settings.themeMode === "isolated") {
        this.container.classList.add("wordserve-menu-isolated");
      } else {
        this.container.classList.add("wordserve-menu-adaptive");
      }
    }
  }

  public destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
      this.menu = null;
    }
  }
}
