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
    console.log('WordServe setGhostText called:', {
      element: element.tagName,
      position,
      text,
      textLength: text.length
    });
    
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
      console.log('WordServe: Setting ghost text for input element');
      this.setGhostTextForInput(state);
    } else if (this.isContentEditable(element)) {
      console.log('WordServe: Setting ghost text for contenteditable element');
      this.setGhostTextForContentEditable(state);
    } else {
      console.log('WordServe: Element is neither input nor contenteditable');
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
    
    console.log('WordServe: Getting caret coordinates for input');
    // Use the existing caret coordinate system for consistent positioning
    const caretCoords = getCaretCoordinates(input);
    console.log('WordServe: Caret coordinates:', caretCoords);
    
    // Position the ghost text at the caret position
    ghostElement.style.left = `${caretCoords.x}px`;
    ghostElement.style.top = `${caretCoords.y}px`;
    
    // Apply font styles to match input
    const inputStyles = window.getComputedStyle(input);
    ghostElement.style.fontSize = inputStyles.fontSize;
    ghostElement.style.fontFamily = inputStyles.fontFamily;
    ghostElement.style.fontWeight = inputStyles.fontWeight;
    ghostElement.style.letterSpacing = inputStyles.letterSpacing;
    ghostElement.style.lineHeight = inputStyles.lineHeight;

    console.log('WordServe: Inserting ghost element into DOM');
    // Insert into DOM
    this.insertGhostElement(input, ghostElement);
    state.ghostElement = ghostElement;
    console.log('WordServe: Ghost element inserted, state saved');
  }  private setGhostTextForContentEditable(state: GhostTextState): void {
    const element = state.element;
    const ghostElement = this.createGhostElement(state.ghostText);
    
    // Use the existing caret coordinate system for contenteditable
    const caretCoords = getCaretCoordinatesContentEditable(element);
    
    // Position the ghost text at the caret position
    ghostElement.style.left = `${caretCoords.x}px`;
    ghostElement.style.top = `${caretCoords.y}px`;
    
    // Apply font styles to match element
    const elementStyles = window.getComputedStyle(element);
    ghostElement.style.fontSize = elementStyles.fontSize;
    ghostElement.style.fontFamily = elementStyles.fontFamily;
    ghostElement.style.fontWeight = elementStyles.fontWeight;
    ghostElement.style.letterSpacing = elementStyles.letterSpacing;
    ghostElement.style.lineHeight = elementStyles.lineHeight;

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
