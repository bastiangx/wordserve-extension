export interface CaretPosition {
  x: number;
  y: number;
  height: number;
}

export interface CaretBounds {
  top: number;
  left: number;
  bottom: number;
  right: number;
  height: number;
  width: number;
}

/**
 * Get the precise pixel coordinates of the caret in a text input or textarea
 */
export function getCaretCoordinates(
  element: HTMLInputElement | HTMLTextAreaElement
): CaretPosition {
  const { selectionStart, selectionEnd } = element;

  if (selectionStart === null || selectionEnd === null) {
    return { x: 0, y: 0, height: 16 };
  }

  // Create a mirror div to measure text
  const mirror = document.createElement("div");
  const computedStyle = window.getComputedStyle(element);

  // Copy all relevant styles
  const stylesToCopy = [
    "fontFamily",
    "fontSize",
    "fontWeight",
    "fontStyle",
    "letterSpacing",
    "textTransform",
    "wordSpacing",
    "textIndent",
    "whiteSpace",
    "lineHeight",
    "padding",
    "border",
    "boxSizing",
    "width",
  ];

  stylesToCopy.forEach((prop) => {
    mirror.style[prop as any] = computedStyle[prop as any];
  });

  // Additional styles for accurate measurement
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.height = "auto";
  mirror.style.minHeight = "auto";
  mirror.style.maxHeight = "none";
  mirror.style.overflow = "hidden";
  mirror.style.zIndex = "-1000";

  document.body.appendChild(mirror);

  try {
    const value = element.value;
    const textBeforeCaret = value.substring(0, selectionStart);
    const textAtCaret =
      value.substring(selectionStart, selectionStart + 1) || "|";

    // Set text with a marker at caret position
    mirror.textContent = textBeforeCaret;

    // Create marker element
    const marker = document.createElement("span");
    marker.textContent = textAtCaret;
    marker.style.position = "relative";
    mirror.appendChild(marker);

    // Add remaining text
    const remainingText = document.createTextNode(
      value.substring(selectionStart + 1)
    );
    mirror.appendChild(remainingText);

    // Get element position
    const elementRect = element.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    const mirrorRect = mirror.getBoundingClientRect();

    // Calculate relative position
    const x =
      elementRect.left +
      (markerRect.left - mirrorRect.left) +
      element.scrollLeft;
    const y =
      elementRect.top + (markerRect.top - mirrorRect.top) + element.scrollTop;
    const height =
      markerRect.height || parseInt(computedStyle.lineHeight) || 16;

    return { x, y, height };
  } finally {
    document.body.removeChild(mirror);
  }
}

/**
 * Get caret position for contenteditable elements
 */
export function getCaretCoordinatesContentEditable(
  element: HTMLElement
): CaretPosition {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return { x: 0, y: 0, height: 16 };
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  if (rect.width === 0 && rect.height === 0) {
    // Fallback: create a temporary element at caret position
    const marker = document.createElement("span");
    marker.style.position = "absolute";
    marker.textContent = "|";

    try {
      range.insertNode(marker);
      const markerRect = marker.getBoundingClientRect();
      marker.remove();

      return {
        x: markerRect.left,
        y: markerRect.top,
        height: markerRect.height || 16,
      };
    } catch {
      // Fallback to element position
      const elementRect = element.getBoundingClientRect();
      return {
        x: elementRect.left,
        y: elementRect.top,
        height: 16,
      };
    }
  }

  return {
    x: rect.left,
    y: rect.top,
    height: rect.height || 16,
  };
}

/**
 * Calculate optimal menu position based on caret position and viewport
 */
export function calculateMenuPosition(
  caretPos: CaretPosition,
  menuSize: { width: number; height: number },
  viewport: { width: number; height: number } = {
    width: window.innerWidth,
    height: window.innerHeight,
  }
): { x: number; y: number; placement: "above" | "below" } {
  const padding = 8;

  // Check if menu fits below caret
  const spaceBelow = viewport.height - (caretPos.y + caretPos.height);
  const spaceAbove = caretPos.y;

  let y: number;
  let placement: "above" | "below";

  if (spaceBelow >= menuSize.height + padding) {
    // Place below
    y = caretPos.y + caretPos.height + padding;
    placement = "below";
  } else if (spaceAbove >= menuSize.height + padding) {
    // Place above
    y = caretPos.y - menuSize.height - padding;
    placement = "above";
  } else {
    // Not enough space either way, prefer below and let menu scroll
    y = Math.min(
      caretPos.y + caretPos.height + padding,
      viewport.height - menuSize.height - padding
    );
    placement = "below";
  }

  // Horizontal positioning
  let x = caretPos.x;

  // Ensure menu doesn't go off-screen horizontally
  if (x + menuSize.width > viewport.width - padding) {
    x = viewport.width - menuSize.width - padding;
  }
  if (x < padding) {
    x = padding;
  }

  return { x, y, placement };
}
