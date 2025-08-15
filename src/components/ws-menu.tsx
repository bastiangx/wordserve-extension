import * as React from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { AUTOCOMPLETE_DEFAULTS } from "@/types";
import type { WordServeSettings, DisplaySuggestion } from "@/types";

export interface AutocompleteSuggestion extends DisplaySuggestion {
  id: string;
  description?: string;
}

export interface AutocompleteMenuProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  suggestions: AutocompleteSuggestion[];
  onSelect: (suggestion: AutocompleteSuggestion, addSpace?: boolean) => void;
  children: React.ReactNode;
  settings: WordServeSettings;
  className?: string;
  position?: { x: number; y: number };
}

export function AutocompleteMenu({
  isOpen,
  onOpenChange,
  suggestions,
  onSelect,
  children,
  settings,
  className,
  position,
}: AutocompleteMenuProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const commandRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  // Reset selection when suggestions change
  React.useEffect(() => {
    setSelectedIndex(0);
    setHoveredIndex(null);
  }, [suggestions]);

  // Handle keyboard navigation
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const maxVisibleItems = Math.min(
        settings.maxSuggestions,
        AUTOCOMPLETE_DEFAULTS.DEFAULT_VISIBLE_ITEMS
      );
      const visibleSuggestions = suggestions.slice(0, maxVisibleItems);

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev < visibleSuggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : visibleSuggestions.length - 1
          );
          break;
        case "Enter":
          event.preventDefault();
          if (visibleSuggestions[selectedIndex]) {
            const isInsertWithSpace =
              settings.keyBindings.insertWithSpace.key === "enter";
            onSelect(visibleSuggestions[selectedIndex], isInsertWithSpace);
          }
          break;
        case "Tab":
          event.preventDefault();
          if (visibleSuggestions[selectedIndex]) {
            const isInsertWithSpace =
              settings.keyBindings.insertWithSpace.key === "tab";
            onSelect(visibleSuggestions[selectedIndex], isInsertWithSpace);
          }
          break;
        case "Escape":
          event.preventDefault();
          onOpenChange(false);
          break;
        default:
          // Handle digit key selection (1-9)
          if (settings.numberSelection) {
            const digit = Number.parseInt(event.key);
            if (
              digit >= 1 &&
              digit <= AUTOCOMPLETE_DEFAULTS.MAX_DIGIT_SELECTABLE &&
              digit <= visibleSuggestions.length
            ) {
              event.preventDefault();
              onSelect(visibleSuggestions[digit - 1], false);
            }
          }
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, suggestions, selectedIndex, onSelect, onOpenChange, settings]);

  // Scroll to selected item
  React.useEffect(() => {
    if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedIndex]);

  const maxVisibleItems = Math.min(
    settings.maxSuggestions,
    AUTOCOMPLETE_DEFAULTS.DEFAULT_VISIBLE_ITEMS
  );
  const visibleSuggestions = suggestions.slice(0, maxVisibleItems);

  const getTooltipContent = (index: number): string => {
    if (
      settings.numberSelection &&
      index < AUTOCOMPLETE_DEFAULTS.MAX_DIGIT_SELECTABLE
    ) {
      return `Press ${index + 1} to insert`;
    }
    return "Press Enter to insert";
  };

  const getRankingBadge = (
    suggestion: AutocompleteSuggestion,
    index: number
  ) => {
    const showRanking =
      settings.showRankingOverride ||
      (!settings.compactMode && settings.numberSelection);
    if (!showRanking) return null;

    const rankingValue =
      settings.numberSelection &&
      index < AUTOCOMPLETE_DEFAULTS.MAX_DIGIT_SELECTABLE
        ? index + 1
        : suggestion.rank;

    return (
      <Badge
        variant="secondary"
        className={cn(
          "text-xs font-mono min-w-[1.5rem] h-5 flex items-center justify-center",
          settings.accessibility.boldSuffix && "font-bold"
        )}
      >
        {rankingValue}
      </Badge>
    );
  };

  return (
    <TooltipProvider delayDuration={AUTOCOMPLETE_DEFAULTS.TOOLTIP_DELAY}>
      <Popover open={isOpen} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <div className="w-full">{children}</div>
        </PopoverTrigger>
        <PopoverContent
          className={cn(
            "p-0 border-0 shadow-lg",
            settings.themeMode === "isolated"
              ? "wordserve-menu-isolated"
              : "wordserve-menu-adaptive",
            className
          )}
          style={{
            minWidth: `${AUTOCOMPLETE_DEFAULTS.MIN_WIDTH}px`,
            maxWidth: `${AUTOCOMPLETE_DEFAULTS.MAX_WIDTH}px`,
            maxHeight: `${AUTOCOMPLETE_DEFAULTS.MAX_HEIGHT}px`,
            fontSize: `${settings.fontSize}px`,
            fontWeight: settings.fontWeight,
            fontFamily: settings.accessibility.customFontFamily,
          }}
          side="bottom"
          align="start"
          sideOffset={AUTOCOMPLETE_DEFAULTS.POSITION_OFFSET}
          avoidCollisions={true}
          collisionPadding={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command
            ref={commandRef}
            className={cn(
              "rounded-lg border-0",
              settings.themeMode === "adaptive" &&
                "bg-popover text-popover-foreground"
            )}
          >
            <ScrollArea className="max-h-full">
              <CommandList className="max-h-full">
                <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
                  No suggestions found
                </CommandEmpty>
                <CommandGroup>
                  {visibleSuggestions.map((suggestion, index) => {
                    const isSelected = index === selectedIndex;
                    const isHovered = index === hoveredIndex;
                    const rankingBadge = getRankingBadge(suggestion, index);

                    return (
                      <Tooltip key={suggestion.id}>
                        <TooltipTrigger asChild>
                          <CommandItem
                            ref={(el) => {
                              itemRefs.current[index] = el;
                            }}
                            value={suggestion.word}
                            onSelect={() => onSelect(suggestion, false)}
                            onMouseEnter={() => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors",
                              "hover:bg-interaction hover:text-interaction-foreground",
                              (isSelected || isHovered) &&
                                "bg-interaction text-interaction-foreground",
                              settings.compactMode ? "py-1" : "py-2"
                            )}
                          >
                            {settings.rankingPosition === "left" &&
                              rankingBadge}

                            <div className="flex-1 min-w-0">
                              <div
                                className={cn(
                                  "truncate",
                                  settings.accessibility.uppercaseSuggestions &&
                                    "uppercase",
                                  settings.accessibility.boldSuffix &&
                                    "font-semibold"
                                )}
                                style={{
                                  color: settings.accessibility.customColor,
                                }}
                              >
                                {suggestion.word}
                              </div>
                              {suggestion.description &&
                                !settings.compactMode && (
                                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                                    {suggestion.description}
                                  </div>
                                )}
                            </div>

                            {settings.rankingPosition === "right" &&
                              rankingBadge}
                          </CommandItem>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">
                          {getTooltipContent(index)}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </ScrollArea>
          </Command>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}
