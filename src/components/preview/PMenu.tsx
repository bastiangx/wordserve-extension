import React, { useState, useEffect, useRef, useCallback } from "react";
import { buildFontFamilyFromConfig } from "@/lib/render/font";
import type { DefaultConfig, DisplaySuggestion } from "@/types";
import { getRowHeight, clamp, toNumber } from "@/lib/utils";
import { themeToClass } from "@/lib/render/themes";
import { Input } from "@/components/ui/input";
import { browser } from "wxt/browser";
import { cn } from "@/lib/utils";
import { eventMatchesAny } from "@/lib/input/kbd";
import "@/components/styles.css";

export interface MenuPreviewProps {
  settings: DefaultConfig;
  className?: string;
}

// Single component for Menu preview
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
  // Store input in localStorage for persistence across reloads
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
        }
      } catch (error) {
        console.warn("[PRV]Failed to fetch suggestions:", error);
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
  // Caret tracking and fetching on caret change
  useEffect(() => {
    const caret = inputRef.current?.selectionStart ?? inputValue.length;
    setCaretPos(caret);
    const { prefix } = extractWordAtPosition(inputValue, caret);
    fetchSuggestions(prefix);
  }, [extractWordAtPosition, fetchSuggestions]);
  // Debounce cleanup on unmount
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

  // derive numeric font size, clamp to range (12-28)
  const fontSize = clamp(toNumber(settings.fontSize, 15), 12, 28);
  useEffect(() => {
    // no-op: OpenDyslexic is pre-bundled via @font-face
  }, [settings.accessibility.dyslexicFont]);
  const getFontWeight = (value: number | undefined, isBold: boolean | undefined): string => {
    const base = typeof value === "number" ? value : 400;
    const effective = isBold ? Math.max(base, 700) : base;
    return String(effective);
  };

  const selectByIndex = useCallback(
    (index: number) => {
      if (!suggestions.length) return;
      const clamped = Math.max(0, Math.min(index, suggestions.length - 1));
      const chosen = suggestions[clamped];
      if (!chosen) return;
      // Replace only the current word at caret with the suggestion
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
      if (eventMatchesAny(e, settings.keyBindings.navDown)) {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (eventMatchesAny(e, settings.keyBindings.navUp)) {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      // Digit selection
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
      if (eventMatchesAny(e, settings.keyBindings.insertWithSpace)) {
        e.preventDefault();
        e.stopPropagation();
        selectByIndex(selectedIndex);
        return;
      }
      if (eventMatchesAny(e, settings.keyBindings.insertWithoutSpace)) {
        e.preventDefault();
        e.stopPropagation();
        selectByIndex(selectedIndex);
        return;
      }
      if (eventMatchesAny(e, settings.keyBindings.closeMenu)) {
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
        themeToClass(settings.theme ?? "dark"),
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
          className={cn(
            "wordserve-menu-container",
            settings.compactMode ? "compact" : "",
            themeToClass(settings.theme ?? "dark")
          )}
        >
          <div
            ref={menuRef}
            className={cn(
              "wordserve-autocomplete-menu",
              settings.menuBorder ? "" : "no-border",
              settings.menuBorderRadius ? "" : "no-radius",
              settings.allowMouseInteractions === false ? "ws-no-mouse" : ""
            )}
            style={{
              fontSize: `${fontSize}px`,
              fontWeight: getFontWeight(settings.fontWeight as any, settings.fontBold),
              fontStyle: settings.fontItalic ? "italic" : "normal",
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
              pointerEvents:
                settings.allowMouseInteractions === false ? ("none" as const) : undefined,
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
                    "wordserve-menu-item",
                    isSelected ? "selected" : "",
                    settings.rankingPosition === "right" ? "justify-between" : ""
                  )}
                  style={{
                    height: `${rowHeight}px`,
                    paddingLeft: settings.rankingPosition === "left" ? 0 : undefined,
                  }}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => {
                    if (settings.allowMouseInteractions !== false) {
                      setSelectedIndex(index);
                    }
                  }}
                  onMouseDown={(e) => {
                    if (settings.allowMouseInteractions === false) return;
                    e.preventDefault();
                    if (settings.allowMouseInsert !== false) {
                      selectByIndex(index);
                    }
                  }}
                >
                  {settings.rankingPosition === "left" && (
                    <div className="wordserve-menu-item-content">
                      {showRanking && (
                        <span
                          className="wordserve-menu-item-rank"
                          style={{
                            borderColor:
                              settings.accessibility.rankingColor || undefined,
                            color:
                              settings.accessibility.rankingColor || undefined,
                          }}
                        >
                          {settings.numberSelection ? index + 1 : suggestion.rank}
                        </span>
                      )}
                      <span className="wordserve-menu-item-word truncate">
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
                      <div className="wordserve-menu-item-content">
                        <span className="wordserve-menu-item-word truncate">
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
                      {showRanking && (
                        <span
                          className="wordserve-menu-item-rank"
                          style={{
                            borderColor:
                              settings.accessibility.rankingColor || undefined,
                            color:
                              settings.accessibility.rankingColor || undefined,
                          }}
                        >
                          {settings.numberSelection ? index + 1 : suggestion.rank}
                        </span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
