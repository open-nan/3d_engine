import { DEFAULT_SCENE, renderScene } from "./scenePackage/index.js";

const INPUT = {
  up: 1,
  down: 2,
  left: 4,
  right: 8,
  rise: 16,
  sink: 32
};

const FALLBACK_WIDTH = 480;
const FALLBACK_HEIGHT = 270;
const FOCAL_LENGTH = 265;
const BASE_VERTICAL_FOV = 2 * Math.atan((FALLBACK_HEIGHT * 0.5) / FOCAL_LENGTH);
const MAX_EFFECT_LIGHTS = 12;
const MODEL_BOB_HEIGHT = 0.035;
const PARTICLE_STRIDE = 12;
const DEFAULT_MATERIAL = {
  reflectivity: 0.1,
  roughness: 0.72,
  fresnel: 0.42,
  envIntensity: 0.55
};
const FLOOR_MATERIAL = DEFAULT_SCENE.materials?.floor || {
  reflectivity: 0.32,
  roughness: 0.48,
  fresnel: 0.7,
  envIntensity: 0.68
};

const keys = new Set();
const canvas = document.querySelector("#stage");
const scoreEl = document.querySelector("#score");
const healthEl = document.querySelector("#health");
const energyEl = document.querySelector("#energy");
const modelsEl = document.querySelector("#models");
const texturesEl = document.querySelector("#textures");
const fpsEl = document.querySelector("#fps");
const timeEl = document.querySelector("#time");
const messageEl = document.querySelector("#message");
const pauseBtn = document.querySelector("#pause");
const restartBtn = document.querySelector("#restart");

let wasm;
let renderer;
let lastTime = performance.now();
let paused = false;
let lookX = 0;
let lookY = 0;
let smoothedFps = 0;
let renderTime = 0;
let draggingLook = false;
let lastPointerX = 0;
let lastPointerY = 0;
let triangleCount = 0;
let loadedModels = 0;
let loadedTextures = 0;
window.resourceDebug = { parsed: 0, uploaded: 0, skipped: 0, renderer: "loading" };

async function boot() {
  const response = await fetch("/wasm/engine.wasm");
  const { instance } = await WebAssembly.instantiateStreaming(response, {});
  wasm = instance.exports;

  canvas.width = wasm.width ? wasm.width() : FALLBACK_WIDTH;
  canvas.height = wasm.height ? wasm.height() : FALLBACK_HEIGHT;
  renderer = createWebGlRenderer(canvas);
  window.resourceDebug.renderer = renderer ? "webgl2" : "software-fallback";

  restart();
  loadActiveScene();
  requestAnimationFrame(loop);
}

function restart() {
  const seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
  wasm.init(seed);
  paused = false;
  pauseBtn.textContent = "暂停";
  messageEl.classList.add("hidden");
  lastTime = performance.now();
  renderTime = 0;
  renderer?.registerPhysicsLights(wasm);
}

function loop(now) {
  const dt = now - lastTime;
  lastTime = now;
  updateFps(dt);

  if (!paused) {
    renderTime += dt / 1000;
    wasm.set_input(inputMask());
    wasm.set_look(lookX, lookY);
    lookX = 0;
    lookY = 0;
    if (renderer && wasm.update_camera) {
      wasm.update_camera(dt);
    } else {
      wasm.update(dt);
    }
  }

  draw();
  syncHud();
  requestAnimationFrame(loop);
}

function draw() {
  if (renderer) {
    renderer.render(cameraState());
    triangleCount = renderer.triangleCount();
    return;
  }

  const ctx = canvas.getContext("2d", { alpha: false });
  const ptr = wasm.buffer_ptr();
  const len = canvas.width * canvas.height * 4;
  const pixels = new Uint8ClampedArray(wasm.memory.buffer, ptr, len);
  const imageData = ctx.createImageData(canvas.width, canvas.height);
  imageData.data.set(pixels);
  ctx.putImageData(imageData, 0, 0);
  triangleCount = wasm.score();
}

function syncHud() {
  scoreEl.textContent = triangleCount;
  healthEl.textContent = `${(wasm.health() / 100).toFixed(2)}m`;
  energyEl.textContent = `${(wasm.energy() / 20).toFixed(1)}m/s`;
  modelsEl.textContent = `${renderer ? loadedModels : wasm.loaded_instance_count()}`;
  texturesEl.textContent = `${renderer ? loadedTextures : wasm.loaded_texture_count()}`;
  fpsEl.textContent = `${Math.round(smoothedFps)} FPS`;
  timeEl.textContent = `${wasm.elapsed_seconds()}s`;

  const over = wasm.is_game_over() === 1;
  messageEl.classList.toggle("hidden", !over);
}

function updateFps(dt) {
  if (dt <= 0) return;
  const currentFps = 1000 / dt;
  smoothedFps = smoothedFps === 0 ? currentFps : smoothedFps * 0.9 + currentFps * 0.1;
}

function inputMask() {
  let mask = 0;
  if (keys.has("arrowup") || keys.has("w")) mask |= INPUT.up;
  if (keys.has("arrowdown") || keys.has("s")) mask |= INPUT.down;
  if (keys.has("arrowleft") || keys.has("a")) mask |= INPUT.left;
  if (keys.has("arrowright") || keys.has("d")) mask |= INPUT.right;
  if (keys.has("q")) mask |= INPUT.rise;
  if (keys.has("e")) mask |= INPUT.sink;
  return mask;
}

function cameraState() {
  return {
    x: wasm.camera_x(),
    y: wasm.camera_y(),
    z: wasm.camera_z(),
    yaw: wasm.camera_yaw(),
    pitch: wasm.camera_pitch(),
    time: renderTime
  };
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  keys.add(key);

  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "q", "e"].includes(key)) {
    event.preventDefault();
  }
  if (key === "p") togglePause();
  if (key === "r") restart();
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

pauseBtn.addEventListener("click", togglePause);
restartBtn.addEventListener("click", restart);
canvas.addEventListener("click", (event) => {
  if (tryToggleLight(event)) {
    return;
  }
  canvas.requestPointerLock?.();
});

