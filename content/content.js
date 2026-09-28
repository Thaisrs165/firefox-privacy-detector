window.addEventListener("message", (event) => {
  if (
    event.source !== window ||
    event.origin !== window.location.origin
  ) {
    return;
  }

  const message = event.data;

  if (
    !message ||
    message.source !== "privacy-detector" ||
    message.type !== "canvas-fingerprint-signal" ||
    typeof message.method !== "string"
  ) {
    return;
  }

  browser.runtime
    .sendMessage({
      type: "canvas-fingerprint-signal",
      method: message.method
    })
    .catch((error) => {
      console.error(
        "Não foi possível enviar o alerta de canvas:",
        error
      );
    });
});

function getStorageKeys(storage) {
  const keys = [];

  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);

      if (key !== null) {
        keys.push(key);
      }
    }
  } catch (error) {
    console.error("Não foi possível acessar o armazenamento:", error);
  }

  return keys.sort((firstKey, secondKey) =>
    firstKey.localeCompare(secondKey)
  );
}

async function getIndexedDBNames() {
  if (typeof indexedDB.databases !== "function") {
    return [];
  }

  try {
    const databases = await indexedDB.databases();

    return databases
      .map((database) => database.name)
      .filter(Boolean)
      .sort((firstName, secondName) =>
        firstName.localeCompare(secondName)
      );
  } catch (error) {
    console.error("Não foi possível acessar o IndexedDB:", error);
    return [];
  }
}

async function reportClientStorage() {
  const storageData = {
    localStorage: getStorageKeys(window.localStorage),
    sessionStorage: getStorageKeys(window.sessionStorage),
    indexedDB: await getIndexedDBNames()
  };

  try {
    await browser.runtime.sendMessage({
      type: "client-storage-report",
      storage: storageData
    });
  } catch (error) {
    console.error("Não foi possível enviar os dados:", error);
  }
}

reportClientStorage();

window.setTimeout(reportClientStorage, 2000);