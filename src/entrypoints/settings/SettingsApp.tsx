import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";

interface WordServeSettings {
  minWordLength: number;
  maxSuggestions: number;
  debounceTime: number;
  numberSelection: boolean;
  showRankingOverride: boolean;
  compactMode: boolean;
  ghostTextEnabled: boolean;
  fontSize:
    | "smallest"
    | "smaller"
    | "small"
    | "editor"
    | "ui-small"
    | "ui-medium"
    | "ui-larger";
  fontWeight:
    | "thin"
    | "extralight"
    | "light"
    | "normal"
    | "medium"
    | "semibold"
    | "bold"
    | "extrabold"
    | "black";
  debugMode: boolean;
  abbreviationsEnabled: boolean;
  autoInsertion: boolean;
  autoInsertionCommitMode: "space-commits" | "enter-only";
  smartBackspace: boolean;
  accessibility: {
    boldSuffix: boolean;
    uppercaseSuggestions: boolean;
    prefixColorIntensity: "normal" | "muted" | "faint" | "accent";
    ghostTextColorIntensity: "normal" | "muted" | "faint" | "accent";
  };
  domains: {
    blacklistMode: boolean;
    blacklist: string[];
    whitelist: string[];
  };
}

const DEFAULT_SETTINGS: WordServeSettings = {
  minWordLength: 3,
  maxSuggestions: 64,
  debounceTime: 100,
  numberSelection: true,
  showRankingOverride: false,
  compactMode: false,
  ghostTextEnabled: true,
  fontSize: "editor",
  fontWeight: "normal",
  debugMode: false,
  abbreviationsEnabled: true,
  autoInsertion: true,
  autoInsertionCommitMode: "space-commits",
  smartBackspace: true,
  accessibility: {
    boldSuffix: false,
    uppercaseSuggestions: false,
    prefixColorIntensity: "normal",
    ghostTextColorIntensity: "muted",
  },
  domains: {
    blacklistMode: true,
    blacklist: [
      "*.paypal.com",
      "*.stripe.com",
      "*.checkout.com",
      "*.square.com",
      "*.braintreepayments.com",
      "*.authorize.net",
      "*.payment.*",
      "*checkout*",
      "*payment*",
      "*billing*",
      "*.bank.*",
      "*banking*",
      "online.chase.com",
      "www.wellsfargo.com",
      "www.bankofamerica.com",
      "secure.*",
      "login.*",
      "auth.*",
      "*signin*",
      "*signup*",
    ],
    whitelist: [],
  },
};

