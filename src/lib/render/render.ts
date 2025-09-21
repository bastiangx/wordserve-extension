import "@/components/styles.css";
import { getRowHeight } from "@/lib/utils";
import { AUTOCOMPLETE_DEFAULTS } from "@/types";
import { themeToClass } from "@/lib/render/themes";
import { ABBREVIATION_CONFIG } from "@/types";

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
  fontWeight?: number; // 100-900
  fontItalic?: boolean;
  fontBold?: boolean;
  fontFamily?: string;
  menuBorder?: boolean;
  menuBorderRadius?: boolean;
  numberSelection?: boolean;
  showRankingOverride?: boolean;
  rankingPosition?: "left" | "right";
  uppercaseSuggestions?: boolean;
  boldSuffix?: boolean;
  boldPrefix?: boolean;
  prefixColorIntensity?: "normal" | "muted" | "faint" | "accent";
  suffixColorIntensity?: "normal" | "muted" | "faint" | "accent";
  prefixColor?: string;
  suffixColor?: string;
  dyslexicFont?: boolean;
  rankingTextColor?: string;
  rankingBorderColor?: string;
  currentPrefixLength?: number;
  theme?: import("@/lib/render/themes").ThemeId;
  allowMouseInsert?: boolean;
  allowMouseInteractions?: boolean;
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
    if (!this.container) {
      this.createContainer();
    }

    if (!options.visible || options.suggestions.length === 0) {
      this.hide();
      return;
    }
    if (!this.menu) {
      this.menu = this.createMenu();
      this.container!.appendChild(this.menu);
    }
    const themeClass = themeToClass(options.theme ?? "dark");
    this.container!.className = `wordserve-menu-container ${themeClass} ${
      options.compact ? "compact" : ""
    }`;
  const fontSize = options.fontSize ?? 14;
  const baseWeight = typeof options.fontWeight === "number" ? options.fontWeight : 400;
  const effectiveWeight = options.fontBold ? Math.max(baseWeight, 700) : baseWeight;
  const fontWeight = String(effectiveWeight);
    const showBorder = options.menuBorder ?? true;
    const useRadius = options.menuBorderRadius ?? true;
    const menuEl = this.menu!;
    menuEl.style.fontSize = `${fontSize}px`;
  menuEl.style.fontWeight = fontWeight;
  menuEl.style.fontStyle = options.fontItalic ? "italic" : "normal";
    // Toggle full mouse disable class
    menuEl.classList.toggle(
      "ws-no-mouse",
      options.allowMouseInteractions === false
    );
    if (options.dyslexicFont) {
      const rest = options.fontFamily
        ? options.fontFamily
        : `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`;
      menuEl.style.fontFamily = `'OpenDyslexic', ${rest}`;
    } else {
      menuEl.style.fontFamily = options.fontFamily || "inherit";
    }
    menuEl.classList.toggle("no-border", !showBorder);
    menuEl.classList.toggle("no-radius", !useRadius);
    this.container!.style.left = `${options.position.x}px`;
    this.container!.style.top = `${options.position.y}px`;
    this.container!.style.display = "block";
    if (options.maxHeight) {
      this.menu.style.maxHeight = `${options.maxHeight}px`;
    }
    while (this.menu.firstChild) {
      this.menu.removeChild(this.menu.firstChild);
    }
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
    // Scale vertical padding with font size so small fonts produce tighter rows
    const sidePad = compact
      ? Math.max(2, Math.round(fontSize * 0.2))
      : Math.max(4, Math.round(fontSize * 0.3));
    item.style.height = `${rowHeight}px`;
    item.style.paddingTop = `${sidePad}px`;
    item.style.paddingBottom = `${sidePad}px`;
    const content = document.createElement("div");
    content.className = "wordserve-menu-item-content";
    // Scale gap between badge and word
    content.style.gap = compact
      ? `${Math.max(4, Math.round(fontSize * 0.35))}px`
      : `${Math.max(6, Math.round(fontSize * 0.5))}px`;
  const badgeEl = document.createElement("span");
    badgeEl.className = "wordserve-menu-item-rank";

    // Check if this is an abbreviation hint (special badge)
    if (
      suggestion.rank === (ABBREVIATION_CONFIG.SPACE_BADGE as unknown as number)
    ) {
      // Simple text badge instead of icon
      badgeEl.textContent = "abbrv";
      badgeEl.style.fontSize = "10px";
      badgeEl.style.fontWeight = "500";
    } else {
      // For normal suggestions, show the menu position (1-based)
  badgeEl.textContent = (index + 1).toString();
      // Scale badge typography and padding with font size
      const badgeFont = Math.max(10, Math.round(fontSize - 2));
      const badgePadY = Math.max(1, Math.round(fontSize * 0.12));
      const badgePadX = Math.max(4, Math.round(fontSize * 0.4));
      badgeEl.style.fontSize = `${badgeFont}px`;
      badgeEl.style.padding = `${badgePadY}px ${badgePadX}px`;
    }
    if (options.rankingTextColor) {
      badgeEl.style.color = options.rankingTextColor;
    }
    if (options.rankingBorderColor) {
      badgeEl.style.borderColor = options.rankingBorderColor;
    }
    if (options.rankingPosition === "left" && showRanking) {
      content.appendChild(badgeEl);
    }
    // Build a prefix/suffix split for styling
    const wordEl = document.createElement("span");
    wordEl.className = "wordserve-menu-item-word";
    const wordText = options.uppercaseSuggestions
      ? suggestion.word.toUpperCase()
      : suggestion.word;
    // prefix length equals the current typed word length
    const prefixLen = Math.max(0, options.currentPrefixLength ?? 0);
    // When prefix length unknown, default to 0 so whole word is suffix
    const display = wordText;
    const pre = display.slice(0, prefixLen);
    const suf = display.slice(prefixLen);
    const preSpan = document.createElement("span");
    preSpan.textContent = pre;
    if (options.boldPrefix) preSpan.style.fontWeight = "700";
    const sufSpan = document.createElement("span");
    sufSpan.textContent = suf;
    if (options.boldSuffix) sufSpan.style.fontWeight = "700";
    // color intensities
    const intensityMap: Record<string, string> = {
      normal: "var(--ws-intensity-normal)",
      muted: "var(--ws-intensity-muted)",
      faint: "var(--ws-intensity-faint)",
      accent: "var(--ws-intensity-accent)",
    };
    if (options.prefixColor) preSpan.style.color = options.prefixColor;
    else if (options.prefixColorIntensity)
      preSpan.style.color = intensityMap[options.prefixColorIntensity];
    if (options.suffixColor) sufSpan.style.color = options.suffixColor;
    else if (options.suffixColorIntensity)
      sufSpan.style.color = intensityMap[options.suffixColorIntensity];
    wordEl.appendChild(preSpan);
    wordEl.appendChild(sufSpan);
    content.appendChild(wordEl);
    item.appendChild(content);
    if (options.rankingPosition === "right" && showRanking) {
      item.appendChild(badgeEl);
    }
    if (options.allowMouseInteractions !== false) {
      if (options.allowMouseInsert !== false) {
        item.addEventListener(
          "click",
          (e) => {
            e.preventDefault();
            e.stopPropagation();
            options.onSelect(suggestion, true);
          },
          { capture: true }
        );
      }
      item.addEventListener("mouseenter", () => {
        options.onHover(index);
      });
    }

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
