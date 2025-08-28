import {
  Plus,
  Power,
  Shield,
  ShieldOff,
  X,
  CheckCheck,
  HeartPlus,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { normalizeConfig } from "@/lib/config";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FaGithub } from "react-icons/fa";
import { browser } from "wxt/browser";

import {
  type DomainSettings,
  matchesDomainPattern,
  validateUserDomainInput,
  isExtensionId,
  isProtectedUrl,
} from "@/lib/domains";
import "../../globals.css";
import "./App.css";

const LOGO_URL = "icon/96.png";

export default function App() {
  const [protectedPage, setProtectedPage] = useState(false);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [currentHost, setCurrentHost] = useState("");
  const [, setCurrentUrl] = useState("");
  const [domainSettings, setDomainSettings] = useState<DomainSettings>({
    blacklistMode: true,
    blacklist: [],
    whitelist: [],
  });
  const [newDomain, setNewDomain] = useState("");
  const [newDomainError, setNewDomainError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    let result: any = {};
    try {
      result = await browser.storage.sync.get([
        "globalEnabled",
        "wordserveSettings",
      ]);
    } catch {
      try {
        result = await browser.storage.local.get([
          "globalEnabled",
          "wordserveSettings",
        ]);
      } catch {}
    }
    setGlobalEnabled(
      result.globalEnabled !== undefined ? result.globalEnabled : true
    );
    const normalized = normalizeConfig(result.wordserveSettings || {});
    setDomainSettings(normalized.domains);
    // Try to resolve the active tab robustly across browsers
    let tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tabs || tabs.length === 0) {
      try {
        tabs = await browser.tabs.query({
          active: true,
          lastFocusedWindow: true,
        });
      } catch {}
    }
    let url = tabs && tabs[0]?.url ? tabs[0].url : "";
    setCurrentUrl(url);
    const protectedFlag = isProtectedUrl(url);
    setProtectedPage(protectedFlag);
    let host = "";
    try {
      if (url && !protectedFlag) {
        host = new URL(url).hostname || "";
      }
    } catch {}
    setCurrentHost(host);
  };
  const toggleGlobal = async (val: boolean) => {
    setGlobalEnabled(val);
    try {
      if ((browser as any).storage?.sync?.set) {
        await (browser as any).storage.sync.set({ globalEnabled: val });
      }
    } catch {}
    try {
      await browser.storage.local.set({ globalEnabled: val });
    } catch {}
    const tabs = await browser.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        try {
          await browser.tabs.sendMessage(tab.id, {
            type: "wordserve-toggle",
            enabled: val,
          });
        } catch (error) {}
      }
    }
  };

  const toggleDomainMode = async (blacklistMode: boolean) => {
    const newDomainSettings = { ...domainSettings, blacklistMode };
    setDomainSettings(newDomainSettings);
    let result: any = {};
    try {
      result = await browser.storage.sync.get("wordserveSettings");
    } catch {}
    const current = normalizeConfig(result.wordserveSettings || {});
    const updated = normalizeConfig({ ...current, domains: newDomainSettings });
    try {
      if ((browser as any).storage?.sync?.set) {
        await (browser as any).storage.sync.set({ wordserveSettings: updated });
      }
    } catch {}
    try {
      await browser.storage.local.set({ wordserveSettings: updated });
    } catch {}
    const tabs = await browser.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        try {
          await browser.tabs.sendMessage(tab.id, {
            type: "settingsUpdated",
            settings: updated,
          });
        } catch (error) {}
      }
    }
  };

  const addDomain = async () => {
    if (!newDomain.trim()) return;
    const res = validateUserDomainInput(newDomain);
    if (!res.ok) {
      setNewDomainError(res.reason);
      return;
    }
    const cleaned = res.value;
    const list = domainSettings.blacklistMode ? "blacklist" : "whitelist";
    // no exact duplicates
    if (domainSettings[list].some((d) => d.toLowerCase() === cleaned)) {
      setNewDomainError("Already added");
      return;
    }
    // Newest first: prepend
    const newDomainSettings = {
      ...domainSettings,
      [list]: [cleaned, ...domainSettings[list]],
    };

    setDomainSettings(newDomainSettings);
    setNewDomain("");
    setNewDomainError(null);

    const result = await browser.storage.sync.get("wordserveSettings");
    const current = normalizeConfig(result.wordserveSettings || {});
    const updated = normalizeConfig({ ...current, domains: newDomainSettings });
    await browser.storage.sync.set({ wordserveSettings: updated });
    const allTabs = await browser.tabs.query({});
    for (const tab of allTabs) {
      if (tab.id) {
        try {
          await browser.tabs.sendMessage(tab.id, {
            type: "settingsUpdated",
            settings: updated,
          });
        } catch {}
      }
    }

    // Inform the active tab so content scripts can react immediately
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tabs[0]?.id) {
      try {
        await browser.tabs.sendMessage(tabs[0].id, {
          type: "settingsUpdated",
          settings: updated,
        });
      } catch (error) {}
    }
  };

  const removeDomain = async (domain: string) => {
    const list = domainSettings.blacklistMode ? "blacklist" : "whitelist";
    const newDomainSettings = {
      ...domainSettings,
      [list]: domainSettings[list].filter((d) => d !== domain),
    };

    setDomainSettings(newDomainSettings);

    const result = await browser.storage.sync.get("wordserveSettings");
    const current = normalizeConfig(result.wordserveSettings || {});
    const updated = normalizeConfig({ ...current, domains: newDomainSettings });
    await browser.storage.sync.set({ wordserveSettings: updated });
    const allTabs2 = await browser.tabs.query({});
    for (const tab of allTabs2) {
      if (tab.id) {
        try {
          await browser.tabs.sendMessage(tab.id, {
            type: "settingsUpdated",
            settings: updated,
          });
        } catch {}
      }
    }

    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tabs[0]?.id) {
      try {
        await browser.tabs.sendMessage(tabs[0].id, {
          type: "settingsUpdated",
          settings: updated,
        });
      } catch (error) {
        console.warn("Failed to send settings update:", error);
      }
    }
  };

  const addCurrentDomain = async () => {
    if (!currentHost) return;
    if (protectedPage) return;
    // Validate and normalize the host before adding
    const valid = validateUserDomainInput(currentHost);
    if (!valid.ok) return;
    let newDomainSettings = { ...domainSettings };
    if (domainSettings.blacklistMode) {
      // Adding to blacklist - remove from whitelist if exists
      newDomainSettings.whitelist = newDomainSettings.whitelist.filter(
        (d) =>
          !matchesDomainPattern(currentHost, d) &&
          !matchesDomainPattern(d, currentHost)
      );
      if (
        !newDomainSettings.blacklist.some((d) =>
          matchesDomainPattern(currentHost, d)
        )
      ) {
        // Newest first: prepend
        newDomainSettings.blacklist = [
          valid.value,
          ...newDomainSettings.blacklist,
        ];
      }
    } else {
      newDomainSettings.blacklist = newDomainSettings.blacklist.filter(
        (d) =>
          !matchesDomainPattern(currentHost, d) &&
          !matchesDomainPattern(d, currentHost)
      );
      if (
        !newDomainSettings.whitelist.some((d) =>
          matchesDomainPattern(currentHost, d)
        )
      ) {
        newDomainSettings.whitelist = [
          valid.value,
          ...newDomainSettings.whitelist,
        ];
      }
    }
    // Persist and propagate changes
    setDomainSettings(newDomainSettings);

    let result: any = {};
    try {
      result = await browser.storage.sync.get("wordserveSettings");
    } catch {}
    const current = normalizeConfig(result.wordserveSettings || {});
    const updated = normalizeConfig({ ...current, domains: newDomainSettings });
    try {
      if ((browser as any).storage?.sync?.set) {
        await (browser as any).storage.sync.set({ wordserveSettings: updated });
      }
    } catch {}
    try {
      await browser.storage.local.set({ wordserveSettings: updated });
    } catch {}
    // Broadcast full settings to all tabs for reliability across browsers
    const allTabs = await browser.tabs.query({});
    for (const tab of allTabs) {
      if (tab.id) {
        try {
          await browser.tabs.sendMessage(tab.id, {
            type: "settingsUpdated",
            settings: updated,
          });
        } catch {}
      }
    }
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tabs[0]?.id) {
      try {
        await browser.tabs.sendMessage(tabs[0].id, {
          type: "domainSettingsChanged",
          settings: newDomainSettings,
        });
      } catch (error) {}
    }
  };

  const isCurrentDomainListed = () => {
    const blacklisted = domainSettings.blacklist.some((pattern) =>
      matchesDomainPattern(currentHost, pattern)
    );
    const whitelisted = domainSettings.whitelist.some((pattern) =>
      matchesDomainPattern(currentHost, pattern)
    );
    return { blacklisted, whitelisted };
  };

  const removeCurrentDomain = async () => {
    if (!currentHost) return;
    const newDomainSettings = {
      ...domainSettings,
      blacklist: domainSettings.blacklist.filter(
        (d) =>
          !matchesDomainPattern(currentHost, d) &&
          !matchesDomainPattern(d, currentHost)
      ),
      whitelist: domainSettings.whitelist.filter(
        (d) =>
          !matchesDomainPattern(currentHost, d) &&
          !matchesDomainPattern(d, currentHost)
      ),
    };
    setDomainSettings(newDomainSettings);
    let result: any = {};
    try {
      result = await browser.storage.sync.get("wordserveSettings");
    } catch {}
    const current = normalizeConfig(result.wordserveSettings || {});
    const updated = normalizeConfig({ ...current, domains: newDomainSettings });
    try {
      if ((browser as any).storage?.sync?.set) {
        await (browser as any).storage.sync.set({ wordserveSettings: updated });
      }
    } catch {}
    try {
      await browser.storage.local.set({ wordserveSettings: updated });
    } catch {}
    // Broadcast full settings to all tabs for reliability across browsers
    const allTabs2 = await browser.tabs.query({});
    for (const tab of allTabs2) {
      if (tab.id) {
        try {
          await browser.tabs.sendMessage(tab.id, {
            type: "settingsUpdated",
            settings: updated,
          });
        } catch {}
      }
    }

    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tabs[0]?.id) {
      try {
        await browser.tabs.sendMessage(tabs[0].id, {
          type: "domainSettingsChanged",
          settings: newDomainSettings,
        });
      } catch (error) {}
    }
  };

  const isDomainEnabled = () => {
    if (!globalEnabled) return false;
    const { blacklisted, whitelisted } = isCurrentDomainListed();
    return domainSettings.blacklistMode ? !blacklisted : whitelisted;
  };
  const getDomainButtonState = () => {
    const { blacklisted, whitelisted } = isCurrentDomainListed();
    if (domainSettings.blacklistMode) {
      return {
        isListed: blacklisted,
        buttonText: blacklisted ? "Unblock this site" : "Block this site",
        statusText: blacklisted ? "Blocked" : "Allowed",
      };
    } else {
      return {
        isListed: whitelisted,
        buttonText: whitelisted ? "Remove from allowed" : "Allow this site",
        statusText: whitelisted ? "Allowed" : "Blocked",
      };
    }
  };

  const openSettings = () => {
    browser.runtime.openOptionsPage();
  };

  const getDisplayHostname = (hostname: string): string => {
    if (!hostname) return "empty";
    if (isExtensionId(hostname)) return "N/A";
    // Strip leading www.
    let display = hostname.replace(/^www\./i, "");
    // clamp
    const MAX_LEN = 28;
    if (display.length > MAX_LEN) {
      display = display.slice(0, MAX_LEN - 1) + "\u2026"; // …
    }
    return display;
  };
  const currentList = domainSettings.blacklistMode
    ? domainSettings.blacklist
    : domainSettings.whitelist;

  return (
    <div className="w-72 p-3 bg-background text-foreground">
      <div className="font-mono flex gap-1 mb-2 w-full p-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 hover:bg-interaction hover:text-interaction-foreground"
          onClick={() =>
            window.open(
              "https://github.com/bastiangx/wordserve-extension",
              "_blank"
            )
          }
        >
          <FaGithub className="h-8 w-8" />
          Source
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="flex-1 hover:bg-interaction hover:text-interaction-foreground"
          onClick={() => window.open("https://ko-fi.com/bastiangx", "_blank")}
        >
          <HeartPlus />
          Donate!
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="px-2 py-2 h-auto justify-start gap-2"
            onClick={() =>
              window.open(
                "https://github.com/bastiangx/wordserve-extension",
                "_blank"
              )
            }
          >
            <img src={LOGO_URL} alt="WordServe" className="h-8 w-8" />
            <h2 className="text-2xl font-semibold">WordServe</h2>
          </Button>
          <Toggle
            variant={"outline"}
            pressed={globalEnabled}
            onPressedChange={toggleGlobal}
            aria-label="Toggle WordServe"
          >
            <Power className="h-4 w-4" />
          </Toggle>
        </div>

        {currentHost && (
          <div className="space-y-2 p-2">
            <Button
              type="button"
              variant="outline"
              className={`w-full h-8 justify-start gap-2 font-mono min-w-0 ${
                isExtensionId(currentHost) || protectedPage
                  ? "text-muted-foreground opacity-70"
                  : isDomainEnabled()
                  ? "text-foreground"
                  : "text-muted-foreground opacity-60"
              }`}
              title={protectedPage ? "N/A" : currentHost}
            >
              <span
                className={`flex items-center gap-1.5 text-[11px] px-1.5 py-0.5 rounded  flex-none ${
                  isExtensionId(currentHost)
                    ? "bg-background text-muted-foreground border-muted"
                    : protectedPage
                    ? "bg-background text-muted-foreground border-muted"
                    : isDomainEnabled()
                    ? "bg-background"
                    : "bg-background text-error-foreground border/10"
                }`}
                aria-label={
                  isExtensionId(currentHost)
                    ? "Extension"
                    : protectedPage
                    ? "Protected"
                    : isDomainEnabled()
                    ? "Active"
                    : "Inactive"
                }
              >
                {isExtensionId(currentHost) ? (
                  <Shield className="h-3 w-3" />
                ) : protectedPage ? (
                  <Shield className="h-3 w-3" />
                ) : isDomainEnabled() ? (
                  <CheckCheck className="h-3 w-3" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </span>
              <span className="text-xs truncate flex-1 min-w-0">
                {protectedPage ? "N/A" : getDisplayHostname(currentHost)}
              </span>
            </Button>

            {!isExtensionId(currentHost) &&
              !protectedPage &&
              (() => {
                const buttonState = getDomainButtonState();
                return (
                  <Button
                    onClick={
                      buttonState.isListed
                        ? removeCurrentDomain
                        : addCurrentDomain
                    }
                    size="sm"
                    variant="outline"
                    className="
                    font-mono
                    w-full h-7 text-destructive hover:bg-destructive hover:text-card"
                  >
                    {buttonState.buttonText}
                  </Button>
                );
              })()}
          </div>
        )}

        <div className="border rounded p-2 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">
              {domainSettings.blacklistMode
                ? "Blacklist mode"
                : "Whitelist mode"}
            </Label>
            <Toggle
              variant={"outline"}
              pressed={!domainSettings.blacklistMode}
              onPressedChange={(pressed: boolean) => toggleDomainMode(!pressed)}
              aria-label="Toggle domain mode"
            >
              {domainSettings.blacklistMode ? (
                <ShieldOff className="h-4 w-4" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
            </Toggle>
          </div>
          <div className="font-mono text-xs text-muted-foreground leading-tighter">
            {domainSettings.blacklistMode
              ? "Will show suggestions everywhere except in domains below"
              : "Will only show suggestions in domains below"}
          </div>

          <div className="font-mono space-y-1.5">
            <div className="flex gap-1.5">
              <Input
                placeholder={"add new"}
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                className="text-xs h-7"
                maxLength={253}
                inputMode="url"
                spellCheck={false}
                aria-invalid={newDomainError ? true : undefined}
                onKeyDown={(e) => e.key === "Enter" && addDomain()}
              />
              <Button onClick={addDomain} size="sm" className="h-7 px-2">
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            {newDomainError && (
              <div className="text-[10px] text-destructive">
                {newDomainError}
              </div>
            )}

            {currentList.length > 0 && (
              <ScrollArea className="h-24">
                <div className="pr-1 space-y-1">
                  {currentList.map((domain, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between
                      text-xs rounded-md border px-1.5 py-0.5 gap-2"
                    >
                      <span className="truncate">{domain}</span>
                      <Button
                        onClick={() => removeDomain(domain)}
                        size="sm"
                        variant="ghost"
                        className="h-3 w-3 p-0 ml-2 flex-none"
                      >
                        <X className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <Button onClick={openSettings} className="w-full h-7 text-sm font-mono">
          Open settings
        </Button>
      </div>
    </div>
  );
}