canvas.addEventListener("mousedown", (event) => {
  if (event.button !== 0) return;
  draggingLook = true;
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
  event.preventDefault();
});

window.addEventListener("mouseup", () => {
  draggingLook = false;
});

window.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement === canvas) {
    lookX += event.movementX;
    lookY += event.movementY;
    return;
  }

  if (draggingLook) {
    lookX += event.clientX - lastPointerX;
    lookY += event.clientY - lastPointerY;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
  }
});

function togglePause() {
  paused = !paused;
  pauseBtn.textContent = paused ? "继续" : "暂停";
}

function tryToggleLight(event) {
  if (!renderer || !wasm.physics_toggle_light_by_ray) return false;
  const ray = pointerRay(event);
  const hit = wasm.physics_toggle_light_by_ray(
    ray.origin[0],
    ray.origin[1],
    ray.origin[2],
    ray.direction[0],
    ray.direction[1],
    ray.direction[2]
  );
  if (hit < 0) return false;
  renderer.syncLightState(wasm, hit);
  return true;
}

function pointerRay(event) {
  const camera = cameraState();
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = 1 - ((event.clientY - rect.top) / rect.height) * 2;
  const aspect = rect.width / rect.height;
  const tanHalfFov = Math.tan(BASE_VERTICAL_FOV * 0.5);
  const cameraRay = normalize([x * aspect * tanHalfFov, y * tanHalfFov, 1]);
  return {
    origin: [camera.x, camera.y, camera.z],
    direction: cameraRayToWorld(cameraRay, camera)
  };
}

function cameraRayToWorld(ray, camera) {
  const sinP = Math.sin(camera.pitch);
  const cosP = Math.cos(camera.pitch);
  const y = cosP * ray[1] - sinP * ray[2];
  const z = sinP * ray[1] + cosP * ray[2];
  const sinY = Math.sin(camera.yaw);
  const cosY = Math.cos(camera.yaw);
  return normalize([
    cosY * ray[0] + sinY * z,
    y,
    -sinY * ray[0] + cosY * z
  ]);
}

function loadActiveScene() {
  loadedModels = 0;
  loadedTextures = 0;
  renderScene(DEFAULT_SCENE, renderer, wasm, {
    onComplete(result) {
      loadedModels = result.loadedModels;
      loadedTextures = result.loadedTextures;
      window.resourceDebug = {
        parsed: result.parsed,
        uploaded: loadedModels,
        skipped: result.skipped,
        renderer: renderer ? "webgl2" : "software-fallback",
        scene: DEFAULT_SCENE.id
      };
    },
    onWarning(message) {
      console.warn(message);
    },
    onError(event) {
      console.warn("Scene worker failed:", event.message);
    }
  });
}

function createWebGlRenderer(targetCanvas) {
  const gl = targetCanvas.getContext("webgl2", {
    antialias: true,
    alpha: false,
    depth: true,
    powerPreference: "high-performance"
  });
  if (!gl) return null;

  const meshProgram = createProgram(gl, MESH_VERTEX_SHADER, MESH_FRAGMENT_SHADER);
  const skyProgram = createProgram(gl, SKY_VERTEX_SHADER, SKY_FRAGMENT_SHADER);
  const particleProgram = createProgram(gl, PARTICLE_VERTEX_SHADER, PARTICLE_FRAGMENT_SHADER);
  const meshLocations = meshProgramLocations(gl, meshProgram);
  const skyLocations = skyProgramLocations(gl, skyProgram);
  const particleLocations = particleProgramLocations(gl, particleProgram);
  const models = [];
  const emitters = [];
  const particleBuffer = gl.createBuffer();
  const floor = createFloorMesh(gl);
  let submittedTriangles = floor.triangleCount;

  gl.enable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0.02, 0.03, 0.06, 1);

  return {
    clearModels() {
      models.splice(0, models.length);
      emitters.splice(0, emitters.length);
    },
    addModel(model, instance, effectConfig, materialConfig) {
      const mesh = createModelMesh(gl, model, instance, effectConfig, materialConfig);
      models.push(mesh);
      if (effectConfig?.flame) {
        emitters.push(...createEffectEmitters(instance, effectConfig));
      }
      if (effectConfig?.electricLight) {
        const emitter = createElectricEmitter(instance, effectConfig.electricLight, effectConfig.shadeTransmission);
        mesh.shadeEmitter = emitter;
        emitters.push(emitter);
      }
    },
    render(camera) {
      resizeCanvasToDisplaySize(targetCanvas);
      gl.viewport(0, 0, targetCanvas.width, targetCanvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      renderSky(gl, skyProgram, skyLocations, camera, targetCanvas);

      gl.useProgram(meshProgram);
      setCameraUniforms(gl, meshLocations, camera, targetCanvas, emitters);
      renderMesh(gl, meshLocations, floor, camera.time);
      submittedTriangles = floor.triangleCount;
      for (const model of models) {
        renderMesh(gl, meshLocations, model, camera.time);
        submittedTriangles += model.triangleCount;
      }
      renderParticles(gl, particleProgram, particleLocations, particleBuffer, emitters, camera, targetCanvas);
    },
    triangleCount() {
      return submittedTriangles;
    },
    registerPhysicsLights(physics) {
      if (!physics?.physics_clear_lights) return;
      physics.physics_clear_lights();
      for (const [index, emitter] of emitters.entries()) {
        emitter.lightId = index;
        emitter.enabled = true;
        physics.physics_register_light(
          index,
          emitter.position[0],
          emitter.position[1],
          emitter.position[2],
          emitter.softLight.pickRadius || 0.4
        );
      }
    },
    syncLightState(physics, lightId) {
      if (!physics?.physics_light_enabled) return;
      for (const emitter of emitters) {
        if (emitter.lightId === lightId) {
          emitter.enabled = physics.physics_light_enabled(lightId) === 1;
        }
      }
    }
  };
}

