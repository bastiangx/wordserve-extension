import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot, Root } from "react-dom/client";
import type {
  DisplaySuggestion as Suggestion,
  WordServeSettings,
} from "@/types";
import { SuggestionMenu as UISuggestionMenu } from "@/components/ui/suggestion-menu";
import type { SuggestionItem } from "@/components/ui/suggestion-menu";

export type { DisplaySuggestion as Suggestion } from "@/types";

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

  // Get all stylesheets from the main document
  const allCSS = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join("\n");
      } catch (e) {
        return "";
      }
    })
    .join("\n");

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

${allCSS}
`;
}

// Component interfaces
export interface SuggestionMenuProps {
  suggestions: Suggestion[];
  selectedIndex: number;
  currentWord: string;
  position: { x: number; y: number };
  onSelect: (index: number) => void;
  onNavigate?: (direction: number) => void;
  onSetIndex?: (index: number) => void;
  onCommit?: (addSpace: boolean) => void;
  onClose: () => void;
  showRanking?: boolean;
  showNumbers?: boolean;
  compactMode?: boolean;
  rankingPosition?: "left" | "right";
  borderRadius?: boolean;
  menuBorder?: boolean;
  themeMode?: "adaptive" | "isolated";
  showCompletionIcon?: boolean;
  className?: string;
  menuWidth?: number;
  keyBindings?: WordServeSettings["keyBindings"];
}

// React Component
export const SuggestionMenu: React.FC<SuggestionMenuProps> = React.memo(
  ({
    suggestions,
    selectedIndex,
    currentWord,
    position,
    onSelect,
    onNavigate,
    onSetIndex,
    onCommit,
    onClose,
    showRanking = false,
    showNumbers = false,
    compactMode = false,
    rankingPosition = "right",
    borderRadius = true,
    menuBorder = true,
    themeMode = "isolated",
    showCompletionIcon = false,
    className,
    menuWidth = 300,
    keyBindings,
  }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [adjustedPos, setAdjustedPos] = useState(position);

    // Adjust position for viewport
    useEffect(() => {
      const adjustPositionForViewport = (pos: { x: number; y: number }) => {
        const padding = 10;
        const estimatedHeight = 320; // Fixed height for our menu
        const estimatedWidth = menuWidth;

        let { x, y } = pos;

        // Adjust horizontal position if menu would go off screen
        const availableSpaceRight = window.innerWidth - x;
        if (availableSpaceRight < estimatedWidth + padding) {
          x = Math.max(padding, window.innerWidth - estimatedWidth - padding);
        }

        // Adjust vertical position if menu would go off screen
        const availableSpaceBottom = window.innerHeight - y;
        if (availableSpaceBottom < estimatedHeight + padding) {
          // Try to place above the caret
          y = pos.y - estimatedHeight - 10;

          // If still not enough space, clamp to viewport
          if (y < padding) y = padding;
        }

        return { x, y };
      };

      setAdjustedPos(adjustPositionForViewport(position));
    }, [position, menuWidth]);

    // Keyboard navigation
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (suggestions.length === 0) return;

        const checkKeyBinding = (
          binding: { key: string; modifiers: string[] },
          keyEvent: React.KeyboardEvent
        ) => {
          const keyMatch =
            keyEvent.key.toLowerCase() === binding.key.toLowerCase();
          const modifiersMatch = binding.modifiers.every((mod) => {
            switch (mod.toLowerCase()) {
              case "shift":
                return keyEvent.shiftKey;
              case "ctrl":
                return keyEvent.ctrlKey;
              case "alt":
                return keyEvent.altKey;
              case "meta":
                return keyEvent.metaKey;
              default:
                return false;
            }
          });
          const noExtraModifiers = ["shift", "ctrl", "alt", "meta"].every(
            (mod) =>
              binding.modifiers.includes(mod) ===
              keyEvent[`${mod}Key` as keyof React.KeyboardEvent]
          );
          return keyMatch && modifiersMatch && noExtraModifiers;
        };

        // Check for custom key bindings first
        if (keyBindings) {
          if (checkKeyBinding(keyBindings.insertWithoutSpace, e)) {
            e.preventDefault();
            onCommit ? onCommit(false) : onSelect(selectedIndex);
            return;
          }
          if (checkKeyBinding(keyBindings.insertWithSpace, e)) {
            e.preventDefault();
            onCommit ? onCommit(true) : onSelect(selectedIndex);
            return;
          }
        }

        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            onNavigate?.(1);
            break;
          case "ArrowUp":
            e.preventDefault();
            onNavigate?.(-1);
            break;
          case "Home":
            e.preventDefault();
            onSetIndex?.(0);
            break;
          case "End":
            e.preventDefault();
            onSetIndex?.(suggestions.length - 1);
            break;
          case "PageDown":
            e.preventDefault();
            onSetIndex?.(Math.min(suggestions.length - 1, selectedIndex + 5));
            break;
          case "PageUp":
            e.preventDefault();
            onSetIndex?.(Math.max(0, selectedIndex - 5));
            break;
          case "Escape":
            e.preventDefault();
            onClose();
            break;
          case "Enter":
            if (!keyBindings) {
              e.preventDefault();
              onCommit ? onCommit(false) : onSelect(selectedIndex);
            }
            break;
          case "Tab":
            if (!keyBindings) {
              e.preventDefault();
              onCommit ? onCommit(true) : onSelect(selectedIndex);
            }
            break;
          default:
            if (showNumbers && /^[1-9]$/.test(e.key)) {
              const idx = parseInt(e.key, 10) - 1;
              if (idx < suggestions.length) {
                e.preventDefault();
                onSelect(idx);
              }
            }
            break;
        }
      },
      [
        suggestions.length,
        selectedIndex,
        onNavigate,
        onSetIndex,
        onCommit,
        onSelect,
        onClose,
        showNumbers,
        keyBindings,
      ]
    );

    if (suggestions.length === 0) return null;

    // Convert suggestions to UI format
    const uiSuggestions: SuggestionItem[] = suggestions.map((s) => ({
      word: s.word,
      rank: s.rank || 0,
    }));

    return (
      <div
        style={{
          position: "fixed",
          left: `${adjustedPos.x}px`,
          top: `${adjustedPos.y}px`,
          zIndex: 2147483647,
        }}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        role="listbox"
        aria-label={`Suggestions for "${currentWord}"`}
      >
        <UISuggestionMenu
          ref={menuRef}
          suggestions={uiSuggestions}
          selectedIndex={selectedIndex}
          currentWord={currentWord}
          onSelect={onSelect}
          onClose={onClose}
          onMouseEnter={onSetIndex}
          showNumbers={showNumbers}
          showRanking={showRanking}
          compactMode={compactMode}
          className={className}
        />
      </div>
    );
  }
);

SuggestionMenu.displayName = "SuggestionMenu";

// Renderer interfaces
interface WSMouseInfo {
  x: number;
  y: number;
  type: "click" | "right-click";
}

interface WSMountConfig {
  x?: number;
  y?: number;
  visible?: boolean;
  suggestions?: Suggestion[];
  activeIndex?: number;
  hideCloseButton?: boolean;
  keyboard?: {
    up?: boolean;
    down?: boolean;
    tab?: boolean;
    shift?: boolean;
    escape?: boolean;
  };
  mode?: "normal" | "compact";
  variant?: "default" | "subtle";
  spacing?: "normal" | "compact" | "spacious";
  width?: "fixed" | "adaptive";
  maxHeight?: number;
  showScrollbar?: boolean;
  showRankings?: boolean;
  onSuggestionClick?: (suggestion: Suggestion, index: number) => void;
  onClose?: () => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  mouse?: WSMouseInfo;
}

type WSRenderAction =
  | { type: "update"; config: WSMountConfig }
  | { type: "mount"; config: WSMountConfig }
  | { type: "unmount" }
  | { type: "hide" }
  | { type: "show" };

// Renderer class
class WSRenderer {
  private shadowHost: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private mountEl: HTMLElement | null = null;
  private styleEl: HTMLStyleElement | null = null;
  private root: Root | null = null;
  private isVisible = false;
  private currentConfig: WSMountConfig = {};

  mount(config: WSMountConfig = {}) {
    if (this.shadowHost) {
      this.update(config);
      return;
    }

    this.shadowHost = document.createElement("div");
    this.shadowHost.setAttribute("data-ws-suggestion-menu", "true");
    this.shadowHost.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 0 !important;
      height: 0 !important;
      pointer-events: none !important;
      z-index: 2147483647 !important;
    `;

    this.shadowRoot = this.shadowHost.attachShadow({ mode: "closed" });

    this.styleEl = document.createElement("style");
    this.styleEl.textContent = buildShadowCSS();
    this.shadowRoot.appendChild(this.styleEl);

    this.mountEl = document.createElement("div");
    this.mountEl.style.cssText = `
      position: fixed !important;
      pointer-events: auto !important;
    `;
    this.shadowRoot.appendChild(this.mountEl);

    document.body.appendChild(this.shadowHost);
    this.root = createRoot(this.mountEl);
    this.update(config);
  }

  update(config: WSMountConfig) {
    this.currentConfig = { ...this.currentConfig, ...config };

    if (!this.root || !this.mountEl) return;

    const {
      x = 0,
      y = 0,
      visible = true,
      suggestions = [],
      activeIndex = 0,
      hideCloseButton = false,
      keyboard = {},
      mode = "normal",
      variant = "default",
      spacing = "normal",
      width = "fixed",
      maxHeight = 240,
      showScrollbar = true,
      showRankings = true,
      onSuggestionClick,
      onClose,
      onKeyDown,
      mouse,
    } = this.currentConfig;

    // Position the menu
    this.mountEl.style.left = `${x}px`;
    this.mountEl.style.top = `${y}px`;
    this.mountEl.style.display = visible ? "block" : "none";

    this.isVisible = visible;

    if (!visible) {
      this.root.render(<div />);
      return;
    }

    const menuProps: SuggestionMenuProps = {
      suggestions,
      selectedIndex: activeIndex,
      currentWord: "",
      position: { x, y },
      onSelect: (index: number) => {
        const suggestion = suggestions[index];
        if (suggestion) {
          onSuggestionClick?.(suggestion, index);
        }
      },
      onClose: () => {
        this.hide();
        onClose?.();
      },
      showRanking: showRankings,
      compactMode: mode === "compact",
    };

    this.root.render(<SuggestionMenu {...menuProps} />);
  }

  hide() {
    if (this.mountEl) {
      this.mountEl.style.display = "none";
      this.isVisible = false;
    }
    if (this.root) {
      this.root.render(<div />);
    }
  }

  show() {
    if (this.mountEl) {
      this.mountEl.style.display = "block";
      this.isVisible = true;
    }
    this.update({});
  }

  unmount() {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }

    if (this.shadowHost && this.shadowHost.parentNode) {
      this.shadowHost.parentNode.removeChild(this.shadowHost);
    }

    this.shadowHost = null;
    this.shadowRoot = null;
    this.mountEl = null;
    this.styleEl = null;
    this.isVisible = false;
    this.currentConfig = {};
  }

  render(action: WSRenderAction) {
    switch (action.type) {
      case "mount":
        this.mount(action.config);
        break;
      case "update":
        this.update(action.config);
        break;
      case "unmount":
        this.unmount();
        break;
      case "hide":
        this.hide();
        break;
      case "show":
        this.show();
        break;
    }
  }

  getVisible() {
    return this.isVisible;
  }

  getConfig() {
    return { ...this.currentConfig };
  }
}

