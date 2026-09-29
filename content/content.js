const ALLOWED_SECURITY_INDICATORS = new Set([
  "websocket-connection",
  "event-source-connection",
  "persistent-polling",
  "global-object-modification"
]);

function sendRuntimeMessage(message, errorDescription) {
  browser.runtime
    .sendMessage(message)
    .catch((error) => {
      console.error(errorDescription, error);
    });
}

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
    message.source !== "privacy-detector"
  ) {
    return;
  }

  if (
    message.type === "canvas-fingerprint-signal" &&
    typeof message.method === "string"
  ) {
    sendRuntimeMessage(
      {
        type: "canvas-fingerprint-signal",
        method: message.method
      },
      "Não foi possível enviar o alerta de canvas:"
    );

    return;
  }

  if (
    message.type === "security-indicator-signal" &&
    typeof message.indicator === "string" &&
    ALLOWED_SECURITY_INDICATORS.has(message.indicator)
  ) {
    const securityMessage = {
      type: "security-indicator-signal",
      indicator: message.indicator
    };

    if (typeof message.targetHostname === "string") {
      securityMessage.targetHostname =
        message.targetHostname;
    }

    if (typeof message.url === "string") {
      securityMessage.url = message.url;
    }

    if (typeof message.method === "string") {
      securityMessage.method = message.method;
    }

    if (typeof message.objectName === "string") {
      securityMessage.objectName = message.objectName;
    }

    if (Number.isInteger(message.requestCount)) {
      securityMessage.requestCount =
        message.requestCount;
    }

    if (Number.isInteger(message.windowMs)) {
      securityMessage.windowMs = message.windowMs;
    }

    sendRuntimeMessage(
      securityMessage,
      "Não foi possível enviar o alerta de segurança:"
    );
  }
});

function getStorageKeys(storage) {
  const keys = [];

  try {
    for (
      let index = 0;
      index < storage.length;
      index += 1
    ) {
      const key = storage.key(index);

      if (key !== null) {
        keys.push(key);
      }
    }
  } catch (error) {
    console.error(
      "Não foi possível acessar o armazenamento:",
      error
    );
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
    console.error(
      "Não foi possível acessar o IndexedDB:",
      error
    );

    return [];
  }
}

async function reportClientStorage() {
  const storageData = {
    localStorage: getStorageKeys(window.localStorage),
    sessionStorage: getStorageKeys(
      window.sessionStorage
    ),
    indexedDB: await getIndexedDBNames()
  };

  try {
    await browser.runtime.sendMessage({
      type: "client-storage-report",
      storage: storageData
    });
  } catch (error) {
    console.error(
      "Não foi possível enviar os dados:",
      error
    );
  }
}

reportClientStorage();

window.setTimeout(reportClientStorage, 2000);