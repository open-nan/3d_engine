# 渲染引擎使用文档

本文说明浏览器端渲染引擎的使用方式、数据边界和扩展入口。

## 快速运行

```bash
npm run dev
```

打开：

```text
http://127.0.0.1:5173
```

生产构建：

```bash
npm run build
```

构建顺序是：

1. `npm run build:bundle`
2. `npm run build:wasm`
3. `vite build`

## 模块边界

- `src/main.js`: 主渲染线程，负责 UI、输入、WebGL2 渲染、灯光、粒子、场景上传。
- `src/scenePackage/scene.js`: 场景加载入口，负责加载资源包、启动模型解析 worker、把模型上传到 renderer。
- `src/modelWorker.js`: 模型解析线程，负责把 GLB 解析成统一模型 buffer。
- `src/scenePackage/defaultScene.js`: 默认场景描述，包含资源包、资源列表、布局、材质、灯光和粒子配置。
- `engine/src/lib.rs`: Rust/WASM 引擎核心，负责相机状态、输入状态、物理点击检测、粒子 ID 表。
- `public/wasm/engine.wasm`: Rust 引擎构建产物。

当前主画面渲染使用 WebGL2 GPU 管线；Rust/WASM 不再承担主模型光栅化，但仍是相机、输入和物理等引擎逻辑的核心。

## 启动流程

`src/main.js` 的启动流程：

1. `boot()` fetch `/wasm/engine.wasm`。
2. 实例化 Rust/WASM，并读取导出的相机、输入、物理接口。
3. 创建 WebGL2 renderer。
4. 调用 `restart()` 初始化 Rust 引擎状态。
5. 调用 `loadActiveScene()` 加载默认场景。
6. 进入 `requestAnimationFrame(loop)`。

每帧流程：

1. 读取键盘和鼠标输入。
2. 调用 `wasm.set_input(mask)` 和 `wasm.set_look(dx, dy)`。
3. 调用 `wasm.update_camera(dt)` 更新相机。
4. 通过 `renderer.render(cameraState())` 渲染天空、地面、模型和粒子。
5. 更新 HUD。

## 输入控制

当前输入映射：

- `WASD` 或方向键：水平移动。
- 鼠标拖动或 pointer lock：旋转摄像机。
- `Q`: 上升。
- `E`: 下降。
- `P`: 暂停。
- `R`: 重置。

输入 bit 定义在 `src/main.js` 的 `INPUT` 对象里，并与 Rust 端 `engine/src/lib.rs` 中的输入 bit 保持兼容。

## 场景加载

默认场景入口：

```js
import { DEFAULT_SCENE, renderScene } from "./scenePackage/index.js";

renderScene(DEFAULT_SCENE, renderer, wasm, callbacks);
```

`renderScene()` 会：

1. 通过 `scene.resourceBundle` 加载 `.bundle` 资源包。
2. 使用资源解包 worker 得到统一资源数组。
3. 把资源数组传给 `src/modelWorker.js`。
4. 模型 worker 将 GLB 转成标准模型 buffer。
5. 主线程调用 `uploadSceneModels()`，按场景布局创建实例并上传到 renderer。

## 统一模型 Buffer

模型 worker 输出的模型结构：

```ts
type StandardModelBuffer = {
  fileName: string;
  triangleCount: number;
  positions: Float32Array;
  uvs: Float32Array;
  colors: Uint8Array;
  hasTexture: boolean;
  textureWidth: number;
  textureHeight: number;
  texturePixels: Uint8Array | null;
};
```

约定：

- `positions`: 每个三角形 9 个 float。
- `uvs`: 每个三角形 6 个 float。
- `colors`: 每个三角形 3 个 byte。
- `texturePixels`: RGBA 像素，默认压到 `scene.textureSize`。
- `fileName`: 稳定资源 ID，用于匹配材质、灯光和粒子效果。

主线程不解析 GLB，只消费这个标准 buffer。

## WebGL 顶点格式

`buildVertexData()` 会把模型 buffer 转成 renderer 使用的顶点格式。

当前 mesh 顶点 stride 是 15 个 float：

| 区间 | 字段 |
| --- | --- |
| 0-2 | position |
| 3-5 | normal |
| 6-7 | uv |
| 8-10 | color |
| 11 | reflectivity |
| 12 | roughness |
| 13 | fresnel |
| 14 | envIntensity |

