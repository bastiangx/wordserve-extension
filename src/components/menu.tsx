import React, { useEffect, useRef, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface Suggestion {
  word: string;
  rank: number;
  id: string;
}

export interface AutocompleteMenuProps {
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

export const AutocompleteMenu: React.FC<AutocompleteMenuProps> = ({
  suggestions,
  selectedIndex,
  onSelect,
  onHover,
  position,
  visible,
  maxHeight = 200,
  maxItems = 9,
  compact = true,
  enableBlur = true,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // Limit suggestions to maxItems for digit key navigation
  const displaySuggestions = useMemo(
    () => suggestions.slice(0, maxItems),
    [suggestions, maxItems]
  );

  // Auto-scroll to selected item
  useEffect(() => {
    if (selectedItemRef.current && menuRef.current) {
      const menu = menuRef.current;
      const item = selectedItemRef.current;
      const menuRect = menu.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();

      if (itemRect.bottom > menuRect.bottom) {
        menu.scrollTop += itemRect.bottom - menuRect.bottom;
      } else if (itemRect.top < menuRect.top) {
        menu.scrollTop -= menuRect.top - itemRect.top;
      }
    }
  }, [selectedIndex]);

  const handleClick = useCallback(
    (suggestion: Suggestion, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      console.log("WordServe: Menu item clicked:", suggestion.word);
      onSelect(suggestion, true); // Always add space for mouse clicks
    },
    [onSelect]
  );

  if (!visible || displaySuggestions.length === 0) {
    return null;
  }

  const menuStyle: React.CSSProperties = {
    position: "fixed",
    left: position.x,
    top: position.y,
    zIndex: 999999,
    maxHeight,
  };

  return (
    <div
      ref={menuRef}
      className={cn(
        // Base styles - Rose Pine theme
        "border rounded-md shadow-lg overflow-y-auto font-mono text-sm",
        // Rose Pine colors using custom properties or fallback hex
        "bg-rose-pine-base border-rose-pine-highlight-med text-rose-pine-text",
        // Scrollbar styling
        "scrollbar-thin",
        // Compact mode
        compact ? "py-1" : "py-2",
        // Animation - using standard Tailwind classes
        "transition-all duration-100 ease-out",
        // Blur effect
        enableBlur && "backdrop-blur-md"
      )}
      style={{
        ...menuStyle,
        backgroundColor: enableBlur 
          ? "rgba(25, 23, 36, 0.75)" // More transparent when blur is enabled
          : "#191724", // Solid when blur is disabled
        borderColor: enableBlur ? "rgba(64, 61, 82, 0.8)" : "#403d52",
        color: "#e0def4", // Rose Pine text
        backdropFilter: enableBlur ? "blur(16px) saturate(180%)" : undefined,
        WebkitBackdropFilter: enableBlur ? "blur(16px) saturate(180%)" : undefined, // Safari support
      }}
    >
      {displaySuggestions.map((suggestion, index) => {
        const isSelected = index === selectedIndex;
        const showRanking = index < 9; // Only show ranking for first 9 items

        return (
          <div
            key={suggestion.id}
            ref={isSelected ? selectedItemRef : null}
            className={cn(
              // Base item styles
              "flex items-center justify-between cursor-pointer transition-colors duration-75",
              compact ? "px-3 py-1" : "px-4 py-2"
            )}
            style={{
              backgroundColor: isSelected ? "#21202e" : "transparent", // Use darker highlight color
              color: "#e0def4", // Keep normal foreground color always
            }}
            onMouseEnter={() => onHover(index)}
            onClick={(e) => handleClick(suggestion, e)}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* Word */}
              <span
                className="font-medium truncate"
                style={{
                  color: "#e0def4", // Keep normal color always
                }}
              >
                {suggestion.word}
              </span>
            </div>

            {/* Rank badge - only for first 9 items */}
            {showRanking && (
              <Badge
                variant="outline"
                className="text-xs font-medium ml-2 shrink-0"
                style={{
                  borderColor: "#403d52", // Keep consistent border color
                  color: "#e0def4", // Keep normal color always
                }}
              >
                {suggestion.rank}
              </Badge>
            )}
          </div>
        );
      })}
    </div>
  );
};
