/// <reference lib="dom" />
import { beforeEach, describe, expect, test, mock } from "bun:test";
import { mock as mockModule } from "bun:test";

let matchesDomainPattern: any;
let validateUserDomainInput: any;
let shouldActivateForDomain: any;
let scanPageSensitivity: any;

describe("domains", () => {
  beforeEach(async () => {
    // webextension polyfill
    const browserMock = {
      runtime: { getURL: () => "chrome-extension://abc/" },
    } as any;
    mockModule.module("webextension-polyfill", () => ({
      default: browserMock,
      __esModule: true,
    }));
    const mod = await import("@/lib/domains");
    matchesDomainPattern = mod.matchesDomainPattern;
    validateUserDomainInput = mod.validateUserDomainInput;
    shouldActivateForDomain = mod.shouldActivateForDomain;
    scanPageSensitivity = mod.scanPageSensitivity;
  });
  test("matchesDomainPattern exact and wildcard", () => {
    expect(matchesDomainPattern("example.com", "example.com")).toBe(true);
    expect(matchesDomainPattern("a.example.com", "example.com")).toBe(true);
    expect(matchesDomainPattern("example.com", "*.example.com")).toBe(false);
    expect(matchesDomainPattern("a.example.com", "*.example.com")).toBe(true);
  });

  test("validateUserDomainInput rejects invalid forms", () => {
    expect(validateUserDomainInput("")).toEqual({
      ok: false,
      reason: "Enter a domain",
    });
    expect(validateUserDomainInput("*example.com")).toEqual({
      ok: false,
      reason: "Use example.com or *.example.com (letters, digits, dash)",
    });
    expect(validateUserDomainInput("http://example.com")).toEqual({
      ok: true,
      value: "example.com",
    });
  });

  test("shouldActivateForDomain respects blacklist mode", () => {
    // protected page heuristics
    window.location.href = "https://foo.com/";
    const settings = {
      blacklistMode: true,
      blacklist: ["*.bank.com"],
      whitelist: [],
    };
    expect(shouldActivateForDomain("foo.com", settings)).toBe(true);
    expect(shouldActivateForDomain("a.bank.com", settings)).toBe(false);
  });

  test("scanPageSensitivity detects password and payment cues", () => {
    document.body.innerHTML = `
      <form action="https://checkout.stripe.com/pay">
        <input type="password" name="pwd" />
        <input name="cc-number" />
      </form>
      <iframe src="https://checkout.stripe.com/xyz"></iframe>
    `;
    const res = scanPageSensitivity();
    expect(res.score).toBeGreaterThan(0);
    expect(res.reasons.length).toBeGreaterThan(0);
  });
});
