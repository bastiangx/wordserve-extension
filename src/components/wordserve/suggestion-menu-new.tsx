import React from "react";

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
      className={`wordserve-suggestion-menu ${compactMode ? 'compact' : ''} ${className || ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {suggestions.map((suggestion, index) => {
        const prefix = suggestion.word.substring(0, currentWord.length);
        const suffix = suggestion.word.substring(currentWord.length);
        const isSelected = index === selectedIndex;

        return (
          <div
            key={`${suggestion.word}-${index}`}
            className={`wordserve-suggestion-item ${isSelected ? 'selected' : ''}`}
            onClick={() => handleItemClick(index)}
            data-index={index}
          >
            <div className="wordserve-suggestion-word">
              <span className="wordserve-suggestion-prefix">
                {prefix}
              </span>
              <span className="wordserve-suggestion-suffix">
                {suffix}
              </span>
            </div>
            
            {(showNumbers || showRanking) && (
              <div className="wordserve-suggestion-meta">
                {showNumbers && (
                  <span className="wordserve-suggestion-number">
                    {index + 1}
                  </span>
                )}
                {showRanking && (
                  <span className="wordserve-suggestion-rank">
                    #{suggestion.rank}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
