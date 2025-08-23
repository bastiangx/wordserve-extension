import React, { useState, useEffect, useRef, useCallback } from "react";
import "@/components/styles.css";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DefaultConfig, DisplaySuggestion } from "@/types";
import { getRowHeight, clamp, toNumber } from "@/lib/utils";
import { browser } from "wxt/browser";
import { initOpenDyslexic, buildFontFamilyFromConfig } from "@/lib/render/font";

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
  const [showMenu, setShowMenu] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimeoutRef = useRef<number | undefined>(undefined);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);
  const [caretPos, setCaretPos] = useState<number>(() => {
    const init = localStorage.getItem("wordserve-preview-text") || "pro";
    return init.length;
  });

  const extractWordAtPosition = useCallback(
    (text: string, position: number) => {
      let wordStart = position;
      let wordEnd = position;
      const isSep = (ch?: string) => !ch || /\s/.test(ch);
      while (wordStart > 0 && !isSep(text[wordStart - 1])) wordStart--;
      while (wordEnd < text.length && !isSep(text[wordEnd])) wordEnd++;
      return {
        prefix: text.slice(
          wordStart,
          Math.max(wordStart, Math.min(position, wordEnd))
        ),
        wordStart,
        wordEnd,
      };
    },
    []
  );

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
      }
    },
    [settings.minWordLength, settings.maxSuggestions]
  );

  // Debounced input handler
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const caret = e.target.selectionStart ?? value.length;
      setInputValue(value);
      setCaretPos(caret);
      const { prefix } = extractWordAtPosition(value, caret);

      if (debounceTimeoutRef.current !== undefined) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = window.setTimeout(() => {
        fetchSuggestions(prefix);
      }, settings.debounceTime || 100);
    },
    [extractWordAtPosition, fetchSuggestions, settings.debounceTime]
  );

  useEffect(() => {
    const caret = inputRef.current?.selectionStart ?? inputValue.length;
    setCaretPos(caret);
    const { prefix } = extractWordAtPosition(inputValue, caret);
    fetchSuggestions(prefix);
  }, [extractWordAtPosition, fetchSuggestions]);

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

  // derive numeric font size, clamp to sensible range (12-28)
  const fontSize = clamp(toNumber(settings.fontSize, 15), 12, 28);

  useEffect(() => {
    if (settings.accessibility.dyslexicFont) initOpenDyslexic();
  }, [settings.accessibility.dyslexicFont]);

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

  const selectByIndex = useCallback(
    (index: number) => {
      if (!suggestions.length) return;
      const clamped = Math.max(0, Math.min(index, suggestions.length - 1));
      const chosen = suggestions[clamped];
      if (!chosen) return;
      // Replace only the current word at caret with the chosen suggestion
      const { wordStart, wordEnd } = extractWordAtPosition(
        inputValue,
        caretPos
      );
      const before = inputValue.slice(0, wordStart);
      const after = inputValue.slice(wordEnd);
      const newValue = before + chosen.word + after;
      const newCaret = before.length + chosen.word.length;
      setInputValue(newValue);
      localStorage.setItem("wordserve-preview-text", newValue);
      setShowMenu(false);
      setSelectedIndex(clamped);
      // Restore caret after state update
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(newCaret, newCaret);
          setCaretPos(newCaret);
        }
      });
    },
    [suggestions, extractWordAtPosition, inputValue, caretPos]
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
        !e.metaKey &&
        !e.shiftKey
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
    <div
      className={cn(
        "relative w-full",
        settings.theme === "light" ? "ws-theme-light" : "ws-theme-dark",
        className
      )}
    >
      <div className="mb-2">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={onKeyDown}
          onClick={() => {
            const el = inputRef.current;
            if (!el) return;
            const caret = el.selectionStart ?? el.value.length;
            setCaretPos(caret);
            const { prefix } = extractWordAtPosition(el.value, caret);
            fetchSuggestions(prefix);
          }}
          onKeyUp={() => {
            const el = inputRef.current;
            if (!el) return;
            const caret = el.selectionStart ?? el.value.length;
            setCaretPos(caret);
          }}
          onFocus={() => {
            const el = inputRef.current;
            const caret = el?.selectionStart ?? inputValue.length;
            setCaretPos(caret);
            const { prefix } = extractWordAtPosition(inputValue, caret);
            fetchSuggestions(prefix);
            if (suggestions.length > 0) setShowMenu(true);
          }}
          onBlur={() => {
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
            "transition-all duration-100 ease-out"
          )}
          style={{
            backgroundColor: "var(--ws-bg)",
            borderColor: settings.menuBorder
              ? "var(--ws-border)"
              : "transparent",
            color: "var(--ws-fg)",
            fontSize: `${fontSize}px`,
            fontWeight: getFontWeight(settings.fontWeight),
            fontFamily: settings.accessibility.dyslexicFont
              ? `'OpenDyslexic', ` +
                buildFontFamilyFromConfig({
                  fontFamilyList: settings.fontFamilyList,
                  customFontList: settings.customFontList,
                })
              : buildFontFamilyFromConfig({
                  fontFamilyList: settings.fontFamilyList,
                  customFontList: settings.customFontList,
                }),
            maxHeight: "200px",
            overflowY: "auto" as const,
          }}
        >
          {suggestions.map((suggestion, index) => {
            const isSelected = index === selectedIndex;
            const showRanking =
              settings.showRankingOverride ||
              (settings.numberSelection && index < 9);
            const rowHeight = getRowHeight(fontSize, settings.compactMode);
            const displayWord = settings.accessibility.uppercaseSuggestions
              ? suggestion.word.toUpperCase()
              : suggestion.word;
            const { prefix } = extractWordAtPosition(inputValue, caretPos);
            const prefixLen = prefix.length;
            const pre = displayWord.slice(0, prefixLen);
            const suf = displayWord.slice(prefixLen);
            const intensityMap: Record<string, string> = {
              normal: "var(--ws-intensity-normal)",
              muted: "var(--ws-intensity-muted)",
              faint: "var(--ws-intensity-faint)",
              accent: "var(--ws-intensity-accent)",
            };
            const preColor =
              settings.accessibility.prefixColor ||
              intensityMap[
                settings.accessibility.prefixColorIntensity || "normal"
              ];
            const sufColor =
              settings.accessibility.suffixColor ||
              intensityMap[
                settings.accessibility.suffixColorIntensity || "normal"
              ];

            return (
              <div
                key={`${suggestion.word}-${index}`}
                ref={isSelected ? selectedItemRef : null}
                className={cn(
                  "flex items-center cursor-default transition-colors duration-75",
                  settings.compactMode ? "px-3" : "px-4",
                  settings.rankingPosition === "right" ? "justify-between" : ""
                )}
                style={{
                  backgroundColor: isSelected
                    ? "var(--ws-selected)"
                    : "transparent",
                  color: "var(--ws-fg)",
                  height: `${rowHeight}px`,
                }}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setSelectedIndex(index)}
                onMouseDown={(e) => {
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
                          borderColor: "var(--ws-rank-border)",
                          color: "var(--ws-fg)",
                          fontSize: `${Math.max(10, fontSize - 2)}px`,
                        }}
                      >
                        {settings.numberSelection ? index + 1 : suggestion.rank}
                      </Badge>
                    )}

                    {/* with prefix/suffix styling */}
                    <span className="truncate">
                      <span
                        style={{
                          color: preColor,
                          fontWeight: settings.accessibility.boldPrefix
                            ? 700
                            : undefined,
                        }}
                      >
                        {pre}
                      </span>
                      <span
                        style={{
                          color: sufColor,
                          fontWeight: settings.accessibility.boldSuffix
                            ? 700
                            : undefined,
                        }}
                      >
                        {suf}
                      </span>
                    </span>
                  </div>
                )}

                {settings.rankingPosition === "right" && (
                  <>
                    {/* Word with prefix/suffix styling */}
                    <span className="truncate">
                      <span
                        style={{
                          color: preColor,
                          fontWeight: settings.accessibility.boldPrefix
                            ? 700
                            : undefined,
                        }}
                      >
                        {pre}
                      </span>
                      <span
                        style={{
                          color: sufColor,
                          fontWeight: settings.accessibility.boldSuffix
                            ? 700
                            : undefined,
                        }}
                      >
                        {suf}
                      </span>
                    </span>

                    {/* Rank badge on right */}
                    {showRanking && (
                      <Badge
                        variant="outline"
                        className="text-xs font-medium ml-2 shrink-0"
                        style={{
                          borderColor: "var(--ws-rank-border)",
                          color: "var(--ws-fg)",
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
