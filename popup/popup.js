function renderThirdPartyDomains(domains) {
  const listElement = document.getElementById("third-party-list");

  listElement.replaceChildren();

  if (domains.length === 0) {
    const emptyItem = document.createElement("li");

    emptyItem.className = "empty-state";
    emptyItem.textContent = "Nenhum domínio detectado.";

    listElement.appendChild(emptyItem);
    return;
  }

  const sortedDomains = [...domains].sort(
    (firstDomain, secondDomain) =>
      firstDomain.localeCompare(secondDomain)
  );

  for (const domain of sortedDomains) {
    const listItem = document.createElement("li");

    listItem.textContent = domain;
    listElement.appendChild(listItem);
  }
}

function renderCookies(cookies) {
  const totalElement = document.getElementById("cookie-count");
  const firstPartyElement = document.getElementById(
    "first-party-cookie-count"
  );
  const thirdPartyElement = document.getElementById(
    "third-party-cookie-count"
  );
  const sessionElement = document.getElementById(
    "session-cookie-count"
  );
  const persistentElement = document.getElementById(
    "persistent-cookie-count"
  );
  const listElement = document.getElementById("cookie-list");

  const firstPartyCount = cookies.filter(
    (cookie) => cookie.party === "first-party"
  ).length;

  const thirdPartyCount = cookies.filter(
    (cookie) => cookie.party === "third-party"
  ).length;

  const sessionCount = cookies.filter(
    (cookie) => cookie.duration === "session"
  ).length;

  const persistentCount = cookies.filter(
    (cookie) => cookie.duration === "persistent"
  ).length;

  totalElement.textContent = cookies.length;
  firstPartyElement.textContent = firstPartyCount;
  thirdPartyElement.textContent = thirdPartyCount;
  sessionElement.textContent = sessionCount;
  persistentElement.textContent = persistentCount;

  listElement.replaceChildren();

  if (cookies.length === 0) {
    const emptyItem = document.createElement("li");

    emptyItem.className = "empty-state";
    emptyItem.textContent = "Nenhum cookie detectado.";

    listElement.appendChild(emptyItem);
    return;
  }

  const sortedCookies = [...cookies].sort(
    (firstCookie, secondCookie) => {
      const domainComparison =
        firstCookie.domain.localeCompare(secondCookie.domain);

      if (domainComparison !== 0) {
        return domainComparison;
      }

      return firstCookie.name.localeCompare(secondCookie.name);
    }
  );

  for (const cookie of sortedCookies) {
    const listItem = document.createElement("li");

    const nameElement = document.createElement("span");
    nameElement.className = "cookie-name";
    nameElement.textContent = cookie.name;

    const domainElement = document.createElement("span");
    domainElement.className = "cookie-domain";
    domainElement.textContent = cookie.domain;

    const tagsElement = document.createElement("div");
    tagsElement.className = "cookie-tags";

    const partyTag = document.createElement("span");
    partyTag.className = "cookie-tag";
    partyTag.textContent =
      cookie.party === "third-party"
        ? "Terceira parte"
        : "Primeira parte";

    const durationTag = document.createElement("span");
    durationTag.className = "cookie-tag";
    durationTag.textContent =
      cookie.duration === "persistent"
        ? "Persistente"
        : "Sessão";

    tagsElement.append(partyTag, durationTag);
    listItem.append(nameElement, domainElement, tagsElement);
    listElement.appendChild(listItem);
  }
}

function renderStorage(storage = {}) {
  const totalElement = document.getElementById("storage-count");
  const localElement = document.getElementById(
    "local-storage-count"
  );
  const sessionElement = document.getElementById(
    "session-storage-count"
  );
  const indexedDBElement = document.getElementById(
    "indexed-db-count"
  );
  const listElement = document.getElementById("storage-list");

  const localStorageKeys = Array.isArray(storage.localStorage)
    ? storage.localStorage
    : [];

  const sessionStorageKeys = Array.isArray(storage.sessionStorage)
    ? storage.sessionStorage
    : [];

  const indexedDBNames = Array.isArray(storage.indexedDB)
    ? storage.indexedDB
    : [];

  const entries = [
    ...localStorageKeys.map((name) => ({
      name,
      type: "localStorage"
    })),
    ...sessionStorageKeys.map((name) => ({
      name,
      type: "sessionStorage"
    })),
    ...indexedDBNames.map((name) => ({
      name,
      type: "IndexedDB"
    }))
  ];

  totalElement.textContent = entries.length;
  localElement.textContent = localStorageKeys.length;
  sessionElement.textContent = sessionStorageKeys.length;
  indexedDBElement.textContent = indexedDBNames.length;

  listElement.replaceChildren();

  if (entries.length === 0) {
    const emptyItem = document.createElement("li");

    emptyItem.className = "empty-state";
    emptyItem.textContent = "Nenhum armazenamento detectado.";

    listElement.appendChild(emptyItem);
    return;
  }

  entries.sort((firstEntry, secondEntry) => {
    const typeComparison =
      firstEntry.type.localeCompare(secondEntry.type);

    if (typeComparison !== 0) {
      return typeComparison;
    }

    return firstEntry.name.localeCompare(secondEntry.name);
  });

  for (const entry of entries) {
    const listItem = document.createElement("li");

    const nameElement = document.createElement("span");
    nameElement.className = "storage-name";
    nameElement.textContent = entry.name;

    const typeElement = document.createElement("span");
    typeElement.className = "storage-type";
    typeElement.textContent = entry.type;

    listItem.append(nameElement, typeElement);
    listElement.appendChild(listItem);
  }
}

