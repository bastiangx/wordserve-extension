export interface DomainSettings {
  blacklistMode: boolean;
  blacklist: string[];
  whitelist: string[];
}

/**
 * Check if WordServe should activate on the given hostname based on domain settings
 */
export function shouldActivateForDomain(
  hostname: string,
  settings: DomainSettings
): boolean {
  if (isProtectedPage(hostname)) {
    return false;
  }

  const { blacklistMode, blacklist, whitelist } = settings;

  if (blacklistMode) {
    return !matchesDomainList(hostname, blacklist);
  } else {
    return matchesDomainList(hostname, whitelist);
  }
}

/**
 * Check if the current page is a browser protected page where extensions shouldn't run
 */
export function isProtectedPage(hostname: string): boolean {
  const url = window.location.href.toLowerCase();
  const host = hostname.toLowerCase();
  if (
    url.includes("chrome-extension://") ||
    host.includes("chrome-extension://")
  )
    return true;

  if (url.includes("moz-extension://") || host.includes("moz-extension://"))
    return true;

  if (
    url.includes("ms-browser-extension://") ||
    host.includes("ms-browser-extension://")
  )
    return true;

  const protectedPatterns = [
    "chrome://",
    "chrome-extension://",
    "moz-extension://",
    "ms-browser-extension://",
    "edge://",
    "about:",
    "file://",
    "data:",
    "javascript:",
    "chrome-search://",
    "chrome-devtools://",
    "devtools://",
    "view-source:",
  ];
  const isProtectedUrl = protectedPatterns.some((pattern) =>
    url.startsWith(pattern)
  );
  // extension ID (long alphanumeric string)
  const isExtensionId =
    /^[a-z]{32}$/.test(host) ||
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(host);

  return isProtectedUrl || isExtensionId;
}

/**
 * Check if hostname matches any pattern in the domain list
 * Supports regex patterns, wildcard patterns, and simple string matching
 */
export function matchesDomainList(
  hostname: string,
  domainList: string[]
): boolean {
  if (!hostname || !domainList || domainList.length === 0) {
    return false;
  }

  for (const pattern of domainList) {
    if (matchesDomainPattern(hostname, pattern)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if hostname matches a specific domain pattern
 */
export function matchesDomainPattern(
  hostname: string,
  pattern: string
): boolean {
  try {
    const regexPattern = new RegExp(pattern);
    if (regexPattern.test(hostname)) {
      return true;
    }
  } catch (error) {
    try {
      const wildcardRegex = pattern
        .replace(/\./g, "\\.") // Escape dots
        .replace(/\*/g, ".*"); // Convert * to .*

      const regexPattern = new RegExp(`^${wildcardRegex}$`);
      if (regexPattern.test(hostname)) {
        return true;
      }
    } catch (wildcardError) {
      // Fallback to simple string matching
      if (hostname.includes(pattern)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Validate if a domain pattern is valid (for UI validation)
 */
export function isValidDomainPattern(pattern: string): boolean {
  if (!pattern || pattern.trim() === "") {
    return false;
  }

  try {
    new RegExp(pattern);
    return true;
  } catch (error) {
    try {
      const wildcardRegex = pattern.replace(/\./g, "\\.").replace(/\*/g, ".*");
      new RegExp(`^${wildcardRegex}$`);
      return true;
    } catch (wildcardError) {
      return true;
    }
  }
}

/**
 * Get a human-readable description of what a domain pattern matches
 */
export function describeDomainPattern(pattern: string): string {
  if (pattern.includes("*")) {
    return `Wildcard pattern: ${pattern}`;
  }
  try {
    new RegExp(pattern);
    if (
      pattern.includes("\\") ||
      pattern.includes("[") ||
      pattern.includes("(")
    ) {
      return `Regex pattern: ${pattern}`;
    }
  } catch (error) {
    console.debug("Invalid regex pattern:", error);
    if (pattern.includes("*") || pattern.includes(".")) {
      return `Wildcard pattern: ${pattern}`;
    }
  }
  return `Exact match: ${pattern}`;
}