function createModelMesh(gl, model, instance, effectConfig, materialConfig) {
  const vertexData = buildVertexData(model, materialConfig);
  return {
    buffer: createArrayBuffer(gl, vertexData),
    texture: createTexture(gl, model.texturePixels, model.textureWidth, model.textureHeight),
    vertexCount: model.triangleCount * 3,
    triangleCount: model.triangleCount,
    hasTexture: model.hasTexture ? 1 : 0,
    instance,
    shadeTransmission: effectConfig?.shadeTransmission || null
  };
}

function createEffectEmitters(instance, config) {
  const positions = config.flame.localPositions || [config.flame.localPosition || [0, 0, 0]];
  return positions.map((localPosition, index) => {
    const position = transformLocalPoint(localPosition, instance);
    return {
      position,
      instance,
      flame: {
        ...config.flame,
        localPosition
      },
      particleEffectId: config.flame.particleEffectId,
      particleShape: config.flame.particleShape || "flame",
      softLight: config.softLight,
      seed: hashFloat(position[0] * 3.7 + position[1] * 9.1 + position[2] * 5.3 + index * 11.37)
    };
  });
}

function createElectricEmitter(instance, electricLight, shadeTransmission) {
  const position = transformLocalPoint(electricLight.localPosition || [0, 0, 0], instance);
  const transmittedColor = shadeTransmission
    ? transmittedLightColor(electricLight.color, shadeTransmission.color, shadeTransmission.strength)
    : electricLight.color;
  return {
    position,
    instance,
    electricLight,
    particleEffectId: electricLight.particleEffectId,
    particleShape: electricLight.particleShape || "orb",
    ellipsoid: electricLight.ellipsoid || [1, 1, 1],
    softLight: {
      color: transmittedColor,
      sourceColor: electricLight.color,
      intensity: electricLight.intensity,
      radius: electricLight.radius,
      glowSize: electricLight.glowSize,
      flicker: electricLight.flicker ?? 0.0
    },
    seed: hashFloat(position[0] * 4.1 + position[1] * 7.9 + position[2] * 6.3)
  };
}

function transmittedLightColor(lightColor, shadeColor, strength) {
  const amount = Math.max(0, Math.min(strength ?? 0, 1));
  const energy = Math.max(lightColor[0], lightColor[1], lightColor[2]);
  return lightColor.map((channel, index) => {
    const filtered = channel * shadeColor[index];
    const scatter = shadeColor[index] * energy * 0.42;
    return channel * (1 - amount) + (filtered + scatter) * amount;
  });
}

function transformLocalPoint(point, instance) {
  const x = point[0] * instance.scale;
  const y = point[1] * instance.scale;
  const z = point[2] * instance.scale;
  const sin = Math.sin(instance.yaw);
  const cos = Math.cos(instance.yaw);
  return [
    x * cos + z * sin + instance.x,
    y + instance.y,
    -x * sin + z * cos + instance.z
  ];
}

function createFloorMesh(gl) {
  const extent = 16;
  const vertices = [];
  for (let z = -extent; z < extent; z += 1) {
    for (let x = -extent; x < extent; x += 1) {
      const bright = ((x + z) & 1) === 0;
      const color = bright ? [0.07, 0.13, 0.23] : [0.043, 0.098, 0.176];
      pushTriangle(vertices, [x, -0.02, z], [x + 1, -0.02, z], [x + 1, -0.02, z + 1], color, 0.34);
      pushTriangle(vertices, [x, -0.02, z], [x + 1, -0.02, z + 1], [x, -0.02, z + 1], color, 0.34);
    }
  }
  const vertexData = new Float32Array(vertices);
  return {
    buffer: createArrayBuffer(gl, vertexData),
    texture: createTexture(gl, null, 1, 1),
    vertexCount: vertexData.length / 15,
    triangleCount: vertexData.length / 45,
    hasTexture: 0,
    instance: { x: 0, y: 0, z: 0, yaw: 0, scale: 1, static: true }
  };
}

function buildVertexData(model, materialConfig = DEFAULT_MATERIAL) {
  const material = {
    ...DEFAULT_MATERIAL,
    ...materialConfig
  };
  const data = new Float32Array(model.triangleCount * 3 * 15);
  let out = 0;
  for (let triangle = 0; triangle < model.triangleCount; triangle += 1) {
    const p = triangle * 9;
    const uv = triangle * 6;
    const c = triangle * 3;
    const a = [model.positions[p], model.positions[p + 1], model.positions[p + 2]];
    const b = [model.positions[p + 3], model.positions[p + 4], model.positions[p + 5]];
    const cpos = [model.positions[p + 6], model.positions[p + 7], model.positions[p + 8]];
    const normal = normalOf(a, b, cpos);
    const color = [model.colors[c] / 255, model.colors[c + 1] / 255, model.colors[c + 2] / 255];
    out = writeVertex(data, out, a, normal, [model.uvs[uv], model.uvs[uv + 1]], color, material);
    out = writeVertex(data, out, b, normal, [model.uvs[uv + 2], model.uvs[uv + 3]], color, material);
    out = writeVertex(data, out, cpos, normal, [model.uvs[uv + 4], model.uvs[uv + 5]], color, material);
  }
  return data;
}

function pushTriangle(vertices, a, b, c, color, reflectivity) {
  const normal = normalOf(a, b, c);
  const material = { ...FLOOR_MATERIAL, reflectivity };
  writeVertex(vertices, vertices.length, a, normal, [0, 0], color, material);
  writeVertex(vertices, vertices.length, b, normal, [1, 0], color, material);
  writeVertex(vertices, vertices.length, c, normal, [1, 1], color, material);
}

function writeVertex(target, offset, position, normal, uv, color, material) {
  target[offset] = position[0];
  target[offset + 1] = position[1];
  target[offset + 2] = position[2];
  target[offset + 3] = normal[0];
  target[offset + 4] = normal[1];
  target[offset + 5] = normal[2];
  target[offset + 6] = uv[0];
  target[offset + 7] = uv[1];
  target[offset + 8] = color[0];
  target[offset + 9] = color[1];
  target[offset + 10] = color[2];
  target[offset + 11] = material.reflectivity;
  target[offset + 12] = material.roughness;
  target[offset + 13] = material.fresnel;
  target[offset + 14] = material.envIntensity;
  return offset + 15;
}