function renderCanvas(canvas = {}) {
  const statusElement = document.getElementById("canvas-status");
  const indicatorElement = document.getElementById(
    "canvas-indicator"
  );
  const descriptionElement = document.getElementById(
    "canvas-description"
  );
  const listElement = document.getElementById(
    "canvas-method-list"
  );

  const methods = Array.isArray(canvas.methods)
    ? canvas.methods
    : [];

  const detected =
    canvas.detected === true || methods.length > 0;

  statusElement.classList.toggle("detected", detected);

  indicatorElement.textContent = detected
    ? "Possível fingerprinting detectado"
    : "Não detectado";

  descriptionElement.textContent = detected
    ? "A página realizou operações de leitura ou exportação de canvas."
    : "Nenhuma leitura suspeita de canvas foi observada.";

  listElement.replaceChildren();

  if (methods.length === 0) {
    const emptyItem = document.createElement("li");

    emptyItem.className = "empty-state";
    emptyItem.textContent =
      "Nenhum método de leitura detectado.";

    listElement.appendChild(emptyItem);
    return;
  }

  const sortedMethods = [...methods].sort(
    (firstMethod, secondMethod) =>
      firstMethod.localeCompare(secondMethod)
  );

  for (const method of sortedMethods) {
    const listItem = document.createElement("li");

    listItem.textContent = method;
    listElement.appendChild(listItem);
  }
}

function renderTracking(tracking = {}) {
  const countElement = document.getElementById(
    "tracking-parameter-count"
  );
  const bounceElement = document.getElementById(
    "bounce-status"
  );
  const redirectDetailsElement = document.getElementById(
    "redirect-details"
  );
  const redirectChainElement = document.getElementById(
    "redirect-chain"
  );
  const listElement = document.getElementById(
    "tracking-parameter-list"
  );

  const parameters = Array.isArray(tracking.parameters)
    ? tracking.parameters
    : [];

  const redirectChain = Array.isArray(tracking.redirectChain)
    ? tracking.redirectChain
    : [];

  const bounceDetected =
    tracking.bounceDetected === true;

  countElement.textContent = parameters.length;

  bounceElement.textContent = bounceDetected
    ? "Possível"
    : "Não";

  bounceElement.classList.toggle(
    "detected",
    bounceDetected
  );

  redirectDetailsElement.hidden =
    !bounceDetected || redirectChain.length === 0;

  redirectChainElement.textContent =
    redirectChain.join(" → ");

  listElement.replaceChildren();

  if (parameters.length === 0) {
    const emptyItem = document.createElement("li");

    emptyItem.className = "empty-state";
    emptyItem.textContent =
      "Nenhum parâmetro de rastreamento detectado.";

    listElement.appendChild(emptyItem);
    return;
  }

  const sortedParameters = [...parameters].sort(
    (firstParameter, secondParameter) => {
      const nameComparison =
        firstParameter.name.localeCompare(
          secondParameter.name
        );

      if (nameComparison !== 0) {
        return nameComparison;
      }

      return firstParameter.domain.localeCompare(
        secondParameter.domain
      );
    }
  );

  for (const parameter of sortedParameters) {
    const listItem = document.createElement("li");

    const nameElement = document.createElement("span");
    nameElement.className =
      "tracking-parameter-name";
    nameElement.textContent = parameter.name;

    const infoElement = document.createElement("span");
    infoElement.className =
      "tracking-parameter-info";
    infoElement.textContent =
      `${parameter.domain} · ${parameter.context} · ` +
      `${parameter.valueLength} caracteres`;

    listItem.append(nameElement, infoElement);
    listElement.appendChild(listItem);
  }
}

