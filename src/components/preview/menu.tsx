import React, { useState, useEffect, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WordServeSettings } from "@/types";

export interface Suggestion {
  word: string;
  rank: number;
  id: string;
}

export interface MenuPreviewProps {
  settings: WordServeSettings;
  className?: string;
}

export const MenuPreview: React.FC<MenuPreviewProps> = ({
  settings,
  className,
}) => {
  const [inputValue, setInputValue] = useState("pro");
  const [showMenu, setShowMenu] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const [key, setKey] = useState(0); // Force re-render when needed

  // All available suggestions
  const allSuggestions: Suggestion[] = useMemo(
    () => [
      { word: "programming", rank: 1, id: "1" },
      { word: "program", rank: 2, id: "2" },
      { word: "progress", rank: 3, id: "3" },
      { word: "project", rank: 4, id: "4" },
      { word: "promise", rank: 5, id: "5" },
      { word: "property", rank: 6, id: "6" },
      { word: "protocol", rank: 7, id: "7" },
      { word: "prototype", rank: 8, id: "8" },
      { word: "provider", rank: 9, id: "9" },
      { word: "professional", rank: 10, id: "10" },
      { word: "processor", rank: 11, id: "11" },
      { word: "production", rank: 12, id: "12" },
      // Different prefixes for variety
      { word: "development", rank: 1, id: "13" },
      { word: "developer", rank: 2, id: "14" },
      { word: "design", rank: 3, id: "15" },
      { word: "desktop", rank: 4, id: "16" },
      { word: "deployment", rank: 5, id: "17" },
      { word: "database", rank: 6, id: "18" },
      { word: "testing", rank: 1, id: "19" },
      { word: "technology", rank: 2, id: "20" },
      { word: "terminal", rank: 3, id: "21" },
      { word: "typescript", rank: 4, id: "22" },
      { word: "function", rank: 1, id: "23" },
      { word: "framework", rank: 2, id: "24" },
      { word: "frontend", rank: 3, id: "25" },
    ],
    []
  );

  // Filter suggestions based on input
  const filteredSuggestions = useMemo(() => {
    if (!inputValue.trim()) return [];

    const lowerInput = inputValue.toLowerCase();
    return allSuggestions
      .filter(
        (suggestion) =>
          suggestion.word.toLowerCase().startsWith(lowerInput) &&
          suggestion.word.toLowerCase() !== lowerInput
      )
      .slice(0, Math.min(settings.maxSuggestions || 9, 9));
  }, [inputValue, allSuggestions, settings.maxSuggestions]);

  // Reset to default prefix when component mounts or when settings change
  useEffect(() => {
    setInputValue("pro");
    setShowMenu(true);
    setKey((prev) => prev + 1); // Force re-render
  }, [settings]); // Reset when settings change (like when page reopens)

  // Show/hide menu based on suggestions
  useEffect(() => {
    setShowMenu(filteredSuggestions.length > 0);
  }, [filteredSuggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

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
      {/* Interactive Input */}
      <div className="mb-2">
        <Input
          key={key}
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Type here..."
          className="font-mono"
        />
      </div>

      {/* Menu Preview */}
      {showMenu && (
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
          {filteredSuggestions.map((suggestion, index) => {
            const isSelected = index === selectedIndex;
            const showRanking = index < 9; // Only show ranking for first 9 items

            return (
              <div
                key={suggestion.id}
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
                        {suggestion.rank}
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
                        {suggestion.rank}
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
