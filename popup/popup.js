async function showCurrentSite() {
  const siteElement = document.getElementById("current-site");
  const statusElement = document.getElementById("status-message");

  try {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true
    });

    const currentTab = tabs[0];

    if (!currentTab || !currentTab.url) {
      throw new Error("Não foi possível acessar a aba atual.");
    }

    const currentUrl = new URL(currentTab.url);

    if (!["http:", "https:"].includes(currentUrl.protocol)) {
      throw new Error("Esta página não pode ser analisada.");
    }

    siteElement.textContent = currentUrl.hostname;
    statusElement.textContent = "Extensão pronta para iniciar a análise.";
  } catch (error) {
    siteElement.textContent = "Página não disponível";
    statusElement.textContent = error.message;
  }
}

document.addEventListener("DOMContentLoaded", showCurrentSite);