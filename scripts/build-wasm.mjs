import { copyFile, mkdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const release = process.argv.includes("--release");
const profile = release ? "release" : "debug";
const cargoArgs = ["build", "--target", "wasm32-unknown-unknown"];
if (release) cargoArgs.push("--release");

await run("cargo", cargoArgs);

await copyWasm("game_engine.wasm", "engine.wasm", profile);
await copyWasm("resource_bundle_loader.wasm", "bundle_loader.wasm", profile);

async function copyWasm(sourceName, outputName, profile) {
  const source = join(
    root,
    "target",
    "wasm32-unknown-unknown",
    profile,
    sourceName
  );
  const output = join(root, "public", "wasm", outputName);

  await mkdir(dirname(output), { recursive: true });
  await copyFile(source, output);

  const size = await stat(output);
  console.log(`WASM ${profile} build -> public/wasm/${outputName} (${formatBytes(size.size)})`);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: "inherit"
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
      }
    });
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
