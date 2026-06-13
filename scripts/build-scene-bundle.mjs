import { deflateRawSync } from "node:zlib";
import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sceneFile = join(root, "src", "scenePackage", "defaultScene.js");
const resourcesDir = join(root, "src", "scenePackage", "resources");
const outputFile = join(root, "src", "scenePackage", "defaultScene.bundle");

const sceneSource = await readFile(sceneFile, "utf8");
const resources = readResourceList(sceneSource);
const chunks = [Buffer.from("NGB1")];
const count = Buffer.alloc(4);
count.writeUInt32LE(resources.length, 0);
chunks.push(count);

let originalBytes = 0;
let compressedBytes = 0;

for (const fileName of resources) {
  const safeName = safeResourceFileName(fileName);
  const source = await readFile(join(resourcesDir, safeName));
  const compressed = deflateRawSync(source, { level: 9 });
  const name = Buffer.from(fileName, "utf8");
  const header = Buffer.alloc(16);
  header.writeUInt16LE(name.length, 0);
  header.writeUInt8(1, 2);
  header.writeUInt8(0, 3);
  header.writeUInt32LE(source.length, 4);
  header.writeUInt32LE(compressed.length, 8);
  header.writeUInt32LE(crc32(source), 12);
  chunks.push(header, name, compressed);
  originalBytes += source.length;
  compressedBytes += compressed.length;
}

await writeFile(outputFile, Buffer.concat(chunks));
console.log(
  `Scene bundle -> src/scenePackage/defaultScene.bundle (${resources.length} files, ${formatBytes(originalBytes)} -> ${formatBytes(compressedBytes)})`
);

function readResourceList(source) {
  const match = source.match(/resources:\s*\[([\s\S]*?)\]/);
  if (!match) throw new Error("Could not find DEFAULT_SCENE.resources");
  const names = [...match[1].matchAll(/"([^"]+\.glb)"/g)].map((entry) => entry[1]);
  if (names.length === 0) throw new Error("DEFAULT_SCENE.resources is empty");
  return names;
}

function safeResourceFileName(fileName) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
