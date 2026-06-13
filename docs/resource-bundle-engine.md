# 资源解压引擎使用文档

本文说明场景资源包的构建、`.bundle` 文件格式、浏览器 WASM 解压流程，以及后续扩展包接入规范。

## 目标

资源解压引擎解决三个问题：

- 把一个场景的多个 `.glb` 模型合并成单个 `.bundle` 文件。
- 使用 DEFLATE raw 压缩资源，减少网络请求和传输体积。
- 在浏览器 worker 中用 Rust/WASM 解压，输出统一资源结构，供模型解析 worker 使用。

当前默认场景压缩结果：

```text
75 files, 2.74 MB -> 1.36 MB
```

## 相关文件

- `scripts/build-scene-bundle.mjs`: 构建期资源压缩器。
- `src/scenePackage/defaultScene.bundle`: 默认场景资源包产物。
- `bundle_loader/src/lib.rs`: Rust/WASM 解压引擎。
- `public/wasm/bundle_loader.wasm`: 解压引擎 wasm 产物。
- `src/resourceBundle/bundleWorker.js`: 浏览器 worker，负责加载 `.bundle` 和 wasm。
- `src/resourceBundle/loadResourceBundle.js`: 主线程包装 API。
- `src/modelWorker.js`: 消费解包后的资源，解析 GLB。

## 构建命令

只构建资源包：

```bash
npm run build:bundle
```

只构建 WASM：

```bash
npm run build:wasm
```

完整生产构建：

```bash
npm run build
```

完整构建会执行：

1. `npm run build:bundle`
2. `npm run build:wasm`
3. `vite build`

## Dev 热更新

`vite.config.js` 中的 `sceneBundleHotReload()` 会监听：

- `src/scenePackage/defaultScene.js`
- `src/scenePackage/resources/**/*.glb`

当资源或资源列表变化时：

1. 自动执行 `npm run build:bundle`。
2. 生成新的 `src/scenePackage/defaultScene.bundle`。
3. Vite 触发浏览器刷新。

Rust/WASM 解压引擎变化仍由 `rustWasmHotReload()` 处理。

## 场景资源描述

场景通过 `resourceBundle` 描述资源包：

```js
resourceBundle: {
  id: "default-room-gallery",
  version: 1,
  format: "ngb-deflate-v1",
  url: defaultSceneBundleUrl
}
```

字段说明：

- `id`: 资源包 ID，用于调试、缓存和未来扩展包识别。
- `version`: 资源包版本号。
- `format`: 当前格式固定为 `ngb-deflate-v1`。
- `url`: Vite 编译后的 `.bundle` URL。

## 统一资源结构

解包 worker 输出：

```ts
type BundleResource = {
  fileName: string;
  buffer: ArrayBuffer;
  byteLength: number;
};
```

字段说明：

- `fileName`: 稳定资源 ID，例如 `Candlestick.glb`。它不是磁盘文件名，而是场景配置使用的逻辑名。
- `buffer`: 解压后的资源二进制。
- `byteLength`: 解压后的字节数。

模型 worker 接收：

```js
{
  type: "load",
  files: scene.resources,
  resources,
  textureSize: scene.textureSize
}
```

其中 `files` 用来控制加载顺序，`resources` 是解包后的资源数组。

## .bundle 格式

当前 `.bundle` 是自定义轻量容器，使用 `NGB1` magic 和逐文件 DEFLATE raw 压缩。

### 文件头

| 偏移 | 类型 | 字段 |
| --- | --- | --- |
| 0 | `u8[4]` | magic，固定为 `NGB1` |
| 4 | `u32le` | entry count |

### 条目结构

条目按顺序连续存放：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `nameLen` | `u16le` | UTF-8 资源名长度 |
| `method` | `u8` | 压缩方法，`1` 表示 DEFLATE raw |
| `flags` | `u8` | 预留，当前为 `0` |
| `uncompressedLen` | `u32le` | 解压后字节数 |
| `compressedLen` | `u32le` | 压缩后字节数 |
| `crc32` | `u32le` | 原始数据 CRC32，当前构建器写入，WASM 暂未校验 |
| `name` | `u8[nameLen]` | UTF-8 资源名 |
| `data` | `u8[compressedLen]` | DEFLATE raw 数据 |

多条目顺序重复上述结构。

## 压缩器

压缩器位置：

```text
scripts/build-scene-bundle.mjs
```

工作流程：

1. 读取 `src/scenePackage/defaultScene.js` 中的 `resources` 列表。
2. 将逻辑资源名转换为 URL 安全文件名：

```js
"Baseball Bat.glb" -> "baseball-bat.glb"
```