// Global instance
let globalRenderer: WSRenderer | null = null;

export function getRenderer(): WSRenderer {
  if (!globalRenderer) {
    globalRenderer = new WSRenderer();
  }
  return globalRenderer;
}

export function render(action: WSRenderAction) {
  const renderer = getRenderer();
  renderer.render(action);
}

export function mount(config: WSMountConfig = {}) {
  render({ type: "mount", config });
}

export function update(config: WSMountConfig) {
  render({ type: "update", config });
}

export function unmount() {
  render({ type: "unmount" });
}

export function hide() {
  render({ type: "hide" });
}

export function show() {
  render({ type: "show" });
}

export type { WSMountConfig, WSRenderAction, WSMouseInfo };

// Compatibility alias for existing code
export class ReactSuggestionMenuRenderer extends WSRenderer {
  constructor() {
    super();
  }

  // Legacy method for compatibility
  updateSelection(
    selectedIndex: number,
    suggestions: Suggestion[],
    currentWord: string,
    position: { x: number; y: number },
    onSelect: (index: number) => void,
    onClose: () => void,
    options: {
      showRanking?: boolean;
      showNumbers?: boolean;
      compactMode?: boolean;
      menuWidth?: number;
    } = {}
  ) {
    this.update({
      visible: true,
      suggestions,
      activeIndex: selectedIndex,
      x: position.x,
      y: position.y,
      showRankings: options.showRanking ?? false,
      mode: options.compactMode ? "compact" : "normal",
      onSuggestionClick: (suggestion, index) => onSelect(index),
      onClose,
    });
  }

  // Override render method to handle legacy format
  render(config: any) {
    // Handle legacy render format
    if (config.suggestions && config.selectedIndex !== undefined) {
      const wsConfig: WSMountConfig = {
        visible: true,
        suggestions: config.suggestions,
        activeIndex: config.selectedIndex,
        x: config.position?.x || 0,
        y: config.position?.y || 0,
        onSuggestionClick: (suggestion, index) => {
          if (config.onSelect) config.onSelect(index);
        },
        onClose: config.onClose || (() => {}),
        showRankings: config.showRanking ?? false,
        mode: config.compactMode ? "compact" : "normal",
      };

      super.render({ type: "mount", config: wsConfig });
      return;
    }

    // Handle WSRenderAction format
    super.render(config);
  }
}
