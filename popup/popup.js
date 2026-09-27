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

  const sortedDomains = [...domains].sort((firstDomain, secondDomain) =>
    firstDomain.localeCompare(secondDomain)
  );

  for (const domain of sortedDomains) {
    const listItem = document.createElement("li");

    listItem.textContent = domain;
    listElement.appendChild(listItem);
  }
}

async function loadPageData() {
  const siteElement = document.getElementById("current-site");
  const thirdPartyElement = document.getElementById("third-party-count");
  const statusElement = document.getElementById("status-message");

  try {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true
    });

    const currentTab = tabs[0];

    if (!currentTab || !currentTab.id || !currentTab.url) {
      throw new Error("Não foi possível acessar a aba atual.");
    }

    const currentUrl = new URL(currentTab.url);

    if (!["http:", "https:"].includes(currentUrl.protocol)) {
      throw new Error("Esta página não pode ser analisada.");
    }

    siteElement.textContent = currentUrl.hostname;

    const storageKey = `tab-${currentTab.id}`;
    const storedData = await browser.storage.local.get(storageKey);
    const pageData = storedData[storageKey];

    if (!pageData) {
      thirdPartyElement.textContent = "0";
      renderThirdPartyDomains([]);
      statusElement.textContent =
        "Recarregue a página para iniciar a análise.";
      return;
    }

    const thirdPartyDomains = Array.isArray(pageData.thirdPartyDomains)
      ? pageData.thirdPartyDomains
      : [];

    thirdPartyElement.textContent = thirdPartyDomains.length;
    renderThirdPartyDomains(thirdPartyDomains);

    if (thirdPartyDomains.length === 0) {
      statusElement.textContent =
        "Nenhum domínio de terceiro detectado.";
    } else if (thirdPartyDomains.length === 1) {
      statusElement.textContent =
        "1 domínio de terceiro detectado.";
    } else {
      statusElement.textContent =
        `${thirdPartyDomains.length} domínios de terceiros detectados.`;
    }
  } catch (error) {
    siteElement.textContent = "Página não disponível";
    thirdPartyElement.textContent = "0";
    renderThirdPartyDomains([]);
    statusElement.textContent = error.message;
  }
}

document.addEventListener("DOMContentLoaded", loadPageData);