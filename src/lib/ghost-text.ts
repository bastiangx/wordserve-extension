interface GhostTextState {
  element: HTMLElement;
  ghostText: string;
  position: number;
  ghostElement?: HTMLElement;
}

export class GhostTextManager {
  private states = new Map<HTMLElement, GhostTextState>();
  private boundScrollHandler: () => void;
  private boundResizeHandler: () => void;

  constructor() {
    this.boundScrollHandler = this.handleScrollOrResize.bind(this);
    this.boundResizeHandler = this.handleScrollOrResize.bind(this);
  }

  public setGhostText(element: HTMLElement, position: number, text: string): void {
    if (!text) {
      this.clearGhostText(element);
      return;
    }

    // Clear any existing ghost text first
    this.clearGhostText(element);

    const state: GhostTextState = {
      element,
      ghostText: text,
      position,
    };

    if (this.isInputElement(element)) {
      this.setGhostTextForInput(state);
    } else if (this.isContentEditable(element)) {
      this.setGhostTextForContentEditable(state);
    }

    this.states.set(element, state);
  }

  public clearGhostText(element: HTMLElement): void {
    const state = this.states.get(element);
    if (state?.ghostElement) {
      state.ghostElement.remove();
    }
    this.states.delete(element);
  }

  public clearAllGhostText(): void {
    for (const [element] of this.states) {
      this.clearGhostText(element);
    }
  }

  private setGhostTextForInput(state: GhostTextState): void {
    const input = state.element as HTMLInputElement | HTMLTextAreaElement;
    const ghostElement = this.createGhostElement(state.ghostText);

    // Position the ghost text relative to the input
    this.positionGhostElement(input, ghostElement, state.position, state.ghostText);

    // Insert into DOM
    this.insertGhostElement(input, ghostElement);
    state.ghostElement = ghostElement;
  }

  private setGhostTextForContentEditable(state: GhostTextState): void {
    const element = state.element;
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const ghostElement = this.createGhostElement(state.ghostText);

    // Insert the ghost text at the current cursor position
    try {
      const clonedRange = range.cloneRange();
      clonedRange.collapse(false); // Move to end of range
      clonedRange.insertNode(ghostElement);

      // Restore the original selection
      selection.removeAllRanges();
      selection.addRange(range);

      state.ghostElement = ghostElement;
    } catch (error) {
      console.warn("Failed to insert ghost text in contenteditable:", error);
    }
  }

  private createGhostElement(text: string): HTMLElement {
    const span = document.createElement('span');
    span.className = 'wordserve-ghost-text';
    span.textContent = text;
    // Remove inline styles - rely solely on CSS class for consistent theming
    return span;
  }

  private positionGhostElement(
    input: HTMLInputElement | HTMLTextAreaElement,
    ghostElement: HTMLElement,
    position: number,
    ghostText: string
  ): void {
    try {
      // Get the input rect and styles
      const inputRect = input.getBoundingClientRect();
      const inputStyles = window.getComputedStyle(input);
      const currentValue = input.value;

      // Calculate text width up to cursor position using canvas for accuracy
      const textUpToCursor = currentValue.substring(0, position);
      const textWidth = this.getTextWidth(textUpToCursor, inputStyles);

      // Parse layout values
      const paddingLeft = parseFloat(inputStyles.paddingLeft) || 0;
      const paddingTop = parseFloat(inputStyles.paddingTop) || 0;
      const borderLeftWidth = parseFloat(inputStyles.borderLeftWidth) || 0;
      const borderTopWidth = parseFloat(inputStyles.borderTopWidth) || 0;
      const scrollLeft = input.scrollLeft || 0;
      const scrollTop = input.scrollTop || 0;

      // Calculate final position relative to viewport
      const x = inputRect.left + paddingLeft + borderLeftWidth + textWidth - scrollLeft;
      const y = inputRect.top + paddingTop + borderTopWidth - scrollTop;

      // Apply positioning and font styles to match input
      ghostElement.style.left = `${x}px`;
      ghostElement.style.top = `${y}px`;
      ghostElement.style.fontSize = inputStyles.fontSize;
      ghostElement.style.fontFamily = inputStyles.fontFamily;
      ghostElement.style.fontWeight = inputStyles.fontWeight;
      ghostElement.style.letterSpacing = inputStyles.letterSpacing;
      ghostElement.style.lineHeight = inputStyles.lineHeight;

    } catch (error) {
      console.warn('Failed to position ghost text:', error);
    }
  }

  private getTextWidth(text: string, styles: CSSStyleDeclaration): number {
    if (!text) return 0;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) return 0;

    // Set font properties to match input element exactly
    const fontStyle = styles.fontStyle || 'normal';
    const fontWeight = styles.fontWeight || 'normal';
    const fontSize = styles.fontSize || '16px';
    const fontFamily = styles.fontFamily || 'monospace';

    context.font = `${fontStyle} ${fontWeight} ${fontSize} ${fontFamily}`;

    // Apply letter spacing if present
    const letterSpacing = parseFloat(styles.letterSpacing) || 0;
    const metrics = context.measureText(text);

    // Add letter spacing to the width calculation
    return metrics.width + (letterSpacing * (text.length - 1));
  }

  private insertGhostElement(input: HTMLElement, ghostElement: HTMLElement): void {
    // Always append to document.body for consistent viewport-relative positioning
    // This aligns with the getBoundingClientRect positioning logic
    document.body.appendChild(ghostElement);
  }

  private isInputElement(element: HTMLElement): boolean {
    return element.tagName === 'INPUT' || element.tagName === 'TEXTAREA';
  }

  private isContentEditable(element: HTMLElement): boolean {
    return element.contentEditable === 'true' ||
      element.isContentEditable ||
      element.getAttribute('contenteditable') === 'true';
  }

  public updateGhostTextPosition(element: HTMLElement): void {
    const state = this.states.get(element);
    if (!state || !state.ghostElement) return;

    if (this.isInputElement(element)) {
      const input = element as HTMLInputElement | HTMLTextAreaElement;
      this.positionGhostElement(input, state.ghostElement, state.position, state.ghostText);
    }
  }

  // Listen for scroll and resize events to update positions
  public setupEventListeners(): void {
    window.addEventListener('scroll', this.boundScrollHandler, true);
    window.addEventListener('resize', this.boundResizeHandler);
  }

  private handleScrollOrResize(): void {
    for (const [element] of this.states) {
      this.updateGhostTextPosition(element);
    }
  }

  public destroy(): void {
    this.clearAllGhostText();
    window.removeEventListener('scroll', this.boundScrollHandler, true);
    window.removeEventListener('resize', this.boundResizeHandler);
  }
}

export const ghostTextManager = new GhostTextManager();