function normalOf(a, b, c) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  return normalize([
    ab[1] * ac[2] - ab[2] * ac[1],
    ab[2] * ac[0] - ab[0] * ac[2],
    ab[0] * ac[1] - ab[1] * ac[0]
  ]);
}

function normalize(v) {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function mixColor(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t
  ];
}

function hashFloat(value) {
  const x = Math.sin(value * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function createArrayBuffer(gl, data) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buffer;
}

function createTexture(gl, pixels, width, height) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

  if (pixels) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  } else {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
  }
  gl.generateMipmap(gl.TEXTURE_2D);
  return texture;
}

function renderSky(gl, program, locations, camera, targetCanvas) {
  gl.depthMask(false);
  gl.disable(gl.DEPTH_TEST);
  gl.useProgram(program);
  gl.uniform2f(locations.resolution, targetCanvas.width, targetCanvas.height);
  gl.uniform2f(locations.cameraAngles, camera.yaw, camera.pitch);
  gl.uniform1f(locations.time, camera.time);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.enable(gl.DEPTH_TEST);
  gl.depthMask(true);
}

function renderMesh(gl, locations, mesh, time) {
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
  bindMeshAttributes(gl, locations);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, mesh.texture);
  gl.uniform1i(locations.texture, 0);
  gl.uniform1i(locations.hasTexture, mesh.hasTexture);
  const shadeEnabled = !mesh.shadeEmitter || mesh.shadeEmitter.enabled !== false;
  if (mesh.shadeTransmission && shadeEnabled) {
    const lightColor = mesh.shadeEmitter?.softLight?.sourceColor || mesh.shadeEmitter?.softLight?.color || [1, 1, 1];
    gl.uniform4f(
      locations.shadeTransmission,
      mesh.shadeTransmission.color[0],
      mesh.shadeTransmission.color[1],
      mesh.shadeTransmission.color[2],
      mesh.shadeTransmission.strength
    );
    gl.uniform3f(locations.shadeLightColor, lightColor[0], lightColor[1], lightColor[2]);
    gl.uniform1f(locations.shadeAlpha, mesh.shadeTransmission.alpha);
  } else {
    gl.uniform4f(locations.shadeTransmission, 0, 0, 0, 0);
    gl.uniform3f(locations.shadeLightColor, 1, 1, 1);
    gl.uniform1f(locations.shadeAlpha, 1);
  }
  gl.uniform4f(
    locations.instance,
    mesh.instance.x,
    animatedInstanceY(mesh.instance, time),
    mesh.instance.z,
    mesh.instance.scale
  );
  gl.uniform1f(locations.instanceYaw, mesh.instance.yaw);
  gl.uniform1f(locations.time, time);
  gl.drawArrays(gl.TRIANGLES, 0, mesh.vertexCount);
}

function renderParticles(gl, program, locations, buffer, emitters, camera, targetCanvas) {
  if (emitters.every((emitter) => emitter.enabled === false)) return;

  const data = buildParticleData(emitters, camera.time);
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
  gl.uniformMatrix4fv(locations.projection, false, perspectiveMatrix(BASE_VERTICAL_FOV, targetCanvas.width / targetCanvas.height, 0.08, 80));
  gl.uniformMatrix4fv(locations.view, false, viewMatrix(camera));
  gl.uniform1f(locations.pixelRatio, window.devicePixelRatio || 1);
  bindParticleAttributes(gl, locations);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.depthMask(false);
  gl.drawArrays(gl.POINTS, 0, data.length / PARTICLE_STRIDE);
  gl.depthMask(true);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
}

function buildParticleData(emitters, time) {
  const activeEmitters = emitters.filter((emitter) => emitter.enabled !== false);
  const total = activeEmitters.reduce((sum, emitter) => sum + (emitter.flame?.particleCount || 0) + 1, 0);
  const data = new Float32Array(total * PARTICLE_STRIDE);
  let out = 0;

  for (const emitter of activeEmitters) {
    const flame = emitter.flame;
    const softLight = emitter.softLight;
    const flicker = flickerValue(emitter, time, softLight.flicker ?? flame?.flicker ?? 0.0);
    const lightRoot = lightPosition(emitter, time, flame ? 0.006 : 0.0);
    const orb = particleOrb(emitter);
    out = writeParticle(
      data,
      out,
      lightRoot,
      0,
      softLight.glowSize * (flame ? 0.88 + flicker * 0.18 : 1.0) * orb.sizeScale,
      softLight.color,
      flame ? 0.18 + flicker * 0.12 : 0.34,
      flame ? 0 : 1,
      orb.stretch
    );

    if (!flame) {
      continue;
    }

    for (let i = 0; i < flame.particleCount; i += 1) {
      const seed = hashFloat(i * 17.13 + emitter.position[0] * 3.7 + emitter.position[2] * 5.1);
      const age = (time * flame.speed + seed) % 1;
      const swirl = time * 8.2 + seed * 20.0;
      const taper = Math.pow(1 - age, 1.55);
      const sway = Math.pow(age, 1.4);
      const radius = flame.spread * taper * sway * (0.22 + seed * 0.48);
      const particleFlicker = 0.78
        + Math.sin(time * 23.0 + seed * 12.0) * 0.14
        + Math.sin(time * 41.0 + seed * 7.0) * 0.08;
      const position = [
        lightRoot[0] + Math.cos(swirl) * radius,
        lightRoot[1] + Math.pow(age, 0.78) * flame.rise,
        lightRoot[2] + Math.sin(swirl * 0.83) * radius
      ];
      const color = mixColor(flame.colorInner, flame.colorOuter, age);
      const alpha = Math.pow(1 - age, 1.35) * particleFlicker * (0.86 + flicker * 0.22);
      const size = flame.size * (0.72 + taper * 0.46) * particleFlicker * (0.92 + flicker * 0.1);
      out = writeParticle(data, out, position, age, size, color, alpha, 0, [1, 1]);
    }
  }

  return data;
}

