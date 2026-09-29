(() => {
  const MESSAGE_SOURCE = "privacy-detector";
  const POLLING_WINDOW_MS = 10000;
  const POLLING_THRESHOLD = 4;

  const requestHistory = new Map();
  const reportedPolling = new Set();
  const reportedGlobalChanges = new Set();

  function sendPageSignal(type, data = {}) {
    window.postMessage(
      {
        source: MESSAGE_SOURCE,
        type,
        ...data
      },
      window.location.origin
    );
  }

  function reportCanvasAccess(method) {
    sendPageSignal("canvas-fingerprint-signal", {
      method
    });
  }

  function reportSecurityIndicator(
    indicator,
    details = {}
  ) {
    sendPageSignal("security-indicator-signal", {
      indicator,
      ...details
    });
  }

  function getTargetHostname(url) {
    try {
      return new URL(url, window.location.href).hostname
        .toLowerCase()
        .replace(/\.$/, "");
    } catch {
      return null;
    }
  }

  function recordRepeatedRequest(method, url) {
    const targetHostname = getTargetHostname(url);

    if (!targetHostname) {
      return;
    }

    const requestKey = `${method}|${targetHostname}`;
    const currentTime = Date.now();

    const previousRequests = requestHistory.get(requestKey) || [];

    const recentRequests = previousRequests.filter(
      (requestTime) =>
        currentTime - requestTime <= POLLING_WINDOW_MS
    );

    recentRequests.push(currentTime);
    requestHistory.set(requestKey, recentRequests);

    if (
      recentRequests.length >= POLLING_THRESHOLD &&
      !reportedPolling.has(requestKey)
    ) {
      reportedPolling.add(requestKey);

      reportSecurityIndicator("persistent-polling", {
        method,
        targetHostname,
        requestCount: recentRequests.length,
        windowMs: POLLING_WINDOW_MS
      });
    }
  }

  function wrapCanvasMethod(
    prototype,
    methodName,
    label
  ) {
    if (!prototype) {
      return;
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      prototype,
      methodName
    );

    if (!descriptor || typeof descriptor.value !== "function") {
      return;
    }

    const originalMethod = descriptor.value;

    Object.defineProperty(prototype, methodName, {
      ...descriptor,
      value: function (...args) {
        reportCanvasAccess(label);

        return Reflect.apply(originalMethod, this, args);
      }
    });
  }

  function installCanvasMonitoring() {
    wrapCanvasMethod(
      HTMLCanvasElement.prototype,
      "toDataURL",
      "HTMLCanvasElement.toDataURL"
    );

    wrapCanvasMethod(
      HTMLCanvasElement.prototype,
      "toBlob",
      "HTMLCanvasElement.toBlob"
    );

    wrapCanvasMethod(
      CanvasRenderingContext2D.prototype,
      "getImageData",
      "CanvasRenderingContext2D.getImageData"
    );

    if (typeof WebGLRenderingContext !== "undefined") {
      wrapCanvasMethod(
        WebGLRenderingContext.prototype,
        "readPixels",
        "WebGLRenderingContext.readPixels"
      );
    }

    if (typeof WebGL2RenderingContext !== "undefined") {
      wrapCanvasMethod(
        WebGL2RenderingContext.prototype,
        "readPixels",
        "WebGL2RenderingContext.readPixels"
      );
    }

    if (typeof OffscreenCanvas !== "undefined") {
      wrapCanvasMethod(
        OffscreenCanvas.prototype,
        "convertToBlob",
        "OffscreenCanvas.convertToBlob"
      );
    }
  }

  function installFetchMonitoring() {
    if (typeof window.fetch !== "function") {
      return;
    }

    const originalFetch = window.fetch;

    window.fetch = function (...args) {
      const requestTarget = args[0];

      const requestUrl =
        typeof requestTarget === "string"
          ? requestTarget
          : requestTarget?.url;

      if (requestUrl) {
        recordRepeatedRequest("fetch", requestUrl);
      }

      return Reflect.apply(originalFetch, this, args);
    };
  }

  function installXMLHttpRequestMonitoring() {
    if (
      typeof XMLHttpRequest === "undefined" ||
      typeof XMLHttpRequest.prototype.open !== "function"
    ) {
      return;
    }

    const originalOpen = XMLHttpRequest.prototype.open;

    XMLHttpRequest.prototype.open = function (
      method,
      url,
      ...remainingArguments
    ) {
      if (url) {
        recordRepeatedRequest(
          "XMLHttpRequest",
          String(url)
        );
      }

      return Reflect.apply(originalOpen, this, [
        method,
        url,
        ...remainingArguments
      ]);
    };
  }

  function installWebSocketMonitoring() {
    if (typeof window.WebSocket !== "function") {
      return;
    }

    const OriginalWebSocket = window.WebSocket;

    function MonitoredWebSocket(url, protocols) {
      const targetHostname = getTargetHostname(url);

      reportSecurityIndicator("websocket-connection", {
        targetHostname,
        url: String(url)
      });

      const argumentsList =
        protocols === undefined
          ? [url]
          : [url, protocols];

      return Reflect.construct(
        OriginalWebSocket,
        argumentsList
      );
    }

    Object.setPrototypeOf(
      MonitoredWebSocket,
      OriginalWebSocket
    );

    MonitoredWebSocket.prototype =
      OriginalWebSocket.prototype;

    window.WebSocket = MonitoredWebSocket;
  }

  function installEventSourceMonitoring() {
    if (typeof window.EventSource !== "function") {
      return;
    }

    const OriginalEventSource = window.EventSource;

    function MonitoredEventSource(url, configuration) {
      const targetHostname = getTargetHostname(url);

      reportSecurityIndicator("event-source-connection", {
        targetHostname,
        url: String(url)
      });

      const argumentsList =
        configuration === undefined
          ? [url]
          : [url, configuration];

      return Reflect.construct(
        OriginalEventSource,
        argumentsList
      );
    }

    Object.setPrototypeOf(
      MonitoredEventSource,
      OriginalEventSource
    );

    MonitoredEventSource.prototype =
      OriginalEventSource.prototype;

    window.EventSource = MonitoredEventSource;
  }

  installCanvasMonitoring();
  installFetchMonitoring();
  installXMLHttpRequestMonitoring();
  installWebSocketMonitoring();
  installEventSourceMonitoring();

  const protectedApis = [
    {
      label: "window.fetch",
      getValue: () => window.fetch
    },
    {
      label: "window.WebSocket",
      getValue: () => window.WebSocket
    },
    {
      label: "window.EventSource",
      getValue: () => window.EventSource
    },
    {
      label: "XMLHttpRequest.prototype.open",
      getValue: () => XMLHttpRequest.prototype.open
    },
    {
      label: "history.pushState",
      getValue: () => history.pushState
    },
    {
      label: "history.replaceState",
      getValue: () => history.replaceState
    }
  ];

  const originalApiValues = new Map();

  for (const protectedApi of protectedApis) {
    try {
      originalApiValues.set(
        protectedApi.label,
        protectedApi.getValue()
      );
    } catch {
      // A API não está disponível nesta página.
    }
  }

  window.setInterval(() => {
    for (const protectedApi of protectedApis) {
      if (reportedGlobalChanges.has(protectedApi.label)) {
        continue;
      }

      try {
        const originalValue = originalApiValues.get(
          protectedApi.label
        );

        const currentValue = protectedApi.getValue();

        if (
          originalValue !== undefined &&
          currentValue !== originalValue
        ) {
          reportedGlobalChanges.add(protectedApi.label);

          reportSecurityIndicator(
            "global-object-modification",
            {
              objectName: protectedApi.label
            }
          );
        }
      } catch {
        // Ignora APIs indisponíveis ou protegidas.
      }
    }
  }, 2000);
})();