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

// Common shadcn/tailwind CSS variables we may mirror from the page theme
const SHADCN_TOKEN_KEYS = [
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--destructive",
  "--destructive-foreground",
  "--border",
  "--input",
  "--ring",
  "--radius",
];

function computeThemeVars(themeMode: "adaptive" | "isolated"): string {
  if (themeMode === "adaptive") {
    const rs = getComputedStyle(document.documentElement);
    return SHADCN_TOKEN_KEYS.map((k) => {
      const v = rs.getPropertyValue(k).trim();
      return v ? `${k}: ${v};` : "";
    }).join("");
  }
  return "";
}

// Minimal CSS required for the suggestion menu and its shadcn subcomponents
const minimalMenuCSS = `
* { box-sizing: border-box; }

/* Container */
.bg-popover { background-color: hsl(var(--popover)) !important; }
.text-popover-foreground { color: hsl(var(--popover-foreground)) !important; }
.border { border-width: 1px !important; border-color: hsl(var(--border)) !important; }
.rounded-md { border-radius: 0.375rem !important; }
.shadow-lg { box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) !important; }
.w-72 { width: 18rem !important; }
.max-h-80 { max-height: 20rem !important; }

/* Layout helpers */
.flex { display: flex !important; }
.inline-flex { display: inline-flex !important; }
.items-center { align-items: center !important; }
.justify-center { justify-content: center !important; }
.justify-between { justify-content: space-between !important; }
.justify-end { justify-content: flex-end !important; }
.flex-1 { flex: 1 1 0% !important; }
.gap-3 { gap: 0.75rem !important; }
.min-w-0 { min-width: 0 !important; }
.cursor-pointer { cursor: pointer !important; }

/* Spacing */
.p-0 { padding: 0 !important; }
.p-2 { padding: 0.5rem !important; }
.pt-0 { padding-top: 0 !important; }
.pb-1 { padding-bottom: 0.25rem !important; }
.px-1 { padding-left: 0.25rem !important; padding-right: 0.25rem !important; }
.px-3 { padding-left: 0.75rem !important; padding-right: 0.75rem !important; }
.py-1 { padding-top: 0.25rem !important; padding-bottom: 0.25rem !important; }
.py-2 { padding-top: 0.5rem !important; padding-bottom: 0.5rem !important; }
.mx-2 { margin-left: 0.5rem !important; margin-right: 0.5rem !important; }
.space-y-1 > * + * { margin-top: 0.25rem !important; }

/* Sizes */
.h-5 { height: 1.25rem !important; }
.h-6 { height: 1.5rem !important; }
.w-6 { width: 1.5rem !important; }
.rounded-full { border-radius: 9999px !important; }
.rounded-sm { border-radius: 0.125rem !important; }

/* Typography */
.text-xs { font-size: 0.75rem !important; line-height: 1rem !important; }
.text-sm { font-size: 0.875rem !important; line-height: 1.25rem !important; }
.font-medium { font-weight: 500 !important; }
.text-muted-foreground { color: hsl(var(--muted-foreground)) !important; }
.text-primary-foreground { color: hsl(var(--primary-foreground)) !important; }
.text-accent-foreground { color: hsl(var(--accent-foreground)) !important; }

/* Colors */
.bg-accent { background-color: hsl(var(--accent)) !important; }
.bg-primary { background-color: hsl(var(--primary)) !important; }

/* Interactions */
.transition-colors { transition-property: color, background-color, border-color, text-decoration-color, fill, stroke !important; transition-duration: 150ms !important; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1) !important; }
.hover\:bg-accent:hover { background-color: hsl(var(--accent)) !important; }
.hover\:text-accent-foreground:hover { color: hsl(var(--accent-foreground)) !important; }
.hover\:bg-destructive\/10:hover { background-color: hsl(var(--destructive) / 0.1) !important; }
.hover\:text-destructive:hover { color: hsl(var(--destructive)) !important; }
.z-50 { z-index: 50 !important; }
.overflow-hidden { overflow: hidden !important; }

/* ScrollArea (Radix) */
.relative { position: relative !important; }
.overflow-hidden { overflow: hidden !important; }
.h-64 { height: 16rem !important; }
.w-full { width: 100% !important; }
.rounded-\[inherit\] { border-radius: inherit !important; }
[data-radix-scroll-area-viewport] { height: 100% !important; width: 100% !important; border-radius: inherit !important; overflow: scroll !important; scrollbar-width: none !important; -ms-overflow-style: none !important; }
[data-radix-scroll-area-viewport]::-webkit-scrollbar { display: none !important; }
[data-radix-scroll-area-scrollbar] { display: flex !important; user-select: none !important; touch-action: none !important; }
[data-radix-scroll-area-scrollbar][data-orientation="vertical"] { height: 100% !important; width: 10px !important; border-left: 1px solid transparent !important; padding: 1px !important; }
[data-radix-scroll-area-scrollbar][data-orientation="horizontal"] { height: 10px !important; flex-direction: column !important; border-top: 1px solid transparent !important; padding: 1px !important; }
[data-radix-scroll-area-thumb] { position: relative !important; flex: 1 !important; border-radius: 9999px !important; background-color: hsl(var(--border)) !important; opacity: 0.5 !important; }
[data-radix-scroll-area-thumb]:hover { opacity: 1 !important; }

/* Tooltip */
.rounded-md { border-radius: 0.375rem !important; }
.px-3 { padding-left: 0.75rem !important; padding-right: 0.75rem !important; }
.py-1\.5 { padding-top: 0.375rem !important; padding-bottom: 0.375rem !important; }
`;

