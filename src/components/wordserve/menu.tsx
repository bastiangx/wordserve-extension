import React, {useCallback, useEffect, useRef, useState} from "react";
import type {DisplaySuggestion as Suggestion, WordServeSettings,} from "@/types";
import {cn} from "@/lib/utils";

export type { DisplaySuggestion as Suggestion } from "@/types";

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

export const SuggestionMenu: React.FC<SuggestionMenuProps> = React.memo(({
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
  const selectedItemRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState(position);

  // Don't focus the menu container - this was causing input to lose focus
  // useEffect(() => {
  //   menuRef.current?.focus({ preventScroll: true });
  // }, []);

  useEffect(() => {
    if (selectedItemRef.current && menuRef.current) {
      const selectedElement = selectedItemRef.current;
      const menuElement = menuRef.current;

      const selectedRect = selectedElement.getBoundingClientRect();
      const menuRect = menuElement.getBoundingClientRect();

      const isAboveViewport = selectedRect.top < menuRect.top;
      const isBelowViewport = selectedRect.bottom > menuRect.bottom;

      if (isAboveViewport || isBelowViewport) {
        selectedElement.scrollIntoView({
          block: "nearest",
        });
      }
    }
  }, [selectedIndex]);

  useEffect(() => {
    const adjustPositionForViewport = (pos: { x: number; y: number }) => {
      const padding = 10;
      const estimatedHeight = Math.min(300, suggestions.length * 36 + 16);

      let { x, y } = pos;

      // Adjust horizontal position if menu would go off screen
      const availableSpaceRight = window.innerWidth - x;
      if (availableSpaceRight < menuWidth + padding) {
        x = Math.max(padding, window.innerWidth - menuWidth - padding);
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
  }, [position, menuWidth, suggestions.length]);

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
        // Only use default Enter/Tab if no custom bindings
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

  const handleItemClick = (index: number) => {
    onSelect(index);
  };

  // Prevent menu from being closed when scrollbar is clicked
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const menu = menuRef.current;

    if (menu && menu.contains(target)) {
      // Check if the click is on the scrollbar area
      const menuRect = menu.getBoundingClientRect();
      const scrollbarWidth = menu.offsetWidth - menu.clientWidth;

      if (scrollbarWidth > 0 && e.clientX >= menuRect.right - scrollbarWidth) {
        // This is a scrollbar click, don't prevent default
        return;
      }
    }
  };

  if (suggestions.length === 0) return null;

  return (
    <div
        ref={menuRef}
        className={cn(
          "ws-suggestion-menu",
          "fixed bg-popover text-popover-foreground",
          "shadow-md z-50 overflow-hidden",
          menuBorder && "border",
          borderRadius ? "rounded-md" : "rounded-none",
          compactMode && "compact",
          themeMode === "adaptive" && "theme-adaptive",
          themeMode === "isolated" && "theme-isolated",
          className
        )}
        style={{
          left: `${adjustedPos.x}px`,
          top: `${adjustedPos.y}px`,
          width: `${menuWidth}px`,
          maxHeight: "300px",
          overflowY: "auto",
          zIndex: 2147483647,
          position: "fixed",
        }}
        role="listbox"
        aria-label={`Suggestions for "${currentWord}"`}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onMouseDown={handleMouseDown}
      >
        <div className={cn("p-1", compactMode && "p-0.5")}>
          {suggestions.map((suggestion, index) => {
            const prefix = suggestion.word.substring(0, currentWord.length);
            const suffix = suggestion.word.substring(currentWord.length);
            const isSelected = index === selectedIndex;

            return (
              <div
                key={`${suggestion.word}-${index}`}
                ref={isSelected ? selectedItemRef : null}
                className={cn(
                  "ws-suggestion-item",
                  "flex items-center gap-2 px-3 py-2",
                  "rounded-sm cursor-pointer transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  isSelected && "bg-accent text-accent-foreground selected",
                  compactMode && "py-1.5 text-sm"
                )}
                onClick={() => handleItemClick(index)}
                onMouseEnter={() => onSetIndex?.(index)}
                role="option"
                aria-selected={isSelected}
                data-index={index}
              >
                {rankingPosition === "left" && (showNumbers || showRanking) && (
                  <div className="ws-suggestion-meta flex items-center gap-1 shrink-0">
                    {showNumbers && (
                      <span className="ws-suggestion-number text-xs text-muted-foreground font-mono min-w-[1ch] text-center">
                        {index + 1}
                      </span>
                    )}
                    {showRanking && (
                      <span className="ws-suggestion-rank text-xs text-muted-foreground font-mono">
                        #{suggestion.rank}
                      </span>
                    )}
                  </div>
                )}

                <div className="ws-suggestion-word flex-1 flex items-center min-w-0">
                  {showCompletionIcon && (
                    <span className="ws-completion-icon mr-2 text-muted-foreground">
                      →
                    </span>
                  )}
                  <span className="ws-suggestion-prefix text-muted-foreground font-medium">
                    {prefix}
                  </span>
                  <span className="ws-suggestion-suffix font-medium truncate">
                    {suffix}
                  </span>
                </div>

                {rankingPosition === "right" &&
                  (showNumbers || showRanking) && (
                    <div className="ws-suggestion-meta flex items-center gap-1 shrink-0">
                      {showNumbers && (
                        <span className="ws-suggestion-number text-xs text-muted-foreground font-mono min-w-[1ch] text-center">
                          {index + 1}
                        </span>
                      )}
                      {showRanking && (
                        <span className="ws-suggestion-rank text-xs text-muted-foreground font-mono">
                          #{suggestion.rank}
                        </span>
                      )}
                    </div>
                  )}
              </div>
            );
          })}
        </div>
      </div>
  );
});
