// @ts-nocheck

import React from "react";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SuggestionMenu } from "../../src/components/wordserve/menu";

Object.defineProperty(globalThis, "scrollY", { value: 0, writable: true });

describe("SuggestionMenu", () => {
  afterEach(() => cleanup());
  const baseProps = {
    suggestions: [
      { word: "apple", rank: 1 },
      { word: "banana", rank: 2 },
      { word: "orange", rank: 3 },
    ],
    selectedIndex: 0,
    currentWord: "a",
    position: { x: 0, y: 0 },
    onSelect: () => {},
    onClose: () => {},
    showRanking: true,
    showNumbers: true,
    compactMode: false,
  };

  it("renders suggestions list", () => {
    render(<SuggestionMenu {...baseProps} />);
    // options are split into prefix/suffix spans, so search by role+label
    const options = screen.getAllByRole("option");
    const labels = options.map((o) => o.getAttribute("aria-label"));
    expect(labels).toContain("apple");
    expect(labels).toContain("banana");
  });

  it("highlights selected index via aria-selected", () => {
    render(<SuggestionMenu {...baseProps} selectedIndex={1} />);
    const options = screen.getAllByRole("option");
    const banana = options.find(
      (o) => o.getAttribute("aria-label") === "banana"
    );
    expect(banana?.getAttribute("aria-selected")).toBe("true");
  });

  it("handles keyboard interaction (non-crashing)", async () => {
    const user = userEvent.setup();
    render(<SuggestionMenu {...baseProps} />);
    const listbox = screen.getByRole("listbox");
    listbox.focus();
    await user.keyboard("{ArrowDown}{ArrowUp}{Escape}");
    expect(listbox).toBeInTheDocument();
  });
});
