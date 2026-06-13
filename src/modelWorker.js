const DEFAULT_TEXTURE_SIZE = 128;

self.addEventListener("message", async (event) => {
  if (event.data?.type !== "load") return;

  const textureSize = event.data.textureSize || DEFAULT_TEXTURE_SIZE;
  const resources = new Map(
    (event.data.resources || []).map((resource) => [resource.fileName, resource.buffer])
  );
  const results = await Promise.allSettled(
    event.data.files.map(async (fileName) => {
      const buffer = resources.get(fileName);
      if (!buffer) throw new Error(`Missing resource ${fileName}`);
      return parseGlbToStandardBuffer(buffer, fileName, textureSize);
    })
  );

  const models = [];
  const transfers = [];
  let skipped = 0;

  for (let i = 0; i < results.length; i += 1) {
    const result = results[i];
    if (result.status === "rejected") {
      skipped += 1;
      self.postMessage({
        type: "warning",
        message: `Skipping ${event.data.files[i]}: ${result.reason?.message || result.reason}`
      });
      continue;
    }

    const model = result.value;
    models.push(model);
    transfers.push(model.positions.buffer, model.uvs.buffer, model.colors.buffer);
    if (model.texturePixels) transfers.push(model.texturePixels.buffer);
  }

  self.postMessage(
    {
      type: "complete",
      parsed: models.length,
      skipped,
      models
    },
    transfers
  );
});

async function parseGlbToStandardBuffer(buffer, fileName, textureSize) {
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x46546c67) {
    throw new Error("Invalid GLB magic");
  }

  const jsonLength = view.getUint32(12, true);
  const jsonType = view.getUint32(16, true);
  if (jsonType !== 0x4e4f534a) {
    throw new Error("Missing JSON chunk");
  }

  const jsonText = new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength));
  const gltf = JSON.parse(jsonText);
  const binHeader = 20 + align4(jsonLength);
  const binLength = view.getUint32(binHeader, true);
  const binOffset = binHeader + 8;
  const bin = buffer.slice(binOffset, binOffset + binLength);
  const triangles = [];
  const positionsForBounds = [];
  const textureCache = new Map();

  for (const mesh of gltf.meshes || []) {
    for (const primitive of mesh.primitives || []) {
      if (primitive.mode !== undefined && primitive.mode !== 4) continue;
      if (primitive.attributes?.POSITION === undefined) continue;

      const positions = readVec3Accessor(gltf, bin, primitive.attributes.POSITION);
      const texcoords = primitive.attributes.TEXCOORD_0 === undefined
        ? null
        : readVec2Accessor(gltf, bin, primitive.attributes.TEXCOORD_0);
      const indices = primitive.indices === undefined
        ? Array.from({ length: positions.length }, (_, index) => index)
        : readIndexAccessor(gltf, bin, primitive.indices);
      const material = await materialInfo(gltf, bin, primitive.material, fileName, textureCache, textureSize);

      for (let i = 0; i + 2 < indices.length; i += 3) {
        const ia = indices[i];
        const ib = indices[i + 1];
        const ic = indices[i + 2];
        positionsForBounds.push(positions[ia], positions[ib], positions[ic]);
        triangles.push({
          points: [positions[ia], positions[ib], positions[ic]],
          uvs: [
            texcoords?.[ia] || [0, 0],
            texcoords?.[ib] || [0, 0],
            texcoords?.[ic] || [0, 0]
          ],
          color: material.color,
          texture: material.texture
        });
      }
    }
  }

  if (triangles.length === 0 || positionsForBounds.length === 0) {
    throw new Error("No triangle mesh found");
  }

  const bounds = boundsOf(positionsForBounds);
  const size = [
    bounds.max[0] - bounds.min[0],
    bounds.max[1] - bounds.min[1],
    bounds.max[2] - bounds.min[2]
  ];
  const maxSize = Math.max(size[0], size[1], size[2], 0.001);
  const normalizeScale = 1 / maxSize;
  const centerX = (bounds.min[0] + bounds.max[0]) * 0.5;
  const centerZ = (bounds.min[2] + bounds.max[2]) * 0.5;
  const positions = new Float32Array(triangles.length * 9);
  const uvs = new Float32Array(triangles.length * 6);
  const colors = new Uint8Array(triangles.length * 3);
  const texture = triangles.find((triangle) => triangle.texture)?.texture || null;

  for (let i = 0; i < triangles.length; i += 1) {
    const triangle = triangles[i];
    const p = i * 9;
    const uv = i * 6;
    const c = i * 3;

    for (let pointIndex = 0; pointIndex < 3; pointIndex += 1) {
      const point = triangle.points[pointIndex];
      positions[p + pointIndex * 3] = (point[0] - centerX) * normalizeScale;
      positions[p + pointIndex * 3 + 1] = (point[1] - bounds.min[1]) * normalizeScale;
      positions[p + pointIndex * 3 + 2] = (point[2] - centerZ) * normalizeScale;
      uvs[uv + pointIndex * 2] = triangle.uvs[pointIndex][0];
      uvs[uv + pointIndex * 2 + 1] = triangle.uvs[pointIndex][1];
    }

    colors[c] = triangle.color[0];
    colors[c + 1] = triangle.color[1];
    colors[c + 2] = triangle.color[2];
  }

  return {
    fileName,
    triangleCount: triangles.length,
    positions,
    uvs,
    colors,
    hasTexture: Boolean(texture),
    textureWidth: texture?.width || 0,
    textureHeight: texture?.height || 0,
    texturePixels: texture?.pixels || null
  };
}

