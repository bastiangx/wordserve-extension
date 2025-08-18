/**
 * React hook for ghost text functionality
 */

import { useEffect, useRef, useCallback } from "react";
import { GhostTextManager, GhostTextOptions } from "../lib/ghost-text";

interface UseGhostTextOptions extends Omit<GhostTextOptions, "getSuggestion"> {
  getSuggestion: (text: string, signal: AbortSignal) => Promise<string | null>;
  enabled?: boolean;
}

export function useGhostText<T extends HTMLElement>(
  options: UseGhostTextOptions
) {
  const elementRef = useRef<T>(null);
  const managerRef = useRef<GhostTextManager | null>(null);
  const { getSuggestion, enabled = true, ...ghostOptions } = options;

  const attachGhostText = useCallback(() => {
    if (!elementRef.current || !enabled) return;

    // Clean up existing manager
    if (managerRef.current) {
      managerRef.current.destroy();
      managerRef.current = null;
    }

    try {
      managerRef.current = new GhostTextManager(elementRef.current, {
        ...ghostOptions,
        getSuggestion,
      });
    } catch (error) {
      console.warn("Failed to attach ghost text:", error);
    }
  }, [enabled, getSuggestion, ghostOptions]);

  const detachGhostText = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.destroy();
      managerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      attachGhostText();
    } else {
      detachGhostText();
    }

    return detachGhostText;
  }, [enabled, attachGhostText, detachGhostText]);

  useEffect(() => {
    return () => {
      detachGhostText();
    };
  }, [detachGhostText]);

  return elementRef;
}

// Example usage:
// const MyInput = () => {
//   const inputRef = useGhostText<HTMLInputElement>({
//     getSuggestion: async (text, signal) => {
//       // Your suggestion logic here
//       return "suggested text";
//     },
//     debounceMs: 300,
//     acceptKey: 'Tab',
//     rejectKey: 'Escape'
//   });
//
//   return <input ref={inputRef} type="text" />;
// };
