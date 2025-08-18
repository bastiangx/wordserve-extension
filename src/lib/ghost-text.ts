import { getCaretCoordinates, getCaretCoordinatesContentEditable } from '@/lib/caret';

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
    
    // Copy exact font properties from input
    const inputStyles = window.getComputedStyle(input);
    ghostElement.style.fontSize = inputStyles.fontSize;
    ghostElement.style.fontFamily = inputStyles.fontFamily;
    ghostElement.style.fontWeight = inputStyles.fontWeight;
    ghostElement.style.letterSpacing = inputStyles.letterSpacing;
    ghostElement.style.lineHeight = inputStyles.lineHeight;
    ghostElement.style.padding = '0';
    ghostElement.style.margin = '0';
    ghostElement.style.border = 'none';
    
    // Just use the caret coordinates directly - they're already accurate
    const caretCoords = getCaretCoordinates(input);
    
    // Position ghost text exactly at the caret position
    ghostElement.style.left = `${caretCoords.x}px`;
    ghostElement.style.top = `${caretCoords.y}px`;
    
    console.log('WordServe: Direct caret positioning:', {
      caretCoords,
      ghostText: state.ghostText,
      position: state.position
    });

    this.insertGhostElement(input, ghostElement);
    state.ghostElement = ghostElement;
  }  private setGhostTextForContentEditable(state: GhostTextState): void {
    const element = state.element;
    const ghostElement = this.createGhostElement(state.ghostText);
    
    // Use the existing caret coordinate system for contenteditable
    const caretCoords = getCaretCoordinatesContentEditable(element);
    
    // Apply font styles to match element
    const elementStyles = window.getComputedStyle(element);
    ghostElement.style.fontSize = elementStyles.fontSize;
    ghostElement.style.fontFamily = elementStyles.fontFamily;
    ghostElement.style.fontWeight = elementStyles.fontWeight;
    ghostElement.style.letterSpacing = elementStyles.letterSpacing;
    ghostElement.style.lineHeight = elementStyles.lineHeight;
    
    // Position the ghost text at the caret position
    ghostElement.style.left = `${caretCoords.x}px`;
    ghostElement.style.top = `${caretCoords.y}px`;

    // Insert into DOM
    this.insertGhostElement(element, ghostElement);
    state.ghostElement = ghostElement;
  }

  private createGhostElement(text: string): HTMLElement {
    const span = document.createElement('span');
    span.className = 'wordserve-ghost-text';
    span.textContent = text;
    
    // Ensure basic positioning styles are set
    span.style.position = 'absolute';
    span.style.pointerEvents = 'none';
    span.style.userSelect = 'none';
    span.style.whiteSpace = 'nowrap';
    span.style.zIndex = '9999';
    span.style.color = 'rgba(128, 128, 128, 0.6)'; // Fallback color
    
    console.log('WordServe: Created ghost element:', span);
    return span;
  }

  public updateGhostTextPosition(element: HTMLElement): void {
    const state = this.states.get(element);
    if (!state || !state.ghostElement) return;

    if (this.isInputElement(element)) {
      const input = element as HTMLInputElement | HTMLTextAreaElement;
      
      // Use direct caret coordinates for both X and Y
      const caretCoords = getCaretCoordinates(input);
      state.ghostElement.style.left = `${caretCoords.x}px`;
      state.ghostElement.style.top = `${caretCoords.y}px`;
    } else if (this.isContentEditable(element)) {
      const caretCoords = getCaretCoordinatesContentEditable(element);
      state.ghostElement.style.left = `${caretCoords.x}px`;
      state.ghostElement.style.top = `${caretCoords.y}px`;
    }
  }

  private insertGhostElement(input: HTMLElement, ghostElement: HTMLElement): void {
    // Always append to document.body for consistent viewport-relative positioning
    document.body.appendChild(ghostElement);
  }

  private createMeasurementElement(input: HTMLInputElement | HTMLTextAreaElement, text: string): HTMLElement {
    // Create a hidden span instead of input clone for more accurate text measurement
    const measureEl = document.createElement('span');
    const inputStyles = window.getComputedStyle(input);
    
    // Copy all text-affecting styles exactly
    measureEl.style.position = 'absolute';
    measureEl.style.visibility = 'hidden';
    measureEl.style.height = 'auto';
    measureEl.style.width = 'auto';
    measureEl.style.whiteSpace = 'pre';
    measureEl.style.fontSize = inputStyles.fontSize;
    measureEl.style.fontFamily = inputStyles.fontFamily;
    measureEl.style.fontWeight = inputStyles.fontWeight;
    measureEl.style.letterSpacing = inputStyles.letterSpacing;
    measureEl.style.textTransform = inputStyles.textTransform;
    measureEl.style.wordSpacing = inputStyles.wordSpacing;
    measureEl.style.textIndent = inputStyles.textIndent;
    measureEl.style.padding = '0';
    measureEl.style.border = 'none';
    measureEl.style.margin = '0';
    measureEl.style.lineHeight = inputStyles.lineHeight;
    
    // Use textContent instead of value for spans
    measureEl.textContent = text;
    document.body.appendChild(measureEl);
    
    console.log('WordServe: Measurement element created:', {
      text,
      element: measureEl,
      computedStyles: {
        fontSize: measureEl.style.fontSize,
        fontFamily: measureEl.style.fontFamily,
        fontWeight: measureEl.style.fontWeight
      },
      measuredWidth: measureEl.getBoundingClientRect().width,
      scrollWidth: measureEl.scrollWidth,
      offsetWidth: measureEl.offsetWidth
    });
    
    return measureEl;
  }

  private isInputElement(element: HTMLElement): boolean {
    return element.tagName === 'INPUT' || element.tagName === 'TEXTAREA';
  }

  private isContentEditable(element: HTMLElement): boolean {
    return element.contentEditable === 'true' ||
      element.isContentEditable ||
      element.getAttribute('contenteditable') === 'true';
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
