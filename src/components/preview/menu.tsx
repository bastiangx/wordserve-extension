import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
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
    // Load saved preview text from storage or default to "pro"
    return localStorage.getItem("wordserve-preview-text") || "pro";
  });
  const [suggestions, setSuggestions] = useState<DisplaySuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Save input value to localStorage whenever it changes
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

      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Set new timeout for debounced fetch
      debounceTimeoutRef.current = setTimeout(() => {
        fetchSuggestions(value);
      }, settings.debounceTime || 100);
    },
    [fetchSuggestions, settings.debounceTime]
  );

  // Fetch initial suggestions when component mounts or settings change
  useEffect(() => {
    fetchSuggestions(inputValue);
  }, [inputValue, fetchSuggestions]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Convert fontSize to number if it's a string
  const fontSize =
    typeof settings.fontSize === "string"
      ? Math.max(8, Math.min(32, parseInt(settings.fontSize) || 14))
      : Math.max(8, Math.min(32, settings.fontSize || 14));

  // Map font weight values to CSS
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

  // Determine if we should show blur based on theme mode
  const enableBlur = settings.themeMode === "adaptive";
  const selectedIndex = 0; // Always highlight first item for preview

  return (
    <div className={cn("relative w-full", className)}>
      <div className="mb-2">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Type here..."
          className="font-mono"
        />
      </div>

      {/* Menu Preview */}
      {showMenu && suggestions.length > 0 && (
        <div
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
                className={cn(
                  "flex items-center cursor-default transition-colors duration-75",
                  settings.compactMode ? "px-3 py-1" : "px-4 py-2",
                  settings.rankingPosition === "right" ? "justify-between" : ""
                )}
                style={{
                  backgroundColor: isSelected ? "#21202e" : "transparent",
                  color: "#e0def4",
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
