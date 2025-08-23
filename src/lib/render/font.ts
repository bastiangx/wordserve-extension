import { browser } from "wxt/browser";

let injected = false;

export function initOpenDyslexic(): void {
  if (injected || typeof document === "undefined") return;
  try {
    const id = "ws-odyslexic-font";
    if (document.getElementById(id)) {
      injected = true;
      return;
    }
    const regular = (browser.runtime.getURL as any)(
      "/fonts/OpenDyslexic-Regular.woff2"
    );
    const bold = (browser.runtime.getURL as any)(
      "/fonts/OpenDyslexic-Bold.woff2"
    );
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
@font-face {
  font-family: 'OpenDyslexic';
  src: url('${regular}') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: 'OpenDyslexic';
  src: url('${bold}') format('woff2');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}`;
    document.head.appendChild(style);
    injected = true;
  } catch {
    console.warn("WordServe: Failed to inject OpenDyslexic font");
  }
}
