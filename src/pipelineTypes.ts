export interface StandardModelBuffer {
  fileName: string;
  triangleCount: number;
  positions: Float32Array;
  uvs: Float32Array;
  colors: Uint8Array;
  hasTexture: boolean;
  textureWidth: number;
  textureHeight: number;
  texturePixels: Uint8Array | null;
}

export interface ModelWorkerLoadMessage {
  type: "load";
  files: string[];
  textureSize: number;
}

export interface ModelWorkerCompleteMessage {
  type: "complete";
  parsed: number;
  skipped: number;
  models: StandardModelBuffer[];
}

export interface ModelWorkerWarningMessage {
  type: "warning";
  message: string;
}

export type ModelWorkerMessage =
  | ModelWorkerLoadMessage
  | ModelWorkerCompleteMessage
  | ModelWorkerWarningMessage;

export interface CameraWasmExports extends WebAssembly.Exports {
  init(seed: number): void;
  set_input(input: number): void;
  set_look(dx: number, dy: number): void;
  update(dtMs: number): void;
  x(): number;
  y(): number;
  z(): number;
  yaw(): number;
  pitch(): number;
  speed(): number;
  elapsed_seconds(): number;
}

export interface RendererWasmExports extends WebAssembly.Exports {
  memory: WebAssembly.Memory;
  init(seed: number): void;
  render(): void;
  set_camera_state(x: number, y: number, z: number, yaw: number, pitch: number, time: number): void;
  width(): number;
  height(): number;
  buffer_ptr(): number;
  clear_render_models(): void;
  begin_render_model(modelId: number): void;
  add_model_triangle(
    ax: number, ay: number, az: number, au: number, av: number,
    bx: number, by: number, bz: number, bu: number, bv: number,
    cx: number, cy: number, cz: number, cu: number, cv: number,
    r: number, g: number, b: number, textureId: number
  ): number;
  end_render_model(): void;
  add_model_instance(modelId: number, x: number, y: number, z: number, scale: number, yaw: number): number;
  texture_upload_ptr(textureId: number): number;
  set_texture(textureId: number, width: number, height: number): number;
  loaded_instance_count(): number;
  loaded_texture_count(): number;
  score(): number;
  is_game_over(): number;
}

