import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
      tooltipContainer,
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
      <TooltipProvider>
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
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 rounded-full hover:bg-destructive/10 hover:text-destructive"
              onClick={onClose}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Scrollable suggestions */}
          <ScrollArea className="h-64 px-1">
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
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex-1 flex items-center min-w-0">
                            <span className="text-muted-foreground font-medium">
                              {prefix}
                            </span>
                            <span className="font-medium">{suffix}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent container={tooltipContainer}>
                          <p>Press [Enter] or [Tab] to insert this</p>
                        </TooltipContent>
                      </Tooltip>

                      {/* Rankings/Numbers */}
                      <div className="flex items-center gap-1">
                        {showNumbers && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className="text-xs w-6 h-5 justify-center p-0"
                              >
                                {index + 1}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent container={tooltipContainer}>
                              <p>
                                Press digit {index + 1} to insert it quickly
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {showRanking && (
                          <Badge variant="secondary" className="text-xs">
                            #{suggestion.rank}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {index < suggestions.length - 1 && (
                      <Separator className="mx-2" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </TooltipProvider>
    );
  }
);

SuggestionMenu.displayName = "SuggestionMenu";
