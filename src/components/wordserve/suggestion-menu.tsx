import React from "react";
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
  onClose,
  showRanking = false,
  showNumbers = true,
  compactMode = false,
  className,
}) => {
  const handleItemClick = (index: number) => {
    onSelect(index);
  };

  if (suggestions.length === 0) return null;

  return (
    <div
      className={cn(
        "wordserve-suggestion-menu",
        "fixed z-[999999] bg-background/95 backdrop-blur-sm",
        "border border-border rounded-md shadow-lg",
        "min-w-[200px] max-w-[400px] max-h-[300px] overflow-y-auto",
        "animate-in fade-in-0 zoom-in-95 duration-100",
        compactMode && "text-sm",
        className
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
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
              className={cn(
                "wordserve-suggestion-item",
                "flex items-center justify-between gap-2 px-3 py-2",
                "rounded-sm cursor-pointer transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isSelected && "bg-accent text-accent-foreground",
                compactMode ? "py-1.5" : "py-2"
              )}
              onClick={() => handleItemClick(index)}
              data-index={index}
            >
              <div className="wordserve-suggestion-word flex-1 flex items-center">
                <span className="wordserve-suggestion-prefix text-muted-foreground font-medium">
                  {prefix}
                </span>
                <span className="wordserve-suggestion-suffix text-foreground">
                  {suffix}
                </span>
              </div>
              
              {(showNumbers || showRanking) && (
                <div className="wordserve-suggestion-meta flex items-center gap-1">
                  {showNumbers && (
                    <span className="wordserve-suggestion-number text-xs text-muted-foreground/70 font-mono">
                      {index + 1}
                    </span>
                  )}
                  {showRanking && (
                    <span className="wordserve-suggestion-rank text-xs text-muted-foreground/50 font-mono">
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
