// @ts-nocheck

import * as matchers from "@testing-library/jest-dom/matchers";
import { JSDOM } from "jsdom";

// Establish jsdom environment manually (bun test jsdom flag may not auto-create globals yet)
if (!(globalThis as any).window || !(globalThis as any).document) {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  (globalThis as any).window = dom.window as any;
  (globalThis as any).document = dom.window.document as any;
  (globalThis as any).navigator = { userAgent: "bun-jsdom" };
  (globalThis as any).HTMLElement = dom.window.HTMLElement;
  (globalThis as any).Node = dom.window.Node;
  (globalThis as any).getComputedStyle = dom.window.getComputedStyle.bind(
    dom.window
  );
}

expect.extend(matchers as any);
