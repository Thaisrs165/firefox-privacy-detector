(() => {

  function reportCanvasAccess(method) {
    window.postMessage(
        {
        source: "privacy-detector",
        type: "canvas-fingerprint-signal",
        method
        },
        window.location.origin
    );
    }

  function wrapMethod(prototype, methodName, label) {
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

  wrapMethod(
    HTMLCanvasElement.prototype,
    "toDataURL",
    "HTMLCanvasElement.toDataURL"
  );

  wrapMethod(
    HTMLCanvasElement.prototype,
    "toBlob",
    "HTMLCanvasElement.toBlob"
  );

  wrapMethod(
    CanvasRenderingContext2D.prototype,
    "getImageData",
    "CanvasRenderingContext2D.getImageData"
  );

  if (typeof WebGLRenderingContext !== "undefined") {
    wrapMethod(
      WebGLRenderingContext.prototype,
      "readPixels",
      "WebGLRenderingContext.readPixels"
    );
  }

  if (typeof WebGL2RenderingContext !== "undefined") {
    wrapMethod(
      WebGL2RenderingContext.prototype,
      "readPixels",
      "WebGL2RenderingContext.readPixels"
    );
  }

  if (typeof OffscreenCanvas !== "undefined") {
    wrapMethod(
      OffscreenCanvas.prototype,
      "convertToBlob",
      "OffscreenCanvas.convertToBlob"
    );
  }
})();