import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Power, Shield, ShieldOff, X, CheckCheck } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FaGithub } from "react-icons/fa";
import {
  type DomainSettings,
  matchesDomainPattern,
  validateUserDomainInput,
} from "@/lib/domains";
import "../../globals.css";
import "./App.css";

export default function App() {
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [currentHost, setCurrentHost] = useState("");
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
    const result = await browser.storage.sync.get([
      "globalEnabled",
      "wordserveSettings",
    ]);

    setGlobalEnabled(
      result.globalEnabled !== undefined ? result.globalEnabled : true
    );

    const settings = result.wordserveSettings || {};
    const domains = settings.domains || {
      blacklistMode: true,
      blacklist: [],
      whitelist: [],
    };
    setDomainSettings(domains);

    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    const url = tabs[0]?.url || "";
    const host = new URL(url).hostname || "";
    setCurrentHost(host);
  };

  const toggleGlobal = async (val: boolean) => {
    setGlobalEnabled(val);
    await browser.storage.sync.set({ globalEnabled: val });

    const tabs = await browser.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        try {
          await browser.tabs.sendMessage(tab.id, {
            type: "globalToggle",
            enabled: val,
          });
        } catch (error) {
          console.warn(`Failed to send message to tab ${tab.id}:`, error);
        }
      }
    }
  };

  const toggleDomainMode = async (blacklistMode: boolean) => {
    const newDomainSettings = { ...domainSettings, blacklistMode };
    setDomainSettings(newDomainSettings);

    const result = await browser.storage.sync.get("wordserveSettings");
    const settings = result.wordserveSettings || {};
    await browser.storage.sync.set({
      wordserveSettings: {
        ...settings,
        domains: newDomainSettings,
      },
    });
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
    // Prevent exact duplicates
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
    const settings = result.wordserveSettings || {};
    await browser.storage.sync.set({
      wordserveSettings: {
        ...settings,
        domains: newDomainSettings,
      },
    });

    // Inform the active tab so content scripts can react immediately
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
      } catch (error) {
        console.warn("Failed to send domain settings update:", error);
      }
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
    const settings = result.wordserveSettings || {};
    await browser.storage.sync.set({
      wordserveSettings: {
        ...settings,
        domains: newDomainSettings,
      },
    });

    // Inform the active tab so content scripts can react immediately
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
      } catch (error) {
        console.warn("Failed to send domain settings update:", error);
      }
    }
  };

  const addCurrentDomain = async () => {
    if (!currentHost) return;

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
          currentHost,
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
        // Newest first: prepend
        newDomainSettings.whitelist = [
          currentHost,
          ...newDomainSettings.whitelist,
        ];
      }
    }

    // Persist and propagate changes (this was previously missing)
    setDomainSettings(newDomainSettings);

    const result = await browser.storage.sync.get("wordserveSettings");
    const settings = result.wordserveSettings || {};
    await browser.storage.sync.set({
      wordserveSettings: {
        ...settings,
        domains: newDomainSettings,
      },
    });

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
      } catch (error) {
        console.warn("Failed to send domain settings update:", error);
      }
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

    const result = await browser.storage.sync.get("wordserveSettings");
    const settings = result.wordserveSettings || {};
    await browser.storage.sync.set({
      wordserveSettings: {
        ...settings,
        domains: newDomainSettings,
      },
    });

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
      } catch (error) {
        console.warn("Failed to send domain settings update:", error);
      }
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

  const currentList = domainSettings.blacklistMode
    ? domainSettings.blacklist
    : domainSettings.whitelist;

  return (
    <div className="w-72 p-3 bg-background text-foreground">
      <div className="flex gap-1 mb-2 w-full p-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 hover:bg-secondary hover:text-secondary-foreground"
          onClick={() =>
            window.open(
              "https://github.com/bastiangx/wordserve-plugin",
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
          className="flex-1 hover:bg-secondary hover:text-secondary-foreground"
          onClick={() => window.open("https://ko-fi.com/bastiangx", "_blank")}
        >
          <img
            className="h-6 w-6 mr-2"
            src="https://files.catbox.moe/f8y8k0.png"
          />
          Donate!
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-lg">WordServe</Label>
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
          <div className="border rounded p-2 space-y-2 justify-items-center">
            <div className="text-xs text-muted-foreground">
              current:{" "}
              <Badge variant="outline" className="text-xs">
                {currentHost}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div
                className={`flex items-center gap-1.5 text-xs px-1.5 py-0.5 rounded border ${
                  isDomainEnabled()
                    ? "bg-background text-success-foreground border-success"
                    : "bg-background text-error-foreground border/10"
                }`}
              >
                {isDomainEnabled() ? (
                  <CheckCheck className="h-3 w-3" />
                ) : (
                  <X className="h-3 w-3" />
                )}
                {isDomainEnabled() ? "Active" : "Inactive"}
              </div>
            </div>
            {(() => {
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
                      w-full h-7 text-xs 
                      text-destructive 
                      hover:bg-destructive hover:text-card"
                >
                  {buttonState.buttonText}
                </Button>
              );
            })()}
          </div>
        )}

        <div className="border rounded p-2 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">
              {domainSettings.blacklistMode
                ? "Block specific domains"
                : "Allow only specific domains"}
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
          <div className="text-xs text-muted-foreground leading-tight">
            {domainSettings.blacklistMode
              ? "Plugin works everywhere except blocked domains"
              : "Plugin only works on allowed domains"}
          </div>

          <div className="space-y-1.5">
            <div className="flex gap-1.5">
              <Input
                placeholder={"example.com"}
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
                      className="flex items-center justify-between text-xs rounded-md border px-1.5 py-0.5 gap-2"
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

        <Button onClick={openSettings} className="w-full h-7 text-xs">
          Open Settings
        </Button>
      </div>
    </div>
  );
}
