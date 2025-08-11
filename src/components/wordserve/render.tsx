import {createRoot, Root} from "react-dom/client";
import {SuggestionMenu, SuggestionMenuProps} from "./menu";
import type {DisplaySuggestion as Suggestion} from "@/types";

const WS_TOKEN_KEYS = [
  "--ws-bg",
  "--ws-bgAlt",
  "--ws-border",
  "--ws-text",
  "--ws-textMuted",
  "--ws-accent",
  "--ws-accentFg",
  "--ws-danger",
  "--ws-scrollbar",
  "--ws-scrollbarHover",
];

function buildShadowCSS(): string {
  const rs = getComputedStyle(document.documentElement);
  const tokenLines = WS_TOKEN_KEYS.map((k) => {
    const v = rs.getPropertyValue(k).trim();
    return v ? `${k}: ${v};` : "";
  }).join("");

  return `
:host{
  position:fixed!important;
  top:0!important;
  left:0!important;
  z-index:2147483647!important;
  pointer-events:none!important;
  width:0!important;
  height:0!important;
  ${tokenLines}
}

/* Base menu styles with better isolation */
.ws-suggestion-menu{
  position:fixed!important;
  pointer-events:auto!important;
  max-height:240px!important;
  overflow-y:auto!important;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif!important;
  backdrop-filter:blur(8px)!important;
  font-size:13px!important;
  box-sizing:border-box!important;
  margin:0!important;
  padding:8px!important;
  border-radius:8px!important;
  border:1px solid #444!important;
  background:rgba(26,26,26,0.95)!important;
  color:#e5e5e5!important;
  z-index:999999!important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3)!important;
}

.ws-suggestion-menu.compact{
  padding:4px!important;
  border-radius:4px!important;
}

/* Suggestion items */
.ws-suggestion-item{
  display:flex!important;
  align-items:center!important;
  cursor:pointer!important;
  padding:8px 12px!important;
  margin:2px 0!important;
  border-radius:4px!important;
  transition:background 0.15s ease!important;
  min-height:36px!important;
  box-sizing:border-box!important;
}

.ws-suggestion-item.compact{
  padding:2px 2px!important;
  margin:1px 0!important;
  min-height:20px!important;
}

.ws-suggestion-item:hover{
  background:#333!important;
}

.ws-suggestion-item.selected{
  background:#0066cc!important;
  color:#fff!important;
}

.ws-suggestion-word{
  flex:1!important;
  display:flex!important;
  align-items:center!important;
}

.ws-suggestion-prefix{
  font-weight:600!important;
  color:inherit!important;
}

.ws-suggestion-suffix{
  color:#999!important;
}

.ws-suggestion-item.selected .ws-suggestion-suffix{
  color:#ccc!important;
}
`;
}

export class ReactSuggestionMenuRenderer {
  private root: Root | null = null;
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;
  private mountEl: HTMLDivElement | null = null;

  private calculateMenuWidth(
    suggestions: Suggestion[],
    compactMode: boolean = false
  ): number {
    // Create a temporary element to measure text width
    const tempDiv = document.createElement("div");
    tempDiv.style.cssText = `
      position: fixed;
      visibility: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      padding: 0;
      margin: 0;
    `;
    document.body.appendChild(tempDiv);

    let maxWidth = 0;
    suggestions.forEach((suggestion) => {
      tempDiv.textContent = suggestion.word;
      const width = tempDiv.getBoundingClientRect().width;
      maxWidth = Math.max(maxWidth, width);
    });

    document.body.removeChild(tempDiv);

    if (compactMode) {
      // Ultra-compact: minimal spacing - just 2px on each side + menu container minimal padding
      const minimalPadding = 2 * 2; // 2px left + 2px right around text
      const menuContainerPadding = 4 * 2; // minimal menu padding
      const calculatedWidth = maxWidth + minimalPadding + menuContainerPadding;
      return Math.max(120, Math.min(350, calculatedWidth)); // Tighter bounds for compact
    } else {
      // Normal mode: comfortable spacing as before
      const itemPadding = 8 * 2 + 12 * 2; // top/bottom + left/right padding
      const menuPadding = 8 * 2; // menu container padding
      const margin = 4 * 2; // item margins
      const scrollbarWidth = 6; // potential scrollbar

      const calculatedWidth =
        maxWidth + itemPadding + menuPadding + margin + scrollbarWidth;
      return Math.max(200, Math.min(400, calculatedWidth)); // Standard bounds
    }
  }

  render(props: SuggestionMenuProps) {
    if (!this.host) {
      this.host = document.createElement("div");
      this.host.id = "ws-menu-host";
      this.host.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        pointer-events: none !important;
        z-index: 2147483647 !important;
      `;
      document.body.appendChild(this.host);
      this.shadow = this.host.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = buildShadowCSS();
      this.shadow.appendChild(style);
      this.mountEl = document.createElement("div");
      this.shadow.appendChild(this.mountEl);
      this.root = createRoot(this.mountEl);
    }

    if (this.root) {
      // Calculate dynamic width based on suggestions
      const menuWidth = this.calculateMenuWidth(
        props.suggestions,
        props.compactMode
      );
      this.root.render(<SuggestionMenu {...props} menuWidth={menuWidth} />);
    }
  }

  hide() {
    if (this.root) this.root.unmount();
    if (this.host) this.host.remove();
    this.root = null;
    this.host = null;
    this.shadow = null;
    this.mountEl = null;
  }

  updateSelection(
    selectedIndex: number,
    suggestions: Suggestion[],
    currentWord: string,
    position: { x: number; y: number },
    onSelect: (index: number) => void,
    onClose: () => void,
    options?: Partial<SuggestionMenuProps>
  ) {
    if (this.root) {
      // Calculate dynamic width based on suggestions
      const menuWidth = this.calculateMenuWidth(
        suggestions,
        options?.compactMode
      );
      this.render({
        suggestions,
        selectedIndex,
        currentWord,
        position,
        onSelect,
        onClose,
        menuWidth,
        ...options,
      });
    }
  }
}

export { SuggestionMenu, type Suggestion, type SuggestionMenuProps };