function SettingsApp() {
  const [settings, setSettings] = useState<WordServeSettings>(DEFAULT_SETTINGS);
  const [newDomainInput, setNewDomainInput] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await browser.storage.sync.get("wordserve-settings");
      if (stored["wordserve-settings"]) {
        setSettings((prev) => ({ ...prev, ...stored["wordserve-settings"] }));
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const saveSettings = async () => {
    try {
      await browser.storage.sync.set({ "wordserve-settings": settings });
      // Show success feedback
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  const updateSetting = <K extends keyof WordServeSettings>(
    key: K,
    value: WordServeSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updateAccessibilitySetting = <
    K extends keyof WordServeSettings["accessibility"]
  >(
    key: K,
    value: WordServeSettings["accessibility"][K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      accessibility: { ...prev.accessibility, [key]: value },
    }));
  };

  const updateDomainSetting = <K extends keyof WordServeSettings["domains"]>(
    key: K,
    value: WordServeSettings["domains"][K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      domains: { ...prev.domains, [key]: value },
    }));
  };

  const addDomain = () => {
    if (!newDomainInput.trim()) return;

    const targetList = settings.domains.blacklistMode
      ? "blacklist"
      : "whitelist";
    const currentDomains = settings.domains[targetList];

    if (!currentDomains.includes(newDomainInput.trim())) {
      updateDomainSetting(targetList, [
        ...currentDomains,
        newDomainInput.trim(),
      ]);
      setNewDomainInput("");
    }
  };

  const removeDomain = (domain: string) => {
    const targetList = settings.domains.blacklistMode
      ? "blacklist"
      : "whitelist";
    const currentDomains = settings.domains[targetList];
    updateDomainSetting(
      targetList,
      currentDomains.filter((d) => d !== domain)
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto p-6">
        <header className="mb-8">
          <h1 className="text-3xl font-serif font-bold mb-2">
            WordServe Settings
          </h1>
          <p className="text-muted-foreground">
            Configure your autocompletion preferences
          </p>
        </header>

        <div className="space-y-8">
          {/* Core Settings */}
          <section className="space-y-4">
            <h2 className="text-xl font-serif font-semibold">Core</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Minimum word length
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.minWordLength}
                  onChange={(e) =>
                    updateSetting("minWordLength", parseInt(e.target.value))
                  }
                  className="w-full px-3 py-2 bg-background border border-input rounded-md"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Maximum suggestions
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.maxSuggestions}
                  onChange={(e) =>
                    updateSetting("maxSuggestions", parseInt(e.target.value))
                  }
                  className="w-full px-3 py-2 bg-background border border-input rounded-md"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Debounce time (ms)
                </label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={settings.debounceTime}
                  onChange={(e) =>
                    updateSetting("debounceTime", parseInt(e.target.value))
                  }
                  className="w-full px-3 py-2 bg-background border border-input rounded-md"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.numberSelection}
                  onChange={(e) =>
                    updateSetting("numberSelection", e.target.checked)
                  }
                  className="rounded"
                />
                <span className="text-sm">Number key selection (1-9)</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.ghostTextEnabled}
                  onChange={(e) =>
                    updateSetting("ghostTextEnabled", e.target.checked)
                  }
                  className="rounded"
                />
                <span className="text-sm">Ghost text preview</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.smartBackspace}
                  onChange={(e) =>
                    updateSetting("smartBackspace", e.target.checked)
                  }
                  className="rounded"
                />
                <span className="text-sm">Smart backspace</span>
              </label>
            </div>
          </section>

          {/* Accessibility */}
          <section className="space-y-4">
            <h2 className="text-xl font-serif font-semibold">Accessibility</h2>

            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.accessibility.boldSuffix}
                  onChange={(e) =>
                    updateAccessibilitySetting("boldSuffix", e.target.checked)
                  }
                  className="rounded"
                />
                <span className="text-sm">Bold suffix/prefix</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settings.accessibility.uppercaseSuggestions}
                  onChange={(e) =>
                    updateAccessibilitySetting(
                      "uppercaseSuggestions",
                      e.target.checked
                    )
                  }
                  className="rounded"
                />
                <span className="text-sm">Uppercase suggestions</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Prefix color intensity
                </label>
                <select
                  value={settings.accessibility.prefixColorIntensity}
                  onChange={(e) =>
                    updateAccessibilitySetting(
                      "prefixColorIntensity",
                      e.target.value as any
                    )
                  }
                  className="w-full px-3 py-2 bg-background border border-input rounded-md"
                >
                  <option value="faint">Faint</option>
                  <option value="muted">Muted</option>
                  <option value="normal">Normal</option>
                  <option value="accent">Accent</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Ghost text intensity
                </label>
                <select
                  value={settings.accessibility.ghostTextColorIntensity}
                  onChange={(e) =>
                    updateAccessibilitySetting(
                      "ghostTextColorIntensity",
                      e.target.value as any
                    )
                  }
                  className="w-full px-3 py-2 bg-background border border-input rounded-md"
                >
                  <option value="faint">Faint</option>
                  <option value="muted">Muted</option>
                  <option value="normal">Normal</option>
                  <option value="accent">Accent</option>
                </select>
              </div>
            </div>
          </section>

          {/* Domain Control */}
          <section className="space-y-4">
            <h2 className="text-xl font-serif font-semibold">Domain control</h2>

            <div className="space-y-3">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="domainMode"
                  checked={settings.domains.blacklistMode}
                  onChange={() => updateDomainSetting("blacklistMode", true)}
                />
                <span className="text-sm">
                  Blacklist mode (block listed domains)
                </span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="domainMode"
                  checked={!settings.domains.blacklistMode}
                  onChange={() => updateDomainSetting("blacklistMode", false)}
                />
                <span className="text-sm">
                  Whitelist mode (allow only listed domains)
                </span>
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {settings.domains.blacklistMode
                  ? "Blocked domains"
                  : "Allowed domains"}
              </label>

              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="example.com or *.example.com"
                  value={newDomainInput}
                  onChange={(e) => setNewDomainInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addDomain()}
                  className="flex-1 px-3 py-2 bg-background border border-input rounded-md"
                />
                <Button onClick={addDomain}>Add</Button>
              </div>

              <div className="space-y-1 max-h-40 overflow-y-auto">
                {(settings.domains.blacklistMode
                  ? settings.domains.blacklist
                  : settings.domains.whitelist
                ).map((domain) => (
                  <div
                    key={domain}
                    className="flex items-center justify-between bg-muted p-2 rounded"
                  >
                    <span className="text-sm font-mono">{domain}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDomain(domain)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Actions */}
          <section className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={loadSettings}>
              Reset
            </Button>
            <Button onClick={saveSettings}>Save settings</Button>
          </section>
        </div>
      </div>
    </div>
  );
}

export default SettingsApp;