如果新增材质属性，需要同步修改：

- `buildVertexData()`
- `writeVertex()`
- `bindMeshAttributes()`
- `meshProgramLocations()`
- `MESH_VERTEX_SHADER`
- `MESH_FRAGMENT_SHADER`

## 材质系统

场景材质定义在 `DEFAULT_SCENE.materials`：

```js
materials: {
  default: { reflectivity, roughness, fresnel, envIntensity },
  textured: { reflectivity, roughness, fresnel, envIntensity },
  floor: { reflectivity, roughness, fresnel, envIntensity },
  overrides: {
    "Wine Glass.glb": { reflectivity, roughness, fresnel, envIntensity }
  }
}
```

选择规则：

1. 有贴图模型使用 `materials.textured`。
2. 无贴图模型使用 `materials.default`。
3. 如果 `materials.overrides[fileName]` 存在，则覆盖前两者。

fragment shader 中会使用：

- 漫反射太阳光。
- 点光源和效果光源。
- 环境反射。
- 粗糙度控制高光。
- Fresnel 边缘反射。

## 灯光和透光

效果配置放在 `DEFAULT_SCENE.effects`。

火焰灯：

```js
"Candlestick.glb": {
  flame: flameEffect({ localPosition: [0, 0.95, 0] }),
  softLight: {
    color: [1.0, 0.48, 0.16],
    intensity: 1.55,
    radius: 5.2,
    glowSize: 118,
    flicker: 0.22,
    pickRadius: 0.42
  }
}
```

电光球：

```js
"Lamp With Shade.glb": {
  electricLight: electricOrbEffect({
    localPosition: [0, 0.78, 0],
    ellipsoid: [1.15, 0.9, 1.0],
    color: [1.0, 0.76, 0.42],
    flicker: 0.0
  }),
  shadeTransmission: {
    color: [0.34, 0.52, 1.0],
    strength: 0.62,
    alpha: 0.66
  }
}
```

透光规则：

- 灯泡原色与灯罩颜色通过 `transmittedLightColor()` 混合。
- 有灯罩的电光源会把过滤后的颜色作为场景光照。
- shader 内部使用 `transmittedShadeColor()` 渲染灯罩表面透光。

这样黄色光穿过蓝色灯罩时，会得到混合后的透射光，而不是纯黄色。

## 粒子系统

共享粒子效果定义在：

```text
src/share/particleEffects.js
```

当前内置两种：

- `flameEffect()`: 火焰粒子，有摇曳、上升、颜色渐变。
- `electricOrbEffect()`: 电光球/椭球，默认不摇曳。

粒子顶点 stride 是 12 个 float：

| 区间 | 字段 |
| --- | --- |
| 0-2 | position |
| 3 | age |
| 4 | size |
| 5-7 | color |
| 8 | alpha |
| 9 | shape |
| 10-11 | stretch |

`shape = 0` 表示火焰，`shape = 1` 表示球形/椭球电光。

## 点击关灯

灯光点击检测由 Rust 物理接口完成：

1. JS 用鼠标位置生成世界空间 ray。
2. 调用 `wasm.physics_toggle_light_by_ray(origin, direction)`。
3. Rust 返回命中的 light id。
4. JS 调用 `renderer.syncLightState(wasm, lightId)` 同步开关状态。

灯光注册发生在 `renderer.registerPhysicsLights(wasm)`。

## 新增模型资源

新增模型时：

1. 把 `.glb` 放入 `src/scenePackage/resources/`。
2. 文件名使用 URL 安全格式，例如 `new-lamp.glb`。
3. 在 `DEFAULT_SCENE.resources` 中加入稳定显示名，例如 `"New Lamp.glb"`。
4. 如果需要效果，在 `DEFAULT_SCENE.effects` 中按稳定显示名配置。
5. 运行 `npm run build:bundle` 或启动 dev server 等待自动重建 bundle。

注意：资源压缩器会把稳定显示名转换为 URL 安全文件名读取源文件。

## 常用检查

```bash
node --check src/main.js
node --check src/modelWorker.js
npm run build
```

浏览器检查：

```text
http://127.0.0.1:5173/?check=render-engine-docs
```

确认：

- 模型数量为 `75`。
- 纹理数量为 `75`。
- 控制台没有 error/warn。