3. 从 `src/scenePackage/resources/` 读取源 `.glb`。
4. 用 `zlib.deflateRawSync(source, { level: 9 })` 压缩。
5. 写出 `src/scenePackage/defaultScene.bundle`。

新增资源时必须同时满足：

- 源文件存在于 `src/scenePackage/resources/`。
- `DEFAULT_SCENE.resources` 中有对应逻辑名。
- 逻辑名转换后的安全文件名与源文件名一致。

## WASM 解压引擎

Rust 包：

```text
bundle_loader
```

构建产物：

```text
public/wasm/bundle_loader.wasm
```

依赖：

- `vendor/miniz_oxide`
- `vendor/adler2`

这些依赖被 vendored 到仓库里，避免离线环境构建失败。

## WASM ABI

`bundle_loader.wasm` 暴露以下 C ABI。

### 内存管理

```c
uint8_t* alloc(size_t len);
void free(uint8_t* ptr, size_t len);
```

JS 用 `alloc()` 分配 wasm 内存，把 `.bundle` bytes 写进去，再调用 `bundle_load()`。

### 加载 Bundle

```c
int32_t bundle_load(uint8_t* ptr, size_t len);
```

返回：

- `1`: 成功。
- `0`: 失败，可通过 `bundle_error_ptr()` 和 `bundle_error_len()` 读取错误信息。

### 查询条目

```c
size_t bundle_file_count();
uint8_t* bundle_file_name_ptr(size_t index);
size_t bundle_file_name_len(size_t index);
size_t bundle_file_uncompressed_len(size_t index);
```

### 解压条目

```c
int32_t bundle_decompress(size_t index);
uint8_t* bundle_output_ptr();
size_t bundle_output_len();
```

`bundle_decompress(index)` 会把指定资源解压到 wasm 内部输出缓冲区。JS 需要立刻复制这段输出，因为下一次解压会覆盖它。

### 错误信息

```c
uint8_t* bundle_error_ptr();
size_t bundle_error_len();
```

返回 UTF-8 错误字符串。

## 浏览器加载流程

主线程调用：

```js
import { loadResourceBundle } from "../resourceBundle/loadResourceBundle.js";

const resources = await loadResourceBundle(scene.resourceBundle);
```

`loadResourceBundle()` 会创建：

```js
new Worker(new URL("./bundleWorker.js", import.meta.url), { type: "module" })
```

worker 流程：

1. fetch `resourceBundle.url`。
2. fetch `/wasm/bundle_loader.wasm`。
3. 实例化 wasm。
4. 把 `.bundle` bytes 写入 wasm 内存。
5. 调用 `bundle_load()`。
6. 遍历所有条目。
7. 对每个条目调用 `bundle_decompress(index)`。
8. 复制解压结果为 `ArrayBuffer`。
9. postMessage `BundleResource[]` 给主线程。

主线程再把这些资源 transfer 给 `modelWorker.js`。

## 扩展包接入规范

后续一个扩展包至少需要提供：

```js
const extensionScene = {
  id: "my-extension",
  resourceBundle: {
    id: "my-extension",
    version: 1,
    format: "ngb-deflate-v1",
    url: extensionBundleUrl
  },
  resources: [
    "My Model.glb"
  ],
  layout: {},
  materials: {},
  effects: {}
};
```

接入要求：

- `.bundle` 内的 `fileName` 必须与 `resources` 中的逻辑名一致。
- `resources` 顺序决定模型实例布局顺序。
- `materials.overrides` 和 `effects` 也使用同一个逻辑名匹配。
- 解压后资源必须是 GLB，当前 `modelWorker.js` 只解析 GLB。

## 格式扩展建议

`NGB1` 当前偏轻量，后续可以平滑扩展：

- 使用 `flags` 标记加密、签名、外部依赖等。
- 增加 manifest JSON 条目，描述作者、版本、依赖和入口场景。
- 使用 CRC32 校验解压结果。
- 支持更多资源类型，例如贴图、音频、脚本和物理碰撞体。
- 支持按需解压，而不是一次性解出所有资源。

## 常用检查

构建资源包：

```bash
npm run build:bundle
```

构建 WASM：

```bash
npm run build:wasm
```

完整构建：

```bash
npm run build
```

浏览器检查：

```text
http://127.0.0.1:5173/?check=resource-bundle-docs
```

确认：

- 模型数量为 `75`。
- 纹理数量为 `75`。
- 控制台没有 error/warn。
- Vite build 输出中只有一个 `defaultScene-*.bundle`，不应再输出 75 个独立 `.glb`。