function readVec3Accessor(gltf, bin, accessorIndex) {
  const accessor = gltf.accessors[accessorIndex];
  const bufferView = gltf.bufferViews[accessor.bufferView];
  const stride = bufferView.byteStride || 12;
  const offset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
  const view = new DataView(bin, offset);
  const values = [];

  for (let i = 0; i < accessor.count; i += 1) {
    const base = i * stride;
    values.push([
      view.getFloat32(base, true),
      view.getFloat32(base + 4, true),
      view.getFloat32(base + 8, true)
    ]);
  }

  return values;
}

function readVec2Accessor(gltf, bin, accessorIndex) {
  const accessor = gltf.accessors[accessorIndex];
  const bufferView = gltf.bufferViews[accessor.bufferView];
  const stride = bufferView.byteStride || componentByteSize(accessor.componentType) * 2;
  const offset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
  const view = new DataView(bin, offset);
  const values = [];

  for (let i = 0; i < accessor.count; i += 1) {
    const base = i * stride;
    values.push([
      readAccessorComponent(view, base, accessor.componentType, true),
      readAccessorComponent(view, base + componentByteSize(accessor.componentType), accessor.componentType, true)
    ]);
  }

  return values;
}

function readIndexAccessor(gltf, bin, accessorIndex) {
  const accessor = gltf.accessors[accessorIndex];
  const bufferView = gltf.bufferViews[accessor.bufferView];
  const componentSize = accessor.componentType === 5125 ? 4 : accessor.componentType === 5123 ? 2 : 1;
  const stride = bufferView.byteStride || componentSize;
  const offset = (bufferView.byteOffset || 0) + (accessor.byteOffset || 0);
  const view = new DataView(bin, offset);
  const indices = [];

  for (let i = 0; i < accessor.count; i += 1) {
    const base = i * stride;
    if (accessor.componentType === 5125) {
      indices.push(view.getUint32(base, true));
    } else if (accessor.componentType === 5123) {
      indices.push(view.getUint16(base, true));
    } else {
      indices.push(view.getUint8(base));
    }
  }

  return indices;
}

async function materialInfo(gltf, bin, materialIndex, fileName, textureCache, textureSize) {
  const material = gltf.materials?.[materialIndex];
  const factor = material?.pbrMetallicRoughness?.baseColorFactor;
  const textureIndex = material?.pbrMetallicRoughness?.baseColorTexture?.index;
  const texture = textureIndex === undefined
    ? null
    : await decodeBaseColorTexture(gltf, bin, textureIndex, textureCache, textureSize);

  if (factor) {
    return {
      color: factor.slice(0, 3).map((value) => Math.round(value * 255)),
      texture
    };
  }

  const hash = hashString(fileName);
  return {
    color: [
      90 + (hash % 120),
      110 + ((hash >> 8) % 110),
      130 + ((hash >> 16) % 100)
    ],
    texture
  };
}

async function decodeBaseColorTexture(gltf, bin, textureIndex, textureCache, textureSize) {
  if (textureCache.has(textureIndex)) return textureCache.get(textureIndex);

  const texture = gltf.textures?.[textureIndex];
  const image = gltf.images?.[texture?.source];
  if (image?.bufferView === undefined) return null;
  if (typeof createImageBitmap !== "function" || typeof OffscreenCanvas === "undefined") return null;

  const bufferView = gltf.bufferViews[image.bufferView];
  const offset = bufferView.byteOffset || 0;
  const bytes = bin.slice(offset, offset + bufferView.byteLength);
  const blob = new Blob([bytes], { type: image.mimeType || "image/png" });
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(textureSize, textureSize);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.clearRect(0, 0, textureSize, textureSize);
  context.drawImage(bitmap, 0, 0, textureSize, textureSize);
  const pixels = new Uint8Array(context.getImageData(0, 0, textureSize, textureSize).data.buffer.slice(0));
  const decoded = { width: textureSize, height: textureSize, pixels };
  textureCache.set(textureIndex, decoded);
  return decoded;
}

function readAccessorComponent(view, offset, componentType, normalized) {
  if (componentType === 5126) return view.getFloat32(offset, true);
  if (componentType === 5123) {
    const value = view.getUint16(offset, true);
    return normalized ? value / 65535 : value;
  }
  if (componentType === 5121) {
    const value = view.getUint8(offset);
    return normalized ? value / 255 : value;
  }
  return 0;
}

function componentByteSize(componentType) {
  if (componentType === 5126) return 4;
  if (componentType === 5123) return 2;
  return 1;
}

function boundsOf(points) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const point of points) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], point[axis]);
      max[axis] = Math.max(max[axis], point[axis]);
    }
  }
  return { min, max };
}

function align4(value) {
  return (value + 3) & ~3;
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