function particleOrb(emitter) {
  if (emitter.particleShape !== "orb") {
    return { sizeScale: 1, stretch: [1, 1] };
  }

  const ellipsoid = emitter.ellipsoid || emitter.electricLight?.ellipsoid || [1, 1, 1];
  const x = Math.max(0.05, ellipsoid[0] || 1);
  const y = Math.max(0.05, ellipsoid[1] || 1);
  const maxAxis = Math.max(x, y);
  return {
    sizeScale: maxAxis,
    stretch: [x / maxAxis, y / maxAxis]
  };
}

function flickerValue(emitter, time, amount) {
  const a = Math.sin(time * 17.0 + emitter.seed * 19.0);
  const b = Math.sin(time * 31.0 + emitter.seed * 7.0);
  const c = Math.sin(time * 47.0 + emitter.seed * 3.0);
  return Math.max(0.0, 1.0 + (a * 0.5 + b * 0.3 + c * 0.2) * amount);
}

function lightPosition(emitter, time, amount) {
  const baseY = emitter.position[1] + animatedBobOffset(emitter.instance, time);
  if (amount <= 0) {
    return [emitter.position[0], baseY, emitter.position[2]];
  }

  const swayX = Math.sin(time * 13.0 + emitter.seed * 11.0) * amount;
  const swayZ = Math.cos(time * 15.0 + emitter.seed * 17.0) * amount;
  const lift = Math.sin(time * 21.0 + emitter.seed * 5.0) * amount * 0.8;
  return [
    emitter.position[0] + swayX,
    baseY + lift,
    emitter.position[2] + swayZ
  ];
}

function animatedInstanceY(instance, time) {
  return instance.y + animatedBobOffset(instance, time);
}

function animatedBobOffset(instance, time) {
  if (instance.static) return 0;
  return (Math.sin(time * 1.1 + instance.x * 0.35) * 0.5 + 0.5) * MODEL_BOB_HEIGHT;
}

function writeParticle(target, offset, position, age, size, color, alpha, shape, stretch) {
  target[offset] = position[0];
  target[offset + 1] = position[1];
  target[offset + 2] = position[2];
  target[offset + 3] = age;
  target[offset + 4] = size;
  target[offset + 5] = color[0];
  target[offset + 6] = color[1];
  target[offset + 7] = color[2];
  target[offset + 8] = alpha;
  target[offset + 9] = shape;
  target[offset + 10] = stretch[0];
  target[offset + 11] = stretch[1];
  return offset + PARTICLE_STRIDE;
}

function bindParticleAttributes(gl, locations) {
  const stride = PARTICLE_STRIDE * 4;
  gl.enableVertexAttribArray(locations.position);
  gl.vertexAttribPointer(locations.position, 3, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(locations.age);
  gl.vertexAttribPointer(locations.age, 1, gl.FLOAT, false, stride, 3 * 4);
  gl.enableVertexAttribArray(locations.size);
  gl.vertexAttribPointer(locations.size, 1, gl.FLOAT, false, stride, 4 * 4);
  gl.enableVertexAttribArray(locations.color);
  gl.vertexAttribPointer(locations.color, 3, gl.FLOAT, false, stride, 5 * 4);
  gl.enableVertexAttribArray(locations.alpha);
  gl.vertexAttribPointer(locations.alpha, 1, gl.FLOAT, false, stride, 8 * 4);
  gl.enableVertexAttribArray(locations.shape);
  gl.vertexAttribPointer(locations.shape, 1, gl.FLOAT, false, stride, 9 * 4);
  gl.enableVertexAttribArray(locations.stretch);
  gl.vertexAttribPointer(locations.stretch, 2, gl.FLOAT, false, stride, 10 * 4);
}

function bindMeshAttributes(gl, locations) {
  const stride = 15 * 4;
  gl.enableVertexAttribArray(locations.position);
  gl.vertexAttribPointer(locations.position, 3, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(locations.normal);
  gl.vertexAttribPointer(locations.normal, 3, gl.FLOAT, false, stride, 3 * 4);
  gl.enableVertexAttribArray(locations.uv);
  gl.vertexAttribPointer(locations.uv, 2, gl.FLOAT, false, stride, 6 * 4);
  gl.enableVertexAttribArray(locations.color);
  gl.vertexAttribPointer(locations.color, 3, gl.FLOAT, false, stride, 8 * 4);
  gl.enableVertexAttribArray(locations.reflectivity);
  gl.vertexAttribPointer(locations.reflectivity, 1, gl.FLOAT, false, stride, 11 * 4);
  gl.enableVertexAttribArray(locations.roughness);
  gl.vertexAttribPointer(locations.roughness, 1, gl.FLOAT, false, stride, 12 * 4);
  gl.enableVertexAttribArray(locations.fresnel);
  gl.vertexAttribPointer(locations.fresnel, 1, gl.FLOAT, false, stride, 13 * 4);
  gl.enableVertexAttribArray(locations.envIntensity);
  gl.vertexAttribPointer(locations.envIntensity, 1, gl.FLOAT, false, stride, 14 * 4);
}

function setCameraUniforms(gl, locations, camera, targetCanvas, emitters) {
  const projection = perspectiveMatrix(
    BASE_VERTICAL_FOV,
    targetCanvas.width / targetCanvas.height,
    0.08,
    80
  );
  const view = viewMatrix(camera);
  gl.uniformMatrix4fv(locations.projection, false, projection);
  gl.uniformMatrix4fv(locations.view, false, view);
  gl.uniform3f(locations.cameraPosition, camera.x, camera.y, camera.z);

  const activeLights = emitters.filter((emitter) => emitter.enabled !== false).slice(0, MAX_EFFECT_LIGHTS);
  gl.uniform1i(locations.effectLightCount, activeLights.length);
  for (let i = 0; i < MAX_EFFECT_LIGHTS; i += 1) {
    const emitter = activeLights[i];
    if (emitter?.softLight) {
      const flicker = flickerValue(emitter, camera.time, emitter.softLight.flicker ?? 0.0);
      const position = lightPosition(emitter, camera.time, emitter.flame ? 0.007 : 0.0);
      gl.uniform3f(locations.effectLightPositions[i], position[0], position[1], position[2]);
      gl.uniform3f(locations.effectLightColors[i], ...emitter.softLight.color);
      gl.uniform2f(
        locations.effectLightParams[i],
        emitter.softLight.intensity * flicker,
        emitter.softLight.radius * (emitter.flame ? 0.92 + flicker * 0.1 : 1.0)
      );
    } else {
      gl.uniform3f(locations.effectLightPositions[i], 0, -100, 0);
      gl.uniform3f(locations.effectLightColors[i], 0, 0, 0);
      gl.uniform2f(locations.effectLightParams[i], 0, 1);
    }
  }
}

function perspectiveMatrix(fovY, aspect, near, far) {
  const f = 1 / Math.tan(fovY / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0
  ]);
}

function viewMatrix(camera) {
  const sinY = Math.sin(camera.yaw);
  const cosY = Math.cos(camera.yaw);
  const sinP = Math.sin(camera.pitch);
  const cosP = Math.cos(camera.pitch);
  const row0 = [cosY, 0, -sinY];
  const row1 = [sinP * sinY, cosP, sinP * cosY];
  const row2 = [-cosP * sinY, sinP, -cosP * cosY];
  const eye = [camera.x, camera.y, camera.z];

  return new Float32Array([
    row0[0], row1[0], row2[0], 0,
    row0[1], row1[1], row2[1], 0,
    row0[2], row1[2], row2[2], 0,
    -dot(row0, eye), -dot(row1, eye), -dot(row2, eye), 1
  ]);
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function resizeCanvasToDisplaySize(targetCanvas) {
  const width = Math.max(1, Math.floor(targetCanvas.clientWidth * window.devicePixelRatio));
  const height = Math.max(1, Math.floor(targetCanvas.clientHeight * window.devicePixelRatio));
  if (targetCanvas.width !== width || targetCanvas.height !== height) {
    targetCanvas.width = width;
    targetCanvas.height = height;
  }
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || "WebGL program link failed");
  }
  return program;
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || "WebGL shader compile failed");
  }
  return shader;
}

