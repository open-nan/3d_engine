const decoder = new TextDecoder();

self.addEventListener("message", async (event) => {
  if (event.data?.type !== "load-bundle") return;

  try {
    const wasm = await loadWasm(event.data.wasmUrl);
    const bundle = await fetchArrayBuffer(event.data.bundle.url);
    const resources = loadBundleResources(wasm, new Uint8Array(bundle));
    const transfers = resources.map((resource) => resource.buffer);
    self.postMessage(
      {
        type: "bundle-complete",
        bundle: event.data.bundle,
        resources
      },
      transfers
    );
  } catch (error) {
    self.postMessage({
      type: "bundle-error",
      message: error?.message || String(error)
    });
  }
});

async function loadWasm(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load bundle wasm: ${response.status} ${response.statusText}`);
  const { instance } = await WebAssembly.instantiateStreaming(response, {});
  return instance.exports;
}

async function fetchArrayBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load resource bundle: ${response.status} ${response.statusText}`);
  return response.arrayBuffer();
}

function loadBundleResources(wasm, bundleBytes) {
  const ptr = wasm.alloc(bundleBytes.byteLength);
  new Uint8Array(wasm.memory.buffer, ptr, bundleBytes.byteLength).set(bundleBytes);
  const ok = wasm.bundle_load(ptr, bundleBytes.byteLength);
  wasm.free(ptr, bundleBytes.byteLength);
  if (ok !== 1) throw new Error(wasmError(wasm));

  const count = wasm.bundle_file_count();
  const resources = [];
  for (let i = 0; i < count; i += 1) {
    if (wasm.bundle_decompress(i) !== 1) {
      throw new Error(wasmError(wasm));
    }

    const name = readUtf8(wasm, wasm.bundle_file_name_ptr(i), wasm.bundle_file_name_len(i));
    const outputPtr = wasm.bundle_output_ptr();
    const outputLen = wasm.bundle_output_len();
    const copy = new Uint8Array(outputLen);
    copy.set(new Uint8Array(wasm.memory.buffer, outputPtr, outputLen));
    resources.push({
      fileName: name,
      buffer: copy.buffer,
      byteLength: outputLen
    });
  }
  return resources;
}

function wasmError(wasm) {
  const message = readUtf8(wasm, wasm.bundle_error_ptr(), wasm.bundle_error_len());
  return message || "resource bundle decode failed";
}

function readUtf8(wasm, ptr, len) {
  if (!ptr || len === 0) return "";
  return decoder.decode(new Uint8Array(wasm.memory.buffer, ptr, len));
}
