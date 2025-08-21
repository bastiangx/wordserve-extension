export interface SmartBackspaceState {
  lastCommittedWord: string;
  originalWord: string;
  commitPosition: number;
  elementId: string;
  timestamp: number; // Add timestamp for better tracking
}

export class SmartBackspace {
  private elementStates = new Map<string, SmartBackspaceState>(); // One state per element

  public recordCommit(
    element: HTMLElement,
    committedWord: string,
    originalWord: string,
    position: number
  ): void {
    const elementId = this.getElementId(element);
    
    // Store only the most recent commit for this element
    this.elementStates.set(elementId, {
      lastCommittedWord: committedWord,
      originalWord: originalWord,
      commitPosition: position,
      elementId: elementId,
      timestamp: Date.now(),
    });

    console.log("WordServe: SmartBackspace recorded commit:", {
      committedWord,
      originalWord,
      position,
      elementId,
    });
  }

  public invalidateForElement(element: HTMLElement): void {
    const elementId = this.getElementId(element);
    this.elementStates.delete(elementId);
    console.log("WordServe: SmartBackspace invalidated for element:", elementId);
  }

  public canRestore(
    element: HTMLElement,
    currentPosition: number
  ): SmartBackspaceState | null {
    const elementId = this.getElementId(element);
    const state = this.elementStates.get(elementId);

    if (!state) {
      console.log("WordServe: SmartBackspace - no state found for element:", elementId);
      return null;
    }

    // Check if the current position is exactly at the end of the committed word
    if (currentPosition === state.commitPosition) {
      console.log("WordServe: SmartBackspace - can restore:", state);
      return state;
    }

    console.log("WordServe: SmartBackspace - position mismatch. Current:", currentPosition, "Expected:", state.commitPosition);
    return null;
  }

  public restore(element: HTMLElement, state: SmartBackspaceState): void {
    if (this.isInputElement(element)) {
      this.restoreInInput(
        element as HTMLInputElement | HTMLTextAreaElement,
        state
      );
    } else if (this.isContentEditable(element)) {
      this.restoreInContentEditable(element, state);
    }
    
    // Remove the state after successful restore
    const elementId = this.getElementId(element);
    this.elementStates.delete(elementId);
  }

  private restoreInInput(
    input: HTMLInputElement | HTMLTextAreaElement,
    state: SmartBackspaceState
  ): void {
    try {
      const currentValue = input.value;
      const wordStart = state.commitPosition - state.lastCommittedWord.length;
      const wordEnd = state.commitPosition;
      if (
        wordStart < 0 ||
        wordEnd > currentValue.length ||
        wordStart > wordEnd
      ) {
        return;
      }

      // Check if there's a space after the committed word that was added during commit
      const hasSpaceAfter =
        wordEnd < currentValue.length && currentValue[wordEnd] === " ";
      const actualWordEnd = hasSpaceAfter ? wordEnd + 1 : wordEnd;
      const beforeWord = currentValue.substring(0, wordStart);
      const afterWord = currentValue.substring(actualWordEnd);
      const newValue = beforeWord + state.originalWord + afterWord;
      input.value = newValue;
      // Set cursor position after the restored word
      const newCursorPos = wordStart + state.originalWord.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    } catch (error) {
      console.error("Failed to restore word in input:", error);
    }
  }

  private restoreInContentEditable(
    element: HTMLElement,
    state: SmartBackspaceState
  ): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    try {
      // Find the text node and position where the word was committed
      const wordStart = state.commitPosition - state.lastCommittedWord.length;
      const textNode = this.findTextNodeAtPosition(element, wordStart);

      if (!textNode) return;

      const nodeOffset = wordStart - this.getTextNodeOffset(element, textNode);
      const wordEndInNode = nodeOffset + state.lastCommittedWord.length;
      const nodeText = textNode.textContent || "";
      const hasSpaceAfter =
        wordEndInNode < nodeText.length && nodeText[wordEndInNode] === " ";
      const actualWordEndInNode = hasSpaceAfter
        ? wordEndInNode + 1
        : wordEndInNode;

      // Replace the committed word (and space if present) with the original word
      const newText =
        nodeText.substring(0, nodeOffset) +
        state.originalWord +
        nodeText.substring(actualWordEndInNode);

      textNode.textContent = newText;
      // Set cursor position after the restored word
      const newCursorPos = nodeOffset + state.originalWord.length;
      const range = document.createRange();
      range.setStart(textNode, newCursorPos);
      range.setEnd(textNode, newCursorPos);

      selection.removeAllRanges();
      selection.addRange(range);
    } catch (error) {
      console.error("Failed to restore word in contenteditable:", error);
    }
  }

  public clearState(element: HTMLElement): void {
    const elementId = this.getElementId(element);
    this.elementStates.delete(elementId);
  }

  public clearAllStates(): void {
    this.elementStates.clear();
  }

  public getStateCount(): number {
    return this.elementStates.size;
  }

  private getElementId(element: HTMLElement): string {
    if (element.id) {
      return `id:${element.id}`;
    }
    // Use element's position in the DOM as fallback
    const path = this.getElementPath(element);
    return `path:${path}`;
  }

  private getElementPath(element: HTMLElement): string {
    const path: string[] = [];
    let current: Element | null = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      }
      if (current.className && typeof current.className === "string") {
        const classes = current.className.trim().split(/\s+/).filter(Boolean);
        if (classes.length > 0) {
          selector += `.${classes.join(".")}`;
        }
      }
      // Add nth-child only if there are multiple siblings of same tag
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          (child) => child.tagName === current!.tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-child(${index})`;
        }
      }
      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(" > ");
  }

  private isInputElement(element: HTMLElement): boolean {
    return element.tagName === "INPUT" || element.tagName === "TEXTAREA";
  }

  private isContentEditable(element: HTMLElement): boolean {
    return (
      element.contentEditable === "true" ||
      element.isContentEditable ||
      element.getAttribute("contenteditable") === "true"
    );
  }

  private findTextNodeAtPosition(
    element: HTMLElement,
    position: number
  ): Text | null {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );

    let currentPos = 0;
    let node: Text | null = null;

    while ((node = walker.nextNode() as Text)) {
      const nodeLength = node.textContent?.length || 0;
      if (currentPos + nodeLength > position) {
        return node;
      }
      currentPos += nodeLength;
    }
    return null;
  }

  private getTextNodeOffset(element: HTMLElement, targetNode: Text): number {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );
    let offset = 0;
    let node: Text | null = null;

    while ((node = walker.nextNode() as Text)) {
      if (node === targetNode) {
        return offset;
      }
      offset += node.textContent?.length || 0;
    }
    return offset;
  }
}

export const smartBackspace = new SmartBackspace();
