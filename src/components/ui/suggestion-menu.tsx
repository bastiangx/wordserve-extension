import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SuggestionItem {
  word: string;
  rank: number;
}

export interface SuggestionMenuProps {
  suggestions: SuggestionItem[];
  selectedIndex: number;
  currentWord: string;
  onSelect: (index: number) => void;
  onClose: () => void;
  showNumbers?: boolean;
  showRanking?: boolean;
  compactMode?: boolean;
  className?: string;
  onMouseEnter?: (index: number) => void;
  style?: React.CSSProperties;
  tooltipContainer?: Element | null;
}

export const SuggestionMenu = React.forwardRef<
  HTMLDivElement,
  SuggestionMenuProps
>(
  (
    {
      suggestions,
      selectedIndex,
      currentWord,
      onSelect,
      onClose,
      showNumbers = true,
      showRanking = false,
      compactMode = false,
      className,
      onMouseEnter,
      style,
      tooltipContainer: _unused,
      ...props
    },
    ref
  ) => {
    const selectedItemRef = React.useRef<HTMLDivElement>(null);

    // Scroll selected item into view
    React.useEffect(() => {
      if (selectedItemRef.current) {
        selectedItemRef.current.scrollIntoView({
          block: "nearest",
          behavior: "smooth",
        });
      }
    }, [selectedIndex]);

    return (
      <div
        ref={ref}
        className={cn(
          "bg-popover text-popover-foreground border rounded-md shadow-lg",
          "w-72 max-h-80",
          className
        )}
        style={style}
        {...props}
      >
        {/* Close button */}
        <div className="flex justify-end p-2 pb-1">
          <button
            type="button"
            className="h-6 w-6 p-0 rounded-full inline-flex items-center justify-center hover:bg-destructive/10 hover:text-destructive"
            onClick={onClose}
            aria-label="Close suggestions"
          >
            <X size={12} />
          </button>
        </div>

        {/* Scrollable suggestions */}
  <div className="h-64 px-1" style={{ overflow: "auto" }}>
          <div className="space-y-1 p-2 pt-0">
            {suggestions.map((suggestion, index) => {
              const prefix = suggestion.word.substring(0, currentWord.length);
              const suffix = suggestion.word.substring(currentWord.length);
              const isSelected = index === selectedIndex;

              return (
                <React.Fragment key={`${suggestion.word}-${index}`}>
                  <div
                    ref={isSelected ? selectedItemRef : null}
                    className={cn(
                      "flex items-center justify-between gap-3 px-3 py-2 rounded-sm cursor-pointer transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent text-accent-foreground",
                      compactMode && "py-1 text-sm"
                    )}
                    onClick={() => onSelect(index)}
                    onMouseEnter={() => onMouseEnter?.(index)}
                    role="option"
                    id={`suggestion-${index}`}
                    aria-selected={isSelected}
                    aria-label={suggestion.word}
                  >
                    {/* Suggestion text */}
                    <div className="flex-1 inline-flex items-center min-w-0">
                      <span className="text-muted-foreground font-medium">
                        {prefix}
                      </span>
                      <span className="font-medium">{suffix}</span>
                    </div>

                    {/* Rankings/Numbers */}
                    <div className="inline-flex items-center gap-1">
                      {showNumbers && (
                        <span className="text-xs w-6 h-5 inline-flex items-center justify-center p-0 rounded-sm border">
                          {index + 1}
                        </span>
                      )}
                      {showRanking && (
                        <span className="text-xs inline-flex items-center px-1 py-0.5 rounded-sm bg-accent text-accent-foreground">
                          #{suggestion.rank}
                        </span>
                      )}
                    </div>
                  </div>

                  {index < suggestions.length - 1 && (
                    <div className="mx-2" style={{ height: 1, background: "hsl(var(--border))" }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
);

SuggestionMenu.displayName = "SuggestionMenu";
