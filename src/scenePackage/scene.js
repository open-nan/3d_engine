import { loadResourceBundle } from "../resourceBundle/loadResourceBundle.js";

export async function renderScene(scene, renderer, wasm, callbacks = {}) {
  let resources;
  try {
    resources = scene.resourceBundle
      ? await loadResourceBundle(scene.resourceBundle, callbacks)
      : [];
  } catch (error) {
    callbacks.onError?.(error);
    return;
  }

  const worker = new Worker(new URL("../modelWorker.js", import.meta.url), { type: "module" });

  worker.addEventListener("message", (event) => {
    const { type } = event.data;
    if (type === "complete") {
      const result = uploadSceneModels(scene, event.data.models, renderer, wasm);
      callbacks.onComplete?.({
        parsed: event.data.parsed,
        skipped: event.data.skipped,
        ...result
      });
      worker.terminate();
    }

    if (type === "warning") {
      callbacks.onWarning?.(event.data.message);
    }
  });

  worker.addEventListener("error", (event) => {
    callbacks.onError?.(event);
    worker.terminate();
  });

  worker.postMessage({
    type: "load",
    files: scene.resources,
    resources,
    textureSize: scene.textureSize
  }, resources.map((resource) => resource.buffer));
}

export function uploadSceneModels(scene, models, renderer, wasm) {
  let loadedModels = 0;
  let loadedTextures = 0;

  if (!renderer) {
    return { loadedModels, loadedTextures };
  }

  renderer.clearModels();
  const particleEffectIds = particleEffectIdTable(wasm);

  for (const [modelId, model] of models.entries()) {
    const instance = sceneInstance(scene, modelId, models.length, model.fileName);
    const effect = sceneEffect(scene, model.fileName, particleEffectIds);
    const material = sceneMaterial(scene, model.fileName, model.hasTexture);
    renderer.addModel(model, instance, effect, material);
    loadedModels += 1;
    if (model.hasTexture) loadedTextures += 1;
  }

  renderer.registerPhysicsLights(wasm);
  return { loadedModels, loadedTextures };
}

export function sceneInstance(scene, index, total, fileName) {
  const layout = scene.layout;
  const row = Math.floor(index / layout.columns);
  const col = index % layout.columns;
  const rows = Math.ceil(total / layout.columns);

  return {
    x: (col - (layout.columns - 1) * 0.5) * layout.spacing,
    y: layout.groundClearance,
    z: layout.startZ + row * layout.rowSpacing,
    yaw: (hashString(fileName) % 628) / 100,
    scale: rows > 6 ? layout.compactScale : layout.defaultScale
  };
}

export function sceneEffect(scene, fileName, particleEffectIds) {
  const effect = scene.effects?.[fileName];
  if (!effect) return null;

  return {
    ...effect,
    flame: effect.flame
      ? {
          ...effect.flame,
          particleEffectId: particleEffectIds[effect.flame.particleEffect] || particleEffectIds.NONE
        }
      : undefined,
    electricLight: effect.electricLight
      ? {
          ...effect.electricLight,
          particleEffectId:
            particleEffectIds[effect.electricLight.particleEffect] || particleEffectIds.NONE
        }
      : undefined
  };
}

export function sceneMaterial(scene, fileName, hasTexture) {
  const materials = scene.materials || {};
  return {
    ...(hasTexture ? materials.textured : materials.default),
    ...(materials.overrides?.[fileName] || {})
  };
}

export function particleEffectIdTable(wasm) {
  return {
    NONE: wasm.particle_effect_none?.() ?? 0,
    FLAME: wasm.particle_effect_flame?.() ?? 1,
    ELECTRIC_GLOW: wasm.particle_effect_electric_glow?.() ?? 2
  };
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
