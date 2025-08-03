import type { InputState } from "./dom";

export interface KeyboardHandlerCallbacks {
  onNavigate: (direction: number) => void;
  onCommit: (addSpace: boolean) => void;
  onHide: () => void;
  onSelectByNumber: (index: number) => void;
}

export interface KeyboardHandlerSettings {
  numberSelection: boolean;
  autoInsertionCommitMode: "enter-only" | "space-commits" | "disabled";
  smartBackspace: boolean;
}

export class KeyboardHandler {
  private element: HTMLElement;
  private inputState: InputState;
  private callbacks: KeyboardHandlerCallbacks;
  private settings: KeyboardHandlerSettings;
  private boundKeyDownHandler: (event: KeyboardEvent) => void;

  constructor(
    element: HTMLElement,
    inputState: InputState,
    callbacks: KeyboardHandlerCallbacks,
    settings: KeyboardHandlerSettings
  ) {
    this.element = element;
    this.inputState = inputState;
    this.callbacks = callbacks;
    this.settings = settings;
    this.boundKeyDownHandler = this.handleKeyDown.bind(this);
    this.attach();
  }

  private attach() {
    this.element.addEventListener("keydown", this.boundKeyDownHandler);
  }

  public detach() {
    this.element.removeEventListener("keydown", this.boundKeyDownHandler);
  }

  public updateSettings(newSettings: KeyboardHandlerSettings) {
    this.settings = newSettings;
  }

  private handleKeyDown(event: KeyboardEvent) {
    // Only handle keys when menu is active
    if (!this.inputState.isActive) return;

    // Number selection (1-9)
    if (this.settings.numberSelection && event.key >= "1" && event.key <= "9") {
      const index = parseInt(event.key) - 1;
      if (index < this.inputState.suggestions.length) {
        event.preventDefault();
        event.stopPropagation();
        this.callbacks.onSelectByNumber(index);
        return;
      }
    }

    // Handle specific keys
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        event.stopPropagation();
        this.callbacks.onNavigate(1);
        break;

      case "ArrowUp":
        event.preventDefault();
        event.stopPropagation();
        this.callbacks.onNavigate(-1);
        break;

      case "Enter":
        if (
          this.settings.autoInsertionCommitMode === "enter-only" ||
          this.settings.autoInsertionCommitMode === "space-commits"
        ) {
          event.preventDefault();
          event.stopPropagation();
          this.callbacks.onCommit(false);
        }
        break;

      case "Tab":
        event.preventDefault();
        event.stopPropagation();
        this.callbacks.onCommit(true);
        break;

      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        this.callbacks.onHide();
        break;

      case " ":
        if (this.settings.autoInsertionCommitMode === "space-commits") {
          event.preventDefault();
          event.stopPropagation();
          this.callbacks.onCommit(true);
        }
        break;

      // Let other keys pass through (like Backspace, letters, etc.)
      default:
        break;
    }
  }

  /**
   * Get the list of keys that this handler manages
   * This is useful for other systems to know which keys are being handled
   */
  public getManagedKeys(): string[] {
    const keys = ["ArrowUp", "ArrowDown", "Tab", "Escape"];
    
    if (this.settings.numberSelection) {
      keys.push(...["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
    }

    if (
      this.settings.autoInsertionCommitMode === "enter-only" ||
      this.settings.autoInsertionCommitMode === "space-commits"
    ) {
      keys.push("Enter");
    }

    if (this.settings.autoInsertionCommitMode === "space-commits") {
      keys.push(" ");
    }
    return keys;
  }

  /**
   * Check if a given key should be handled by this handler
   */
  public shouldHandleKey(key: string): boolean {
    return this.getManagedKeys().includes(key);
  }
}
