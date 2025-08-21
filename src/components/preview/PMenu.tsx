import React, { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DefaultConfig, DisplaySuggestion } from "@/types";
import { browser } from "wxt/browser";

export interface MenuPreviewProps {
  settings: DefaultConfig;
  className?: string;
}

export const MenuPreview: React.FC<MenuPreviewProps> = ({
  settings,
  className,
}) => {
  const [inputValue, setInputValue] = useState(() => {
    return localStorage.getItem("wordserve-preview-text") || "pro";
  });
  const [suggestions, setSuggestions] = useState<DisplaySuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimeoutRef = useRef<number | undefined>(undefined);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("wordserve-preview-text", inputValue);
  }, [inputValue]);
  const fetchSuggestions = useCallback(
    async (prefix: string) => {
      if (!prefix.trim() || prefix.length < (settings.minWordLength || 2)) {
        setSuggestions([]);
        setShowMenu(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await browser.runtime.sendMessage({
          type: "wordserve-complete",
          prefix: prefix.trim(),
          limit: settings.maxSuggestions || 20,
        });

        if (response?.suggestions) {
          const displaySuggestions: DisplaySuggestion[] =
            response.suggestions.map((s: any, index: number) => ({
              word: s.word,
              rank: s.rank || index + 1,
            }));

          setSuggestions(displaySuggestions);
          setShowMenu(displaySuggestions.length > 0);
          setSelectedIndex(0);
        } else if (response?.error) {
          console.warn(
            "WordServe preview: Error fetching suggestions:",
            response.error
          );
          setSuggestions([]);
          setShowMenu(false);
        }
      } catch (error) {
        console.warn("WordServe preview: Failed to fetch suggestions:", error);
        setSuggestions([]);
        setShowMenu(false);
      } finally {
        setIsLoading(false);
      }
    },
    [settings.minWordLength, settings.maxSuggestions]
  );

  // Debounced input handler
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);

      if (debounceTimeoutRef.current !== undefined) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = window.setTimeout(() => {
        fetchSuggestions(value);
      }, settings.debounceTime || 100);
    },
    [fetchSuggestions, settings.debounceTime]
  );

  useEffect(() => {
    fetchSuggestions(inputValue);
  }, [fetchSuggestions]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current !== undefined) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // scrolling into view
  useEffect(() => {
    const menu = menuRef.current;
    const item = selectedItemRef.current;
    if (!menu || !item) return;
    const menuRect = menu.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    if (itemRect.bottom > menuRect.bottom) {
      menu.scrollTop += itemRect.bottom - menuRect.bottom;
    } else if (itemRect.top < menuRect.top) {
      menu.scrollTop -= menuRect.top - itemRect.top;
    }
  }, [selectedIndex]);

  const fontSize =
    typeof settings.fontSize === "string"
      ? Math.max(8, Math.min(32, parseInt(settings.fontSize) || 14))
      : Math.max(8, Math.min(32, settings.fontSize || 14));

  const getFontWeight = (weight: string): string => {
    const weightMap: Record<string, string> = {
      thin: "100",
      extralight: "200",
      light: "300",
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
      extrabold: "800",
      black: "900",
    };
    return weightMap[weight] || "400";
  };

  const enableBlur = settings.themeMode === "adaptive";
  const selectByIndex = useCallback(
    (index: number) => {
      if (!suggestions.length) return;
      const clamped = Math.max(0, Math.min(index, suggestions.length - 1));
      const chosen = suggestions[clamped];
      if (!chosen) return;
      setInputValue(chosen.word);
      localStorage.setItem("wordserve-preview-text", chosen.word);
      setShowMenu(false);
      setSelectedIndex(clamped);
      // Optionally refetch for the new word after a short delay to simulate flow
      if (settings.debounceTime && settings.debounceTime > 0) {
        window.setTimeout(
          () => fetchSuggestions(chosen.word),
          settings.debounceTime
        );
      }
      // Keep focus on the input for a smooth preview
      inputRef.current?.focus();
    },
    [suggestions, settings.debounceTime, fetchSuggestions]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showMenu || suggestions.length === 0) return;
      // Arrow navigation
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Home") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(0);
        return;
      }
      if (e.key === "End") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex(suggestions.length - 1);
        return;
      }
      // Digit selection (1-9)
      if (
        settings.numberSelection &&
        /^[1-9]$/.test(e.key) &&
        !e.altKey &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < suggestions.length) {
          e.preventDefault();
          e.stopPropagation();
          selectByIndex(idx);
        }
        return;
      }
      // Accept selection
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        selectByIndex(selectedIndex);
        return;
      }
      // Close menu
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setShowMenu(false);
      }
    },
    [
      showMenu,
      suggestions.length,
      selectedIndex,
      selectByIndex,
      settings.numberSelection,
    ]
  );

  return (
    <div className={cn("relative w-full", className)}>
      <div className="mb-2">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={onKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setShowMenu(true);
          }}
          onBlur={() => {
            // Close the menu when input loses focus
            setShowMenu(false);
          }}
          placeholder="Type here..."
          className="font-mono"
        />
      </div>

      {/* Menu Preview */}
      {showMenu && suggestions.length > 0 && (
        <div
          ref={menuRef}
          className={cn(
            "border shadow-lg overflow-hidden font-mono",
            settings.menuBorderRadius ? "rounded-md" : "rounded-none",
            settings.menuBorder ? "" : "border-transparent",
            settings.compactMode ? "py-1" : "py-2",
            enableBlur && "backdrop-blur-md",
            "transition-all duration-100 ease-out"
          )}
          style={{
            backgroundColor: enableBlur ? "rgba(25, 23, 36, 0.75)" : "#191724",
            borderColor: settings.menuBorder
              ? enableBlur
                ? "rgba(64, 61, 82, 0.8)"
                : "#403d52"
              : "transparent",
            color: "#e0def4",
            backdropFilter: enableBlur
              ? "blur(16px) saturate(180%)"
              : undefined,
            WebkitBackdropFilter: enableBlur
              ? "blur(16px) saturate(180%)"
              : undefined,
            fontSize: `${fontSize}px`,
            fontWeight: getFontWeight(settings.fontWeight),
            maxHeight: "200px",
            overflowY: "auto" as const,
          }}
        >
          {suggestions.map((suggestion, index) => {
            const isSelected = index === selectedIndex;
            const showRanking =
              settings.showRankingOverride ||
              (settings.numberSelection && index < 9);

            return (
              <div
                key={`${suggestion.word}-${index}`}
                ref={isSelected ? selectedItemRef : null}
                className={cn(
                  "flex items-center cursor-default transition-colors duration-75",
                  settings.compactMode ? "px-3 py-1" : "px-4 py-2",
                  settings.rankingPosition === "right" ? "justify-between" : ""
                )}
                style={{
                  backgroundColor: isSelected ? "#21202e" : "transparent",
                  color: "#e0def4",
                }}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setSelectedIndex(index)}
                onMouseDown={(e) => {
                  // Prevent input blur so click selects properly
                  e.preventDefault();
                  selectByIndex(index);
                }}
              >
                {settings.rankingPosition === "left" && (
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Rank badge on left */}
                    {showRanking && (
                      <Badge
                        variant="outline"
                        className="text-xs font-medium shrink-0"
                        style={{
                          borderColor: "#403d52",
                          color: "#e0def4",
                          fontSize: `${Math.max(10, fontSize - 2)}px`,
                        }}
                      >
                        {settings.numberSelection ? index + 1 : suggestion.rank}
                      </Badge>
                    )}

                    {/* Word */}
                    <span className="font-medium truncate">
                      {suggestion.word}
                    </span>
                  </div>
                )}

                {settings.rankingPosition === "right" && (
                  <>
                    {/* Word */}
                    <span className="font-medium truncate">
                      {suggestion.word}
                    </span>

                    {/* Rank badge on right */}
                    {showRanking && (
                      <Badge
                        variant="outline"
                        className="text-xs font-medium ml-2 shrink-0"
                        style={{
                          borderColor: "#403d52",
                          color: "#e0def4",
                          fontSize: `${Math.max(10, fontSize - 2)}px`,
                        }}
                      >
                        {settings.numberSelection ? index + 1 : suggestion.rank}
                      </Badge>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
