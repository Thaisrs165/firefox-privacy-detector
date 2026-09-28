const tabData = new Map();
const pendingBounceData = new Map();

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

const TRACKING_PARAMETER_NAMES = new Set([
  "fbclid",
  "fb_source",
  "gclid",
  "dclid",
  "msclkid",
  "ttclid",
  "twclid",
  "yclid",
  "igshid",
  "mc_eid",
  "_ga",
  "uid",
  "uuid",
  "cid",
  "user_id",
  "userid",
  "visitor_id",
  "visitorid",
  "client_id",
  "clientid",
  "click_id",
  "clickid",
  "tracking_id",
  "trackingid",
  "session_id"
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

function isTrackingParameter(parameterName) {
  const normalizedName = parameterName.toLowerCase();

  return (
    normalizedName.startsWith("utm_") ||
    normalizedName.includes("bounceuid") ||
    TRACKING_PARAMETER_NAMES.has(normalizedName)
  );
}

function getTrackingParameters(url) {
  try {
    const parsedUrl = new URL(url);
    const parameters = [];

    for (const [name, value] of parsedUrl.searchParams) {
      if (!isTrackingParameter(name)) {
        continue;
      }

      parameters.push({
        name,
        valueLength: value.length
      });
    }

    return parameters;
  } catch {
    return [];
  }
}

function addTrackingParameters(
  tracking,
  url,
  domain,
  context
) {
  const parameters = getTrackingParameters(url);

  for (const parameter of parameters) {
    const alreadyRecorded = tracking.parameters.some(
      (recordedParameter) =>
        recordedParameter.name === parameter.name &&
        recordedParameter.domain === domain &&
        recordedParameter.context === context
    );

    if (alreadyRecorded) {
      continue;
    }

    tracking.parameters.push({
      name: parameter.name,
      valueLength: parameter.valueLength,
      domain,
      context
    });
  }
}

function parseSetCookieHeader(
  headerValue,
  requestDomain,
  pageDomain
) {
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
      pageHostname: data.pageHostname,
      thirdPartyDomains: [...data.thirdPartyDomains],
      cookies: [...data.cookies.values()],
      storage: data.storage,
      canvas: data.canvas,
      tracking: data.tracking
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
      const previousData = tabData.get(tabId);

      const navigationParameters = getTrackingParameters(
        requestDetails.url
      );

      const hasIdentifierParameter =
        navigationParameters.some(
          (parameter) =>
            !parameter.name.toLowerCase().startsWith("utm_")
        );

      const navigationBounceDetected = Boolean(
        previousData?.pageHostname &&
        previousData.pageHostname !== requestHostname &&
        hasIdentifierParameter
      );

      const pendingBounce = pendingBounceData.get(tabId);

      const pendingBounceIsValid =
        pendingBounce &&
        pendingBounce.destinationHostname === requestHostname &&
        Date.now() - pendingBounce.detectedAt <= 10000;

      const tracking = {
        parameters: pendingBounceIsValid
          ? [...pendingBounce.parameters]
          : [],
        bounceDetected: Boolean(
          pendingBounceIsValid || navigationBounceDetected
        ),
        bounceDomains: pendingBounceIsValid
          ? [...pendingBounce.bounceDomains]
          : navigationBounceDetected
            ? [previousData.pageHostname]
            : [],
        redirectChain: pendingBounceIsValid
          ? [...pendingBounce.redirectChain]
          : navigationBounceDetected
            ? [previousData.pageHostname, requestHostname]
            : []
      };

      if (pendingBounce) {
        pendingBounceData.delete(tabId);
      }

      addTrackingParameters(
        tracking,
        requestDetails.url,
        requestDomain,
        "navigation"
      );

      tabData.set(tabId, {
        pageDomain: requestDomain,
        pageHostname: requestHostname,
        thirdPartyDomains: new Set(),
        cookies: new Map(),
        storage: {
          localStorage: [],
          sessionStorage: [],
          indexedDB: []
        },
        canvas: {
          detected: false,
          methods: []
        },
        tracking
      });

      saveTabData(tabId).catch(console.error);
      return;
    }

    const data = tabData.get(tabId);

    if (!data || !data.pageDomain) {
      return;
    }

    let dataChanged = false;

    if (requestDomain !== data.pageDomain) {
      const previousSize = data.thirdPartyDomains.size;

      data.thirdPartyDomains.add(requestDomain);

      if (data.thirdPartyDomains.size !== previousSize) {
        dataChanged = true;
      }
    }

    const previousParameterCount =
      data.tracking.parameters.length;

    addTrackingParameters(
      data.tracking,
      requestDetails.url,
      requestDomain,
      requestDetails.type
    );

    if (
      data.tracking.parameters.length !==
      previousParameterCount
    ) {
      dataChanged = true;
    }

    if (dataChanged) {
      saveTabData(tabId).catch(console.error);
    }
  },
  {
    urls: ["<all_urls>"]
  }
);

