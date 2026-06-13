import { defineConfig } from "vite";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { watch } from "node:fs";

const projectRoot = process.cwd();
const isGitHubPagesBuild = process.env.GITHUB_PAGES === "1";

export default defineConfig({
  base: isGitHubPagesBuild ? "/3d_engine/" : "/",
  publicDir: "public",
  assetsInclude: ["**/*.bundle"],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp"
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  },
  plugins: [sceneBundleHotReload(), rustWasmHotReload()]
});

function sceneBundleHotReload() {
  let server;
  let buildTimer;
  let building = false;
  let pending = false;

  return {
    name: "scene-bundle-hot-reload",
    configureServer(devServer) {
      server = devServer;
      const watchers = [
        watch(resolve(projectRoot, "src/scenePackage/defaultScene.js"), scheduleRebuild),
        watch(resolve(projectRoot, "src/scenePackage/resources"), { recursive: true }, scheduleRebuild)
      ];
      server.httpServer?.once("close", () => {
        for (const watcher of watchers) watcher.close();
      });
    }
  };

  function scheduleRebuild(_eventType, fileName = "") {
    if (fileName && !isSceneBundleFile(fileName)) return;
    clearTimeout(buildTimer);
    buildTimer = setTimeout(() => rebuildBundle(), 120);
  }

  async function rebuildBundle() {
    if (building) {
      pending = true;
      return;
    }

    building = true;
    pending = false;
    server.config.logger.info("Scene resources changed, rebuilding defaultScene.bundle...");

    try {
      await run("npm", ["run", "build:bundle"]);
      server.ws.send({
        type: "full-reload",
        path: "*"
      });
      server.config.logger.info("defaultScene.bundle rebuilt; browser reloaded.");
    } catch (error) {
      server.config.logger.error(`defaultScene.bundle rebuild failed: ${error.message}`);
    } finally {
      building = false;
      if (pending) rebuildBundle();
    }
  }
}

function rustWasmHotReload() {
  let server;
  let buildTimer;
  let building = false;
  let pending = false;

  return {
    name: "rust-wasm-hot-reload",
    configureServer(devServer) {
      server = devServer;
      const watchers = [
        watch(resolve(projectRoot, "Cargo.toml"), scheduleRebuild),
        watch(resolve(projectRoot, "Cargo.lock"), scheduleRebuild),
        watch(resolve(projectRoot, "engine/Cargo.toml"), scheduleRebuild),
        watch(resolve(projectRoot, "engine/src"), { recursive: true }, scheduleRebuild)
      ];
      server.httpServer?.once("close", () => {
        for (const watcher of watchers) watcher.close();
      });
    }
  };

  function scheduleRebuild(_eventType, fileName = "") {
    if (fileName && !isRustPipelineFile(fileName)) return;
    clearTimeout(buildTimer);
    buildTimer = setTimeout(() => rebuildWasm(), 120);
  }

  async function rebuildWasm() {
    if (building) {
      pending = true;
      return;
    }

    building = true;
    pending = false;
    server.config.logger.info("Rust changed, rebuilding engine.wasm...");

    try {
      await run("npm", ["run", "build:wasm:dev"]);
      server.ws.send({
        type: "full-reload",
        path: "*"
      });
      server.config.logger.info("engine.wasm rebuilt; browser reloaded.");
    } catch (error) {
      server.config.logger.error(`engine.wasm rebuild failed: ${error.message}`);
    } finally {
      building = false;
      if (pending) rebuildWasm();
    }
  }
}

function isRustPipelineFile(file) {
  return /(?:^|[/\\])(?:Cargo\.toml|Cargo\.lock)$/.test(file)
    || /(?:^|[/\\])?.+\.rs$/.test(file);
}

function isSceneBundleFile(file) {
  return /(?:^|[/\\])defaultScene\.js$/.test(file)
    || /(?:^|[/\\]).+\.glb$/.test(file);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
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