function buildShadowCSS(themeMode: "adaptive" | "isolated" = "isolated"): string {
  const rs = getComputedStyle(document.documentElement);
  const tokenLines = WS_TOKEN_KEYS.map((k) => {
    const v = rs.getPropertyValue(k).trim();
    return v ? `${k}: ${v};` : "";
  }).join("");
  const themeVarLines = computeThemeVars(themeMode);

  // Only inject our own extension styles and design tokens, not the page's CSS
  return `
:host{
  position:static!important;
  pointer-events:none!important;
  ${tokenLines}
  ${themeVarLines}
}
/* Minimal menu UI styles */
${minimalMenuCSS}
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
  autoFocus?: boolean;
  style?: React.CSSProperties;
  tooltipContainer?: Element | null;
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
    autoFocus,
    style,
    tooltipContainer,
  }) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
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

    // Focus the wrapper to capture keyboard events when visible
    useEffect(() => {
      if (autoFocus && wrapperRef.current) {
        // Defer to next frame to ensure element is in the DOM
        requestAnimationFrame(() => wrapperRef.current?.focus());
      }
    }, [autoFocus, adjustedPos.x, adjustedPos.y, suggestions.length]);

    if (suggestions.length === 0) return null;

    // Convert suggestions to UI format
    const uiSuggestions: SuggestionItem[] = suggestions.map((s) => ({
      word: s.word,
      rank: s.rank || 0,
    }));

    return (
      <div
        ref={wrapperRef}
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
        aria-activedescendant={`suggestion-${selectedIndex}`}
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
          style={style || (menuWidth ? { width: `${menuWidth}px` } : undefined)}
          tooltipContainer={tooltipContainer}
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
  // Settings passthroughs for theming/UX
  themeMode?: "adaptive" | "isolated";
  showNumbers?: boolean;
  rankingPosition?: "left" | "right";
  borderRadius?: boolean;
  menuBorder?: boolean;
  menuWidth?: number;
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
  private lastThemeMode: "adaptive" | "isolated" | undefined;
  private static cssCache = new Map<string, string>(); // Static cache for CSS

  private getCachedCSS(): string {
    const cacheKey = "default"; // Could extend for theme variations
    if (!WSRenderer.cssCache.has(cacheKey)) {
      WSRenderer.cssCache.set(cacheKey, buildShadowCSS());
    }
    return WSRenderer.cssCache.get(cacheKey)!;
  }

  static clearCSSCache(): void {
    WSRenderer.cssCache.clear();
  }

  mount(config: WSMountConfig = {}) {
    if (this.shadowHost) {
      this.update(config);
      return;
    }

    this.shadowHost = document.createElement("div");
    this.shadowHost.setAttribute("data-ws-suggestion-menu", "true");
    this.shadowHost.style.cssText = `
      position: static !important;
      width: 0 !important;
      height: 0 !important;
      pointer-events: none !important;
    `;

    const isDev = (import.meta as any)?.env?.DEV ?? false;
    this.shadowRoot = this.shadowHost.attachShadow({ mode: isDev ? "open" : "closed" });

    this.styleEl = document.createElement("style");
    const initialThemeMode = (config.themeMode === "adaptive" ? "adaptive" : "isolated");
    this.lastThemeMode = initialThemeMode;
    this.styleEl.textContent = buildShadowCSS(initialThemeMode);
    this.shadowRoot.appendChild(this.styleEl);

    this.mountEl = document.createElement("div");
    this.mountEl.style.cssText = `
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
      themeMode = "isolated",
      showNumbers,
      rankingPosition,
      borderRadius,
      menuBorder,
      menuWidth,
    } = this.currentConfig;

  // Visibility only; positioning is handled inside the component wrapper
    this.mountEl.style.display = visible ? "block" : "none";

    this.isVisible = visible;

    if (!visible) {
      this.root.render(<div />);
      return;
    }

    // Refresh theme CSS if mode changed
    if (this.styleEl && themeMode !== this.lastThemeMode) {
      this.lastThemeMode = themeMode;
      this.styleEl.textContent = buildShadowCSS(themeMode);
    }

    const menuClassName = [
      borderRadius === false ? "rounded-none" : "",
      menuBorder === false ? "border-0" : "",
    ].filter(Boolean).join(" ");

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
      showNumbers,
      compactMode: mode === "compact",
      className: menuClassName || undefined,
      autoFocus: true,
      style: menuWidth ? { width: `${menuWidth}px` } : undefined,
      tooltipContainer: this.shadowRoot as Element | null,
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
