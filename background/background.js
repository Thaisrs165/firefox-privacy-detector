const tabData = new Map();

const MULTI_LEVEL_SUFFIXES = new Set([
  "com.br",
  "net.br",
  "org.br",
  "gov.br",
  "co.uk",
  "org.uk",
  "com.au",
  "net.au",
  "co.jp"
]);

function getHostname(url) {
  try {
    return new URL(url).hostname
      .toLowerCase()
      .replace(/\.$/, "");
  } catch {
    return null;
  }
}

function getSiteDomain(hostname) {
  if (!hostname) {
    return null;
  }

  const parts = hostname.split(".");

  if (parts.length <= 2) {
    return hostname;
  }

  const possibleMultiLevelSuffix = parts.slice(-2).join(".");

  if (MULTI_LEVEL_SUFFIXES.has(possibleMultiLevelSuffix)) {
    return parts.slice(-3).join(".");
  }

  return parts.slice(-2).join(".");
}

function parseSetCookieHeader(headerValue, requestDomain, pageDomain) {
  if (!headerValue) {
    return null;
  }

  const sections = headerValue
    .split(";")
    .map((section) => section.trim());

  const nameAndValue = sections.shift();
  const separatorIndex = nameAndValue.indexOf("=");

  if (separatorIndex <= 0) {
    return null;
  }

  const cookieName = nameAndValue
    .slice(0, separatorIndex)
    .trim();

  const attributes = new Map();

  for (const section of sections) {
    const attributeSeparator = section.indexOf("=");

    if (attributeSeparator === -1) {
      attributes.set(section.toLowerCase(), "");
      continue;
    }

    const attributeName = section
      .slice(0, attributeSeparator)
      .trim()
      .toLowerCase();

    const attributeValue = section
      .slice(attributeSeparator + 1)
      .trim();

    attributes.set(attributeName, attributeValue);
  }

  const maxAge = attributes.get("max-age");

  if (maxAge !== undefined && Number(maxAge) <= 0) {
    return null;
  }

  const expires = attributes.get("expires");

  if (expires) {
    const expirationTime = Date.parse(expires);

    if (
      !Number.isNaN(expirationTime) &&
      expirationTime <= Date.now()
    ) {
      return null;
    }
  }

  const declaredDomain = attributes
    .get("domain")
    ?.replace(/^\./, "")
    .toLowerCase();

  const cookieDomain =
    getSiteDomain(declaredDomain) || requestDomain;

  const cookiePath = attributes.get("path") || "/";

  const isThirdParty = cookieDomain !== pageDomain;

  const hasPositiveMaxAge =
    maxAge !== undefined && Number(maxAge) > 0;

  const isPersistent =
    Boolean(expires) || hasPositiveMaxAge;

  return {
    id: `${cookieDomain}|${cookiePath}|${cookieName}`,
    name: cookieName,
    domain: cookieDomain,
    path: cookiePath,
    party: isThirdParty ? "third-party" : "first-party",
    duration: isPersistent ? "persistent" : "session"
  };
}

async function saveTabData(tabId) {
  const data = tabData.get(tabId);

  if (!data) {
    return;
  }

  await browser.storage.local.set({
    [`tab-${tabId}`]: {
      pageDomain: data.pageDomain,
      thirdPartyDomains: [...data.thirdPartyDomains],
      cookies: [...data.cookies.values()],
      storage: data.storage
    }
  });
}

browser.webRequest.onBeforeRequest.addListener(
  (requestDetails) => {
    const tabId = requestDetails.tabId;

    if (tabId < 0) {
      return;
    }

    const requestHostname = getHostname(requestDetails.url);
    const requestDomain = getSiteDomain(requestHostname);

    if (!requestDomain) {
      return;
    }

    if (requestDetails.type === "main_frame") {
      tabData.set(tabId, {
        pageDomain: requestDomain,
        thirdPartyDomains: new Set(),
        cookies: new Map(),
        storage: {
            localStorage: [],
            sessionStorage: [],
            indexedDB: []
        }
        });

      saveTabData(tabId).catch(console.error);
      return;
    }

    const data = tabData.get(tabId);

    if (!data || !data.pageDomain) {
      return;
    }

    if (requestDomain !== data.pageDomain) {
      const previousSize = data.thirdPartyDomains.size;

      data.thirdPartyDomains.add(requestDomain);

      if (data.thirdPartyDomains.size !== previousSize) {
        saveTabData(tabId).catch(console.error);
      }
    }
  },
  {
    urls: ["<all_urls>"]
  }
);

browser.webRequest.onHeadersReceived.addListener(
  (requestDetails) => {
    const tabId = requestDetails.tabId;
    const data = tabData.get(tabId);

    if (tabId < 0 || !data || !data.pageDomain) {
      return;
    }

    const requestHostname = getHostname(requestDetails.url);
    const requestDomain = getSiteDomain(requestHostname);

    if (!requestDomain) {
      return;
    }

    const responseHeaders = requestDetails.responseHeaders || [];

    const setCookieHeaders = responseHeaders.filter(
      (header) =>
        header.name &&
        header.name.toLowerCase() === "set-cookie"
    );

    let dataChanged = false;

    for (const header of setCookieHeaders) {
      const cookie = parseSetCookieHeader(
        header.value,
        requestDomain,
        data.pageDomain
      );

      if (!cookie) {
        continue;
      }

      const previousCookie = data.cookies.get(cookie.id);

      if (
        !previousCookie ||
        previousCookie.party !== cookie.party ||
        previousCookie.duration !== cookie.duration
      ) {
        data.cookies.set(cookie.id, cookie);
        dataChanged = true;
      }
    }

    if (dataChanged) {
      saveTabData(tabId).catch(console.error);
    }
  },
  {
    urls: ["<all_urls>"]
  },
  ["responseHeaders"]
);

browser.runtime.onMessage.addListener((message, sender) => {
  if (
    message.type !== "client-storage-report" ||
    !sender.tab ||
    sender.tab.id === undefined
  ) {
    return;
  }

  const data = tabData.get(sender.tab.id);

  if (!data || !message.storage) {
    return;
  }

  data.storage = {
    localStorage: Array.isArray(message.storage.localStorage)
      ? message.storage.localStorage
      : [],
    sessionStorage: Array.isArray(message.storage.sessionStorage)
      ? message.storage.sessionStorage
      : [],
    indexedDB: Array.isArray(message.storage.indexedDB)
      ? message.storage.indexedDB
      : []
  };

  return saveTabData(sender.tab.id);
});

browser.tabs.onRemoved.addListener((tabId) => {
  tabData.delete(tabId);
  browser.storage.local.remove(`tab-${tabId}`);
});