function meshProgramLocations(gl, program) {
  const locations = {
    position: gl.getAttribLocation(program, "a_position"),
    normal: gl.getAttribLocation(program, "a_normal"),
    uv: gl.getAttribLocation(program, "a_uv"),
    color: gl.getAttribLocation(program, "a_color"),
    reflectivity: gl.getAttribLocation(program, "a_reflectivity"),
    roughness: gl.getAttribLocation(program, "a_roughness"),
    fresnel: gl.getAttribLocation(program, "a_fresnel"),
    envIntensity: gl.getAttribLocation(program, "a_env_intensity"),
    projection: gl.getUniformLocation(program, "u_projection"),
    view: gl.getUniformLocation(program, "u_view"),
    cameraPosition: gl.getUniformLocation(program, "u_camera_position"),
    instance: gl.getUniformLocation(program, "u_instance"),
    instanceYaw: gl.getUniformLocation(program, "u_instance_yaw"),
    texture: gl.getUniformLocation(program, "u_texture"),
    hasTexture: gl.getUniformLocation(program, "u_has_texture"),
    time: gl.getUniformLocation(program, "u_time"),
    shadeTransmission: gl.getUniformLocation(program, "u_shade_transmission"),
    shadeLightColor: gl.getUniformLocation(program, "u_shade_light_color"),
    shadeAlpha: gl.getUniformLocation(program, "u_shade_alpha"),
    effectLightCount: gl.getUniformLocation(program, "u_effect_light_count"),
    effectLightPositions: [],
    effectLightColors: [],
    effectLightParams: []
  };

  for (let i = 0; i < MAX_EFFECT_LIGHTS; i += 1) {
    locations.effectLightPositions.push(gl.getUniformLocation(program, `u_effect_light_positions[${i}]`));
    locations.effectLightColors.push(gl.getUniformLocation(program, `u_effect_light_colors[${i}]`));
    locations.effectLightParams.push(gl.getUniformLocation(program, `u_effect_light_params[${i}]`));
  }

  return locations;
}

function skyProgramLocations(gl, program) {
  return {
    resolution: gl.getUniformLocation(program, "u_resolution"),
    cameraAngles: gl.getUniformLocation(program, "u_camera_angles"),
    time: gl.getUniformLocation(program, "u_time")
  };
}

function particleProgramLocations(gl, program) {
  return {
    position: gl.getAttribLocation(program, "a_position"),
    age: gl.getAttribLocation(program, "a_age"),
    size: gl.getAttribLocation(program, "a_size"),
    color: gl.getAttribLocation(program, "a_color"),
    alpha: gl.getAttribLocation(program, "a_alpha"),
    shape: gl.getAttribLocation(program, "a_shape"),
    stretch: gl.getAttribLocation(program, "a_stretch"),
    projection: gl.getUniformLocation(program, "u_projection"),
    view: gl.getUniformLocation(program, "u_view"),
    pixelRatio: gl.getUniformLocation(program, "u_pixel_ratio")
  };
}

const SKY_VERTEX_SHADER = `#version 300 es
const vec2 POSITIONS[3] = vec2[3](
  vec2(-1.0, -1.0),
  vec2(3.0, -1.0),
  vec2(-1.0, 3.0)
);

void main() {
  gl_Position = vec4(POSITIONS[gl_VertexID], 0.0, 1.0);
}
`;

const SKY_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_camera_angles;
uniform float u_time;
out vec4 out_color;

vec3 sunDirection(float time) {
  return normalize(vec3(-0.48 + sin(time * 0.07) * 0.08, 0.78, -0.42));
}

vec3 cameraRayToWorld(vec3 ray, vec2 angles) {
  float sy = sin(angles.x);
  float cy = cos(angles.x);
  float sp = sin(angles.y);
  float cp = cos(angles.y);
  float y = cp * ray.y - sp * ray.z;
  float z = sp * ray.y + cp * ray.z;
  return normalize(vec3(cy * ray.x + sy * z, y, -sy * ray.x + cy * z));
}

vec3 skyColor(vec3 direction, float time) {
  float horizon = clamp(direction.y * 0.5 + 0.5, 0.0, 1.0);
  float sunDot = max(dot(direction, sunDirection(time)), 0.0);
  float sun2 = sunDot * sunDot;
  float sun4 = sun2 * sun2;
  float sun8 = sun4 * sun4;
  float sunGlow = sun8 * sun4 * sun2;
  float sunCore = sun8 * sun8 * sun8 * sun8;
  float cloud = clamp(sin(direction.x * 7.5 + time * 0.035) * cos(direction.z * 5.2 - time * 0.025) * 0.5 + 0.5, 0.0, 1.0);
  cloud = cloud * cloud * cloud * clamp(1.0 - horizon, 0.0, 1.0) * 0.22;
  vec3 base = mix(vec3(0.071, 0.173, 0.322), vec3(0.027, 0.059, 0.133), horizon);
  return base + vec3(0.282, 0.212, 0.11) * sunGlow + vec3(0.706, 0.588, 0.361) * sunCore + vec3(0.149, 0.165, 0.188) * cloud;
}

void main() {
  float aspect = u_resolution.x / u_resolution.y;
  vec2 ndc = (gl_FragCoord.xy / u_resolution) * 2.0 - 1.0;
  float tanHalfFov = ${Math.tan(BASE_VERTICAL_FOV * 0.5).toFixed(8)};
  vec3 ray = normalize(vec3(ndc.x * aspect * tanHalfFov, ndc.y * tanHalfFov, 1.0));
  vec3 worldRay = cameraRayToWorld(ray, u_camera_angles);
  out_color = vec4(skyColor(worldRay, u_time), 1.0);
}
`;

const MESH_VERTEX_SHADER = `#version 300 es
precision highp float;

in vec3 a_position;
in vec3 a_normal;
in vec2 a_uv;
in vec3 a_color;
in float a_reflectivity;
in float a_roughness;
in float a_fresnel;
in float a_env_intensity;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform vec4 u_instance;
uniform float u_instance_yaw;
uniform float u_time;

out vec3 v_world_position;
out vec3 v_normal;
out vec2 v_uv;
out vec3 v_color;
out float v_reflectivity;
out float v_roughness;
out float v_fresnel;
out float v_env_intensity;

vec3 rotateY(vec3 point, float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return vec3(point.x * c + point.z * s, point.y, -point.x * s + point.z * c);
}

void main() {
  vec3 world = rotateY(a_position * u_instance.w, u_instance_yaw) + u_instance.xyz;
  vec3 normal = normalize(rotateY(a_normal, u_instance_yaw));
  v_world_position = world;
  v_normal = normal;
  v_uv = a_uv;
  v_color = a_color;
  v_reflectivity = a_reflectivity;
  v_roughness = a_roughness;
  v_fresnel = a_fresnel;
  v_env_intensity = a_env_intensity;
  gl_Position = u_projection * u_view * vec4(world, 1.0);
}
`;

const MESH_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform bool u_has_texture;
uniform vec3 u_camera_position;
uniform vec4 u_shade_transmission;
uniform vec3 u_shade_light_color;
uniform float u_shade_alpha;
uniform int u_effect_light_count;
uniform vec3 u_effect_light_positions[${MAX_EFFECT_LIGHTS}];
uniform vec3 u_effect_light_colors[${MAX_EFFECT_LIGHTS}];
uniform vec2 u_effect_light_params[${MAX_EFFECT_LIGHTS}];
uniform float u_time;

in vec3 v_world_position;
in vec3 v_normal;
in vec2 v_uv;
in vec3 v_color;
in float v_reflectivity;
in float v_roughness;
in float v_fresnel;
in float v_env_intensity;

out vec4 out_color;

vec3 sunDirection(float time) {
  return normalize(vec3(-0.48 + sin(time * 0.07) * 0.08, 0.78, -0.42));
}

vec3 skyColor(vec3 direction, float time) {
  float horizon = clamp(direction.y * 0.5 + 0.5, 0.0, 1.0);
  float sunDot = max(dot(direction, sunDirection(time)), 0.0);
  float sun2 = sunDot * sunDot;
  float sun4 = sun2 * sun2;
  float sun8 = sun4 * sun4;
  float sunGlow = sun8 * sun4 * sun2;
  float sunCore = sun8 * sun8 * sun8 * sun8;
  vec3 base = mix(vec3(0.071, 0.173, 0.322), vec3(0.027, 0.059, 0.133), horizon);
  return base + vec3(0.282, 0.212, 0.11) * sunGlow + vec3(0.706, 0.588, 0.361) * sunCore;
}

vec3 environmentReflection(vec3 reflected, vec3 normal, float roughness, float time) {
  vec3 sharp = skyColor(reflected, time);
  vec3 broad = (
    skyColor(normalize(mix(reflected, normal, 0.35)), time) +
    skyColor(normalize(reflected + vec3(0.18, 0.08, 0.0)), time) +
    skyColor(normalize(reflected + vec3(-0.16, 0.05, 0.11)), time)
  ) / 3.0;
  return mix(sharp, broad, clamp(roughness, 0.0, 1.0));
}

vec3 transmittedShadeColor(vec3 lightColor, vec3 shadeColor, float strength) {
  vec3 filtered = lightColor * shadeColor;
  float lightEnergy = max(max(lightColor.r, lightColor.g), lightColor.b);
  vec3 scatter = shadeColor * lightEnergy * 0.42;
  return mix(lightColor, filtered + scatter, clamp(strength, 0.0, 1.0));
}

void main() {
  vec3 normal = normalize(gl_FrontFacing ? v_normal : -v_normal);
  vec3 viewDir = normalize(u_camera_position - v_world_position);
  vec3 sun = sunDirection(u_time);
  vec3 base = v_color;
  if (u_has_texture) {
    base *= texture(u_texture, vec2(v_uv.x, 1.0 - v_uv.y)).rgb;
  }

  vec3 pointPos = vec3(sin(u_time * 0.8) * 5.0, 3.2, 4.5 + cos(u_time * 0.55) * 2.2);
  vec3 toPoint = pointPos - v_world_position;
  float pointLight = max(dot(normal, normalize(toPoint)), 0.0) * min(8.5 / max(dot(toPoint, toPoint), 0.001), 1.0);
  vec3 effectLight = vec3(0.0);
  for (int i = 0; i < ${MAX_EFFECT_LIGHTS}; i++) {
    if (i >= u_effect_light_count) {
      break;
    }
    vec3 toEffect = u_effect_light_positions[i] - v_world_position;
    float effectDistance = length(toEffect);
    float radius = max(u_effect_light_params[i].y, 0.001);
    float falloff = pow(clamp(1.0 - effectDistance / radius, 0.0, 1.0), 3.25);
    float wrap = max(dot(normal, normalize(toEffect)) * 0.72 + 0.28, 0.0);
    effectLight += u_effect_light_colors[i] * wrap * falloff * u_effect_light_params[i].x;
  }
  float diffuse = max(dot(normal, sun), 0.0);
  float skyBounce = max(normal.y, 0.0);
  vec3 halfDir = normalize(sun + viewDir);
  float roughness = clamp(v_roughness, 0.04, 1.0);
  float specBase = max(dot(normal, halfDir), 0.0);
  float spec2 = specBase * specBase;
  float spec4 = spec2 * spec2;
  float spec8 = spec4 * spec4;
  float specular = spec8 * spec8 * spec4 * (1.0 - roughness * 0.72);
  float rim = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.0);
  float shade = 0.34 + diffuse * 0.48 + skyBounce * 0.1 + pointLight * 0.24;
  vec3 reflected = reflect(normalize(v_world_position - u_camera_position), normal);
  float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 5.0);
  float reflectionStrength = clamp(v_reflectivity + fresnel * v_fresnel, 0.0, 0.92);
  vec3 env = environmentReflection(reflected, normal, roughness, u_time) * v_env_intensity;
  vec3 lit = mix(base * shade, env, reflectionStrength);
  lit += effectLight * 0.48;
  lit += specular * mix(0.2, 0.62, 1.0 - roughness) + rim * reflectionStrength * 0.12;
  vec3 shadeGlow = transmittedShadeColor(
    u_shade_light_color,
    u_shade_transmission.rgb,
    u_shade_transmission.a
  );
  lit = mix(lit, shadeGlow, u_shade_transmission.a);

  float fog = clamp((distance(u_camera_position, v_world_position) - 9.0) / 36.0, 0.0, 1.0);
  lit = mix(lit, vec3(0.031, 0.051, 0.098), fog);
  out_color = vec4(lit, u_shade_alpha);
}
`;

