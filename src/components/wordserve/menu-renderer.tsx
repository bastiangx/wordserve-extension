import { createRoot, Root } from "react-dom/client";
import {
  SuggestionMenu,
  Suggestion,
  SuggestionMenuProps,
} from "./suggestion-menu";

export class ReactSuggestionMenuRenderer {
  private root: Root | null = null;
  private container: HTMLElement | null = null;

  render(props: SuggestionMenuProps) {
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.className = "wordserve-menu-container";
      document.body.appendChild(this.container);
      this.root = createRoot(this.container);
    }

    if (this.root) {
      this.root.render(<SuggestionMenu {...props} />);
    }
  }

  hide() {
    if (this.root && this.container) {
      this.root.unmount();
      this.container.remove();
      this.root = null;
      this.container = null;
    }
  }

  updateSelection(
    selectedIndex: number,
    suggestions: Suggestion[],
    currentWord: string,
    position: { x: number; y: number },
    onSelect: (index: number) => void,
    onClose: () => void,
    options?: Partial<SuggestionMenuProps>
  ) {
    if (this.root) {
      this.render({
        suggestions,
        selectedIndex,
        currentWord,
        position,
        onSelect,
        onClose,
        ...options,
      });
    }
  }
}

export { SuggestionMenu, type Suggestion, type SuggestionMenuProps };
