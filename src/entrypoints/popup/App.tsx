import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, X, Power, Shield, ShieldOff } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import { matchesDomainPattern, type DomainSettings } from "@/lib/domains";
import "../../globals.css";
import "./App.css";

// DomainSettings now imported from lib/domains to avoid duplicate interface definition

export default function App() {
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [currentHost, setCurrentHost] = useState("");
  const [domainSettings, setDomainSettings] = useState<DomainSettings>({
    blacklistMode: true,
    blacklist: [],
    whitelist: [],
  });
  const [newDomain, setNewDomain] = useState("");

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

    const list = domainSettings.blacklistMode ? "blacklist" : "whitelist";
    const newDomainSettings = {
      ...domainSettings,
      [list]: [...domainSettings[list], newDomain.trim()],
    };

    setDomainSettings(newDomainSettings);
    setNewDomain("");

    const result = await browser.storage.sync.get("wordserveSettings");
    const settings = result.wordserveSettings || {};
    await browser.storage.sync.set({
      wordserveSettings: {
        ...settings,
        domains: newDomainSettings,
      },
    });
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
        newDomainSettings.blacklist = [
          ...newDomainSettings.blacklist,
          currentHost,
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
          ...newDomainSettings.whitelist,
          currentHost,
        ];
      }
    }

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
      <div className="flex justify-between items-center mb-3">
        <a
          href="https://github.com/bastiangx/wordserve-plugin"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2"
        >
          <FaGithub className="h-6 w-6" />
        </a>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Enable WordServe</Label>
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
              Current: {currentHost}
            </div>
            <div className="flex items-center justify-between">
              <div
                className={`text-xs px-1.5 py-0.5 rounded border ${
                  isDomainEnabled()
                    ? "bg-success/10 text-success-foreground border-success/20"
                    : "bg-error/10 text-error-foreground border-error/20"
                }`}
              >
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
                  className="w-full h-7 text-xs"
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
              ? "WordServe works everywhere except blocked domains"
              : "WordServe only works on allowed domains"}
          </div>

          <div className="space-y-1.5">
            <div className="flex gap-1.5">
              <Input
                placeholder={"example.com or *.site.com"}
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                className="text-xs h-7"
                onKeyDown={(e) => e.key === "Enter" && addDomain()}
              />
              <Button onClick={addDomain} size="sm" className="h-7 px-2">
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            {currentList.length > 0 && (
              <div className="max-h-16 overflow-y-auto space-y-1">
                {currentList.map((domain, index) => (
                  <div
                    key={index}
                    className="
                    flex items-center justify-between text-xs rounded px-1.5 py-0.5"
                  >
                    <span className="truncate">{domain}</span>
                    <Button
                      onClick={() => removeDomain(domain)}
                      size="sm"
                      variant="ghost"
                      className="h-3 w-3 p-0"
                    >
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                ))}
              </div>
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