const PARTICLE_VERTEX_SHADER = `#version 300 es
precision highp float;

in vec3 a_position;
in float a_age;
in float a_size;
in vec3 a_color;
in float a_alpha;
in float a_shape;
in vec2 a_stretch;

uniform mat4 u_projection;
uniform mat4 u_view;
uniform float u_pixel_ratio;

out float v_age;
out vec3 v_color;
out float v_alpha;
out float v_shape;
out vec2 v_stretch;

void main() {
  vec4 viewPosition = u_view * vec4(a_position, 1.0);
  gl_Position = u_projection * viewPosition;
  gl_PointSize = a_size * u_pixel_ratio / max(-viewPosition.z, 0.35);
  v_age = a_age;
  v_color = a_color;
  v_alpha = a_alpha;
  v_shape = a_shape;
  v_stretch = a_stretch;
}
`;

const PARTICLE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in float v_age;
in vec3 v_color;
in float v_alpha;
in float v_shape;
in vec2 v_stretch;

out vec4 out_color;

void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  if (v_shape > 0.5) {
    vec2 safeStretch = max(v_stretch, vec2(0.05));
    vec2 orbUv = uv / safeStretch;
    float dist = length(orbUv);
    float shell = smoothstep(1.0, 0.0, dist);
    float core = smoothstep(0.72, 0.0, dist);
    float rim = smoothstep(0.62, 1.0, dist) * smoothstep(1.0, 0.82, dist);
    float highlight = smoothstep(0.38, 0.0, length(orbUv - vec2(-0.23, 0.28)));
    float alpha = (shell * 0.42 + core * 0.46 + rim * 0.16) * v_alpha;
    if (alpha < 0.01) discard;
    vec3 color = mix(v_color, vec3(1.0), highlight * 0.28 + core * 0.18);
    out_color = vec4(color, alpha);
    return;
  }

  float y01 = clamp((uv.y + 1.0) * 0.5, 0.0, 1.0);
  float width = mix(0.58, 0.1, y01);
  float body = smoothstep(width, 0.0, abs(uv.x)) * smoothstep(-1.0, -0.22, uv.y) * smoothstep(0.86, -0.02, uv.y);
  float tip = smoothstep(0.2, 0.0, abs(uv.x)) * smoothstep(0.0, 0.62, uv.y) * smoothstep(0.9, 0.48, uv.y);
  float core = smoothstep(0.24, 0.0, abs(uv.x)) * smoothstep(-0.72, -0.24, uv.y) * smoothstep(0.58, -0.02, uv.y);
  float ember = smoothstep(0.9, 0.0, length(vec2(uv.x * 0.75, uv.y + 0.34))) * (1.0 - y01) * 0.2;
  float alpha = (body * 0.9 + tip * 0.75 + ember) * v_alpha;
  if (alpha < 0.015) discard;
  vec3 hot = vec3(1.0, 0.94, 0.58);
  vec3 color = mix(v_color, hot, core * (1.0 - v_age * 0.45));
  out_color = vec4(color, alpha);
}
`;

boot().catch((error) => {
  console.error(error);
  messageEl.classList.remove("hidden");
  messageEl.querySelector("h2").textContent = "启动失败";
  messageEl.querySelector("p").textContent = error.message;
});
