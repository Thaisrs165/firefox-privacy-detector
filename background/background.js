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

async function saveTabData(tabId) {
  const data = tabData.get(tabId);

  if (!data) {
    return;
  }

  await browser.storage.local.set({
    [`tab-${tabId}`]: {
      pageDomain: data.pageDomain,
      thirdPartyDomains: [...data.thirdPartyDomains]
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
        thirdPartyDomains: new Set()
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

browser.tabs.onRemoved.addListener((tabId) => {
  tabData.delete(tabId);
  browser.storage.local.remove(`tab-${tabId}`);
});