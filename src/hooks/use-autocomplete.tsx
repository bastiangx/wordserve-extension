import { useState, useEffect, useCallback } from "react";
import type { WordServeSettings } from "@/types";
import type { AutocompleteSuggestion } from "@/components/autocomplete-menu";

export interface UseAutocompleteOptions {
  settings: WordServeSettings;
  onSuggestionSelect?: (suggestion: AutocompleteSuggestion, addSpace?: boolean) => void;
  minWordLength?: number;
}

export interface UseAutocompleteReturn {
  suggestions: AutocompleteSuggestion[];
  isOpen: boolean;
  selectedIndex: number;
  currentWord: string;
  onOpenChange: (open: boolean) => void;
  onSuggestionSelect: (suggestion: AutocompleteSuggestion, addSpace?: boolean) => void;
  onNavigate: (direction: "up" | "down") => void;
  onSelectByNumber: (index: number) => void;
}

export function useAutocomplete({
  settings,
  onSuggestionSelect,
  minWordLength = 3,
}: UseAutocompleteOptions): UseAutocompleteReturn {
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState("");

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  // Close menu when no suggestions
  useEffect(() => {
    if (suggestions.length === 0) {
      setIsOpen(false);
    }
  }, [suggestions]);

  const onOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSuggestions([]);
      setCurrentWord("");
    }
  }, []);

  const handleSuggestionSelect = useCallback(
    (suggestion: AutocompleteSuggestion, addSpace?: boolean) => {
      onSuggestionSelect?.(suggestion, addSpace);
      onOpenChange(false);
    },
    [onSuggestionSelect, onOpenChange]
  );

  const onNavigate = useCallback(
    (direction: "up" | "down") => {
      if (suggestions.length === 0) return;

      setSelectedIndex((prev) => {
        if (direction === "down") {
          return prev < suggestions.length - 1 ? prev + 1 : 0;
        } else {
          return prev > 0 ? prev - 1 : suggestions.length - 1;
        }
      });
    },
    [suggestions.length]
  );

  const onSelectByNumber = useCallback(
    (index: number) => {
      if (index >= 0 && index < suggestions.length) {
        handleSuggestionSelect(suggestions[index], false);
      }
    },
    [suggestions, handleSuggestionSelect]
  );

  // Update current word and fetch suggestions
  const updateWord = useCallback(
    async (word: string) => {
      setCurrentWord(word);

      if (word.length < minWordLength) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      try {
        // This would be replaced with actual WASM call
        const mockSuggestions: AutocompleteSuggestion[] = [
          { id: "1", word: `${word}ing`, rank: 1 },
          { id: "2", word: `${word}ed`, rank: 2 },
          { id: "3", word: `${word}er`, rank: 3 },
        ];

        setSuggestions(mockSuggestions.slice(0, settings.maxSuggestions));
        setIsOpen(mockSuggestions.length > 0);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSuggestions([]);
        setIsOpen(false);
      }
    },
    [minWordLength, settings.maxSuggestions]
  );

  return {
    suggestions,
    isOpen,
    selectedIndex,
    currentWord,
    onOpenChange,
    onSuggestionSelect: handleSuggestionSelect,
    onNavigate,
    onSelectByNumber,
    updateWord,
  } as UseAutocompleteReturn & { updateWord: (word: string) => Promise<void> };
}
