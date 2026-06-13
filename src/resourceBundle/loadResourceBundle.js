import { assetUrl } from "../assetUrl.js";

export function loadResourceBundle(bundle, callbacks = {}) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./bundleWorker.js", import.meta.url), { type: "module" });

    worker.addEventListener("message", (event) => {
      if (event.data?.type === "bundle-complete") {
        worker.terminate();
        resolve(event.data.resources);
      }

      if (event.data?.type === "bundle-error") {
        worker.terminate();
        const error = new Error(event.data.message);
        callbacks.onError?.(error);
        reject(error);
      }
    });

    worker.addEventListener("error", (event) => {
      worker.terminate();
      callbacks.onError?.(event);
      reject(event);
    });

    worker.postMessage({
      type: "load-bundle",
      bundle,
      wasmUrl: assetUrl("wasm/bundle_loader.wasm")
    });
  });
}