function renderSecurity(security = {}) {
  const statusElement = document.getElementById(
    "security-status"
  );
  const indicatorElement = document.getElementById(
    "security-indicator"
  );
  const descriptionElement = document.getElementById(
    "security-description"
  );
  const listElement = document.getElementById(
    "security-indicator-list"
  );

  const indicators = Array.isArray(security.indicators)
    ? security.indicators
    : [];

  const detected =
    security.detected === true || indicators.length > 0;

  statusElement.classList.toggle("detected", detected);

  indicatorElement.textContent = detected
    ? "Possível risco detectado"
    : "Não detectado";

  descriptionElement.textContent = detected
    ? "A página apresentou comportamentos associados a hijacking ou hook."
    : "Nenhum comportamento suspeito foi observado.";

  listElement.replaceChildren();

  if (indicators.length === 0) {
    const emptyItem = document.createElement("li");

    emptyItem.className = "empty-state";
    emptyItem.textContent =
      "Nenhum indicador de segurança detectado.";

    listElement.appendChild(emptyItem);
    return;
  }

  const indicatorLabels = {
    "websocket-connection":
      "WebSocket com domínio terceiro",
    "event-source-connection":
      "EventSource com domínio terceiro",
    "persistent-polling":
      "Polling persistente para domínio terceiro",
    "global-object-modification":
      "Objeto global modificado"
  };

  for (const indicator of indicators) {
    const listItem = document.createElement("li");

    const nameElement = document.createElement("span");
    nameElement.className = "security-indicator-name";
    nameElement.textContent =
      indicatorLabels[indicator.type] || indicator.type;

    const details = [];

    if (indicator.targetHostname) {
      details.push(indicator.targetHostname);
    }

    if (indicator.method) {
      details.push(indicator.method);
    }

    if (indicator.objectName) {
      details.push(indicator.objectName);
    }

    if (indicator.requestCount) {
      const seconds = indicator.windowMs
        ? Math.round(indicator.windowMs / 1000)
        : null;

      details.push(
        seconds
          ? `${indicator.requestCount} requisições em ${seconds}s`
          : `${indicator.requestCount} requisições`
      );
    }

    const infoElement = document.createElement("span");
    infoElement.className = "security-indicator-info";
    infoElement.textContent =
      details.join(" · ") || "Detalhes não disponíveis";

    listItem.append(nameElement, infoElement);
    listElement.appendChild(listItem);
  }
}

function calculatePrivacyScore(pageData) {
  const thirdPartyDomains = Array.isArray(
    pageData.thirdPartyDomains
  )
    ? pageData.thirdPartyDomains
    : [];

  const cookies = Array.isArray(pageData.cookies)
    ? pageData.cookies
    : [];

  const storage = pageData.storage || {};
  const canvas = pageData.canvas || {};
  const tracking = pageData.tracking || {};
  const security = pageData.security || {};

  const thirdPartyCookies = cookies.filter(
    (cookie) => cookie.party === "third-party"
  ).length;

  const persistentCookies = cookies.filter(
    (cookie) => cookie.duration === "persistent"
  ).length;

  const storageCount =
    (Array.isArray(storage.localStorage)
      ? storage.localStorage.length
      : 0) +
    (Array.isArray(storage.sessionStorage)
      ? storage.sessionStorage.length
      : 0) +
    (Array.isArray(storage.indexedDB)
      ? storage.indexedDB.length
      : 0);

  const trackingParameters = Array.isArray(
    tracking.parameters
  )
    ? tracking.parameters.length
    : 0;

  const securityIndicators = Array.isArray(
    security.indicators
  )
    ? security.indicators.length
    : 0;

  const deductions = [
    {
      label: "Domínios de terceiros",
      points: Math.min(
        20,
        thirdPartyDomains.length * 2
      )
    },
    {
      label: "Cookies de risco",
      points: Math.min(
        20,
        thirdPartyCookies * 3 + persistentCookies
      )
    },
    {
      label: "Armazenamento HTML5",
      points: Math.min(
        10,
        storageCount * 2
      )
    },
    {
      label: "Rastreamento por navegação",
      points: Math.min(
        20,
        trackingParameters * 2 +
          (tracking.bounceDetected === true ? 10 : 0)
      )
    },
    {
      label: "Canvas fingerprinting",
      points:
        canvas.detected === true ? 15 : 0
    },
    {
      label: "Hijacking/hook",
      points: Math.min(
        15,
        securityIndicators * 5
      )
    }
  ];

  const totalDeduction = deductions.reduce(
    (total, deduction) =>
      total + deduction.points,
    0
  );

  return {
    score: Math.max(0, 100 - totalDeduction),
    deductions
  };
}

