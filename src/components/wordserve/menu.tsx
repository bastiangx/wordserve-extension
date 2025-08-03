import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface Suggestion {
  word: string;
  rank: number;
}

export interface SuggestionMenuProps {
  suggestions: Suggestion[];
  selectedIndex: number;
  currentWord: string;
  position: { x: number; y: number };
  onSelect: (index: number) => void;
  onClose: () => void;
  showRanking?: boolean;
  showNumbers?: boolean;
  compactMode?: boolean;
  className?: string;
}

export const SuggestionMenu: React.FC<SuggestionMenuProps> = ({
  suggestions,
  selectedIndex,
  currentWord,
  position,
  onSelect,
  showRanking = false,
  showNumbers = true,
  compactMode = false,
  className,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

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
          block: 'nearest',
        });
      }
    }
  }, [selectedIndex]);

  const handleItemClick = (index: number) => {
    onSelect(index);
  };

  if (suggestions.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className={cn(
        "ws-suggestion-menu",
        "fixed bg-background/80 backdrop-blur-lg",
        "border border-border rounded-md shadow-lg",
        "min-w-[200px] max-w-[400px] max-h-[300px] overflow-y-auto",
        "animate-in fade-in-0 zoom-in-95 duration-100",
        compactMode && "text-sm",
        className
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 2147483647,
        position: "fixed",
      }}
    >
      <div className="p-1">
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
                "flex items-center justify-between gap-2 px-3 py-2",
                "rounded-sm cursor-pointer transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isSelected && "bg-accent text-accent-foreground",
                compactMode ? "py-1.5" : "py-2"
              )}
              onClick={() => handleItemClick(index)}
              data-index={index}
            >
              <div className="ws-suggestion-word flex-1 flex items-center">
                <span className="ws-suggestion-prefix text-muted-foreground font-medium">
                  {prefix}
                </span>
                <span className="ws-suggestion-suffix text-foreground">
                  {suffix}
                </span>
              </div>

              {(showNumbers || showRanking) && (
                <div className="ws-suggestion-meta flex items-center gap-1">
                  {showNumbers && (
                    <span className="ws-suggestion-number text-xs text-muted-foreground/70 font-mono">
                      {index + 1}
                    </span>
                  )}
                  {showRanking && (
                    <span className="ws-suggestion-rank text-xs text-muted-foreground/50 font-mono">
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
};