browser.webRequest.onBeforeRedirect.addListener(
  (requestDetails) => {
    if (
      requestDetails.tabId < 0 ||
      requestDetails.type !== "main_frame" ||
      !requestDetails.redirectUrl
    ) {
      return;
    }

    const sourceHostname = getHostname(requestDetails.url);
    const destinationHostname = getHostname(
      requestDetails.redirectUrl
    );

    if (
      !sourceHostname ||
      !destinationHostname ||
      sourceHostname === destinationHostname
    ) {
      return;
    }

    const sourceParameters = getTrackingParameters(
      requestDetails.url
    );

    const destinationParameters = getTrackingParameters(
      requestDetails.redirectUrl
    );

    const redirectParameters = [
      ...sourceParameters,
      ...destinationParameters
    ];

    if (redirectParameters.length === 0) {
      return;
    }

    const currentData = tabData.get(requestDetails.tabId);
    const previousTracking = currentData?.tracking;

    const bounceDomains = new Set(
      previousTracking?.bounceDomains || []
    );

    bounceDomains.add(sourceHostname);

    const redirectChain = [
      ...(previousTracking?.redirectChain || [])
    ];

    if (
      redirectChain[redirectChain.length - 1] !==
      sourceHostname
    ) {
      redirectChain.push(sourceHostname);
    }

    redirectChain.push(destinationHostname);

    const parameters = [
      ...(previousTracking?.parameters || [])
    ];

    for (const parameter of redirectParameters) {
      const parameterDomain =
        destinationParameters.includes(parameter)
          ? destinationHostname
          : sourceHostname;

      const alreadyRecorded = parameters.some(
        (recordedParameter) =>
          recordedParameter.name === parameter.name &&
          recordedParameter.domain === parameterDomain &&
          recordedParameter.context === "redirect"
      );

      if (!alreadyRecorded) {
        parameters.push({
          name: parameter.name,
          valueLength: parameter.valueLength,
          domain: parameterDomain,
          context: "redirect"
        });
      }
    }

    pendingBounceData.set(requestDetails.tabId, {
      destinationHostname,
      detectedAt: Date.now(),
      parameters,
      bounceDomains: [...bounceDomains],
      redirectChain
    });
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

    const responseHeaders =
      requestDetails.responseHeaders || [];

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
  if (!sender.tab || sender.tab.id === undefined) {
    return;
  }

  const tabId = sender.tab.id;
  const data = tabData.get(tabId);

  if (!data) {
    return;
  }

  if (
    message.type === "client-storage-report" &&
    message.storage
  ) {
    data.storage = {
      localStorage: Array.isArray(
        message.storage.localStorage
      )
        ? message.storage.localStorage
        : [],
      sessionStorage: Array.isArray(
        message.storage.sessionStorage
      )
        ? message.storage.sessionStorage
        : [],
      indexedDB: Array.isArray(
        message.storage.indexedDB
      )
        ? message.storage.indexedDB
        : []
    };

    return saveTabData(tabId);
  }

  if (
    message.type === "canvas-fingerprint-signal" &&
    typeof message.method === "string"
  ) {
    if (!data.canvas) {
      data.canvas = {
        detected: false,
        methods: []
      };
    }

    data.canvas.detected = true;

    if (!data.canvas.methods.includes(message.method)) {
      data.canvas.methods.push(message.method);
    }

    return saveTabData(tabId);
  }
});

browser.tabs.onRemoved.addListener((tabId) => {
  tabData.delete(tabId);
  pendingBounceData.delete(tabId);
  browser.storage.local.remove(`tab-${tabId}`);
});