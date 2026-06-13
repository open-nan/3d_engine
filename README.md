# Rust 3D Engine

一个 JS UI + Rust/WASM 引擎核心的浏览器项目。Rust 端负责相机、输入状态和物理/粒子 ID 等引擎逻辑，JS/WebGL 端负责主渲染管线、场景包加载和 UI。

## 运行

```bash
npm run dev
```

打开 `http://127.0.0.1:5173`。

`npm run dev` 使用 Vite 开发服务，并集成 Rust/WASM 热更新管线：

- 修改 `engine/src/**/*.rs`、`Cargo.toml` 或 `Cargo.lock` 时，会自动执行 `npm run build:wasm:dev`。
- 构建产物会复制到 `public/wasm/engine.wasm`。
- 构建成功后 Vite 会触发浏览器整页刷新，让新的 WASM 生效。
- 修改 `src/scenePackage/resources/*.glb` 或默认场景资源列表时，会自动执行 `npm run build:bundle`，生成新的 `defaultScene.bundle` 并刷新页面。

生产构建：

```bash
npm run build
```

这会先执行 `npm run build:bundle`，再执行 release profile 的 `npm run build:wasm`，最后执行 `vite build`。

发布 GitHub Pages：

```bash
npm run deploy:pages
```

Pages 构建会使用 `/3d_engine/` 作为 Vite base，并把 `dist/` 推送到 `gh-pages` 分支。

## 架构

- `vite.config.js`: Vite 开发服务和 Rust/WASM 热更新插件。
- `scripts/build-wasm.mjs`: Rust/WASM 构建和复制脚本。
- `scripts/build-scene-bundle.mjs`: 场景资源压缩器，把 `.glb` 资源用 DEFLATE 压成 `.bundle`。
- `src/main.js`: 浏览器 UI、输入、HUD、WebGL 主渲染管线。
- `src/resourceBundle/`: 浏览器端资源包加载器，使用 `bundle_loader.wasm` 在 worker 中解压 `.bundle`。
- `src/modelWorker.js`: 后台解析 GLB，将模型转成标准 typed buffer。
- `src/scenePackage/`: 默认场景包，包含场景配置、场景入口、源模型资源和生成的 `defaultScene.bundle`。
- `engine/src/lib.rs`: Rust 引擎、相机运动、输入状态和物理接口。
- `public/wasm/engine.wasm`: 构建产物，由 `npm run build:wasm` 生成。
- `public/wasm/bundle_loader.wasm`: 资源包解压 WASM，由 `npm run build:wasm` 生成。

## 详细文档

- [渲染引擎使用文档](docs/render-engine.md)
- [资源解压引擎使用文档](docs/resource-bundle-engine.md)

## 资源包

默认场景通过统一资源包结构加载：

- `resourceBundle.id`: 场景资源包 ID。
- `resourceBundle.version`: 资源包版本号。
- `resourceBundle.format`: 当前为 `ngb-deflate-v1`。
- `resourceBundle.url`: Vite 编译后的 `.bundle` URL。

`.bundle` 文件使用 `NGB1` 容器头和逐文件 DEFLATE raw 压缩。浏览器中 `src/resourceBundle/bundleWorker.js` 会加载 `public/wasm/bundle_loader.wasm`，解出统一资源数组：

- `fileName`: 场景使用的稳定资源 ID，例如 `Candlestick.glb`。
- `buffer`: 解压后的 GLB `ArrayBuffer`。
- `byteLength`: 解压后的字节数。

后续扩展包只要提供同样的 `resourceBundle` 描述和解压后的资源结构，就可以接入现有场景加载和模型解析管线。

## 统一渲染模型接口

模型解析运行在 Web Worker 中。Worker 会把 `.glb` 转成主线程渲染管线接受的标准 buffer；这些 buffer 的契约定义在 `src/pipelineTypes.ts`：

- `positions`: `Float32Array`，每个三角形 9 个 float。
- `uvs`: `Float32Array`，每个三角形 6 个 float。
- `colors`: `Uint8Array`，每个三角形 3 个 byte。
- `texturePixels`: 可选 `Uint8Array`，固定 `128x128 RGBA`。
- `triangleCount`: 三角形数量。

主线程不做 GLB 解析，只接收这些标准 buffer，并在 WebGL2 渲染管线中生成 GPU vertex buffer 和 texture。Rust/WASM 当前负责相机、输入、物理点击检测和粒子效果 ID 表；旧的软件光栅化接口仍保留在 Rust 侧，但主画面不再通过它上传模型。

当前模型导入模式：

- GLB 导入直接使用 mesh primitive 的原始 `POSITION / TEXCOORD_0 / indices` 数据。
- 暂时不应用 node 层级的 `matrix` 或 `translation / rotation / scale`。
- 暂时不做模型三角形抽样、实例视野裁剪或距离 LOD。
- 暂时不做 near-plane 顶点裁切；任意顶点位于近裁剪面后方时，该三角形会被跳过。
- 资源模型按双面材质渲染，避免风扇叶片、网罩等薄面模型因为背面剔除出现缺面。

## 操作

- `WASD` 或方向键水平移动。
- 按住画面拖动鼠标可旋转摄像机；点击画面后也可以捕获鼠标连续观察。
- `Q` 上升，`E` 下降。
- `P` 暂停，`R` 重置相机。