function renderPrivacyScore(pageData) {
  const scoreSection =
    document.querySelector(".score");

  const scoreElement = document.getElementById(
    "privacy-score"
  );

  const classificationElement =
    document.getElementById(
      "score-classification"
    );

  const breakdownElement = document.getElementById(
    "score-breakdown"
  );

  scoreSection.classList.remove(
    "score-good",
    "score-moderate",
    "score-warning",
    "score-critical"
  );

  breakdownElement.replaceChildren();

  if (!pageData) {
    scoreElement.textContent = "--";
    classificationElement.textContent =
      "Aguardando análise";

    const listItem = document.createElement("li");
    listItem.textContent =
      "A pontuação começa em 100.";

    breakdownElement.appendChild(listItem);
    return;
  }

  const result = calculatePrivacyScore(pageData);

  let classification;
  let scoreClass;

  if (result.score >= 80) {
    classification = "Boa privacidade";
    scoreClass = "score-good";
  } else if (result.score >= 60) {
    classification = "Privacidade moderada";
    scoreClass = "score-moderate";
  } else if (result.score >= 40) {
    classification = "Atenção necessária";
    scoreClass = "score-warning";
  } else {
    classification = "Privacidade crítica";
    scoreClass = "score-critical";
  }

  scoreElement.textContent = result.score;
  classificationElement.textContent =
    classification;

  scoreSection.classList.add(scoreClass);

  for (const deduction of result.deductions) {
    const listItem = document.createElement("li");

    const labelElement =
      document.createElement("span");
    labelElement.textContent = deduction.label;

    const pointsElement =
      document.createElement("span");
    pointsElement.className = "score-deduction";
    pointsElement.textContent =
      deduction.points > 0
        ? `-${deduction.points}`
        : "0";

    listItem.append(
      labelElement,
      pointsElement
    );

    breakdownElement.appendChild(listItem);
  }
}

async function loadPageData() {
  const siteElement = document.getElementById(
    "current-site"
  );

  const thirdPartyElement = document.getElementById(
    "third-party-count"
  );

  const statusElement = document.getElementById(
    "status-message"
  );

  try {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true
    });

    const currentTab = tabs[0];

    if (
      !currentTab ||
      currentTab.id === undefined ||
      !currentTab.url
    ) {
      throw new Error(
        "Não foi possível acessar a aba atual."
      );
    }

    const currentUrl = new URL(currentTab.url);

    if (
      !["http:", "https:"].includes(
        currentUrl.protocol
      )
    ) {
      throw new Error(
        "Esta página não pode ser analisada."
      );
    }

    siteElement.textContent =
      currentUrl.hostname;

    const storageKey = `tab-${currentTab.id}`;

    const storedData =
      await browser.storage.local.get(storageKey);

    const pageData = storedData[storageKey];

    if (!pageData) {
      thirdPartyElement.textContent = "0";

      renderThirdPartyDomains([]);
      renderCookies([]);
      renderStorage();
      renderCanvas();
      renderTracking();
      renderSecurity();
      renderPrivacyScore();

      statusElement.textContent =
        "Recarregue a página para iniciar a análise.";

      return;
    }

    const thirdPartyDomains = Array.isArray(
      pageData.thirdPartyDomains
    )
      ? pageData.thirdPartyDomains
      : [];

    const cookies = Array.isArray(
      pageData.cookies
    )
      ? pageData.cookies
      : [];

    const storage = pageData.storage || {};
    const canvas = pageData.canvas || {};
    const tracking = pageData.tracking || {};
    const security = pageData.security || {};

    const storageCount =
      (Array.isArray(storage.localStorage)
        ? storage.localStorage.length
        : 0) +
      (Array.isArray(storage.sessionStorage)
        ? storage.sessionStorage.length
        : 0) +
      (Array.isArray(storage.indexedDB)
        ? storage.indexedDB.length
        : 0);

    thirdPartyElement.textContent =
      thirdPartyDomains.length;

    renderThirdPartyDomains(
      thirdPartyDomains
    );

    renderCookies(cookies);
    renderStorage(storage);
    renderCanvas(canvas);
    renderTracking(tracking);
    renderSecurity(security);

    renderPrivacyScore({
      thirdPartyDomains,
      cookies,
      storage,
      canvas,
      tracking,
      security
    });

    statusElement.textContent =
      `${thirdPartyDomains.length} domínios externos, ` +
      `${cookies.length} cookies e ` +
      `${storageCount} armazenamentos detectados.`;
  } catch (error) {
    siteElement.textContent =
      "Página não disponível";

    thirdPartyElement.textContent = "0";

    renderThirdPartyDomains([]);
    renderCookies([]);
    renderStorage();
    renderCanvas();
    renderTracking();
    renderSecurity();
    renderPrivacyScore();

    statusElement.textContent = error.message;
  }
}

document.addEventListener(
  "DOMContentLoaded",
  loadPageData
);