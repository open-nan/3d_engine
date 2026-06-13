use std::cell::UnsafeCell;

mod particle_effects;

const WIDTH: usize = 480;
const HEIGHT: usize = 270;
const PIXELS: usize = WIDTH * HEIGHT * 4;
const DEPTH_PIXELS: usize = WIDTH * HEIGHT;
const FOCAL_LENGTH: f32 = 265.0;
const NEAR_PLANE: f32 = 0.08;
const FAR_PLANE: f32 = 80.0;
const MAX_MODELS: usize = 96;
const MAX_MODEL_TRIANGLES: usize = 60_000;
const MAX_INSTANCES: usize = 96;
const MAX_TEXTURES: usize = 96;
const MAX_PHYSICS_LIGHTS: usize = 32;
const TEXTURE_SIZE: usize = 128;
const TEXTURE_PIXELS: usize = MAX_TEXTURES * TEXTURE_SIZE * TEXTURE_SIZE * 4;
const NO_TEXTURE: u32 = u32::MAX;
const AA_EDGE_THRESHOLD: i32 = 24;

const INPUT_FORWARD: u32 = 1;
const INPUT_BACK: u32 = 2;
const INPUT_LEFT: u32 = 4;
const INPUT_RIGHT: u32 = 8;
const INPUT_UP: u32 = 16;
const INPUT_DOWN: u32 = 32;
const INPUT_LOOK_UP: u32 = 64;
const INPUT_LOOK_DOWN: u32 = 128;

struct WasmCell<T>(UnsafeCell<T>);

unsafe impl<T> Sync for WasmCell<T> {}

static ENGINE: WasmCell<Engine> = WasmCell(UnsafeCell::new(Engine::new()));
static FRAMEBUFFER: WasmCell<[u8; PIXELS]> = WasmCell(UnsafeCell::new([0; PIXELS]));
static AA_BUFFER: WasmCell<[u8; PIXELS]> = WasmCell(UnsafeCell::new([0; PIXELS]));
static DEPTH: WasmCell<[f32; DEPTH_PIXELS]> = WasmCell(UnsafeCell::new([0.0; DEPTH_PIXELS]));
static MODEL_STORE: WasmCell<ModelStore> = WasmCell(UnsafeCell::new(ModelStore::new()));
static TEXTURE_STORE: WasmCell<TextureStore> = WasmCell(UnsafeCell::new(TextureStore::new()));
static PHYSICS_WORLD: WasmCell<PhysicsWorld> = WasmCell(UnsafeCell::new(PhysicsWorld::new()));

fn engine() -> &'static Engine {
    unsafe { &*ENGINE.0.get() }
}

fn engine_mut() -> &'static mut Engine {
    unsafe { &mut *ENGINE.0.get() }
}

fn framebuffer() -> &'static [u8; PIXELS] {
    unsafe { &*FRAMEBUFFER.0.get() }
}

fn framebuffer_mut() -> &'static mut [u8; PIXELS] {
    unsafe { &mut *FRAMEBUFFER.0.get() }
}

fn aa_buffer_mut() -> &'static mut [u8; PIXELS] {
    unsafe { &mut *AA_BUFFER.0.get() }
}

fn depth_mut() -> &'static mut [f32; DEPTH_PIXELS] {
    unsafe { &mut *DEPTH.0.get() }
}

fn model_store() -> &'static ModelStore {
    unsafe { &*MODEL_STORE.0.get() }
}

fn model_store_mut() -> &'static mut ModelStore {
    unsafe { &mut *MODEL_STORE.0.get() }
}

fn texture_store() -> &'static TextureStore {
    unsafe { &*TEXTURE_STORE.0.get() }
}

fn texture_store_mut() -> &'static mut TextureStore {
    unsafe { &mut *TEXTURE_STORE.0.get() }
}

fn texture_pixels_mut() -> &'static mut [u8; TEXTURE_PIXELS] {
    unsafe { &mut (*TEXTURE_STORE.0.get()).pixels }
}

fn physics_world() -> &'static PhysicsWorld {
    unsafe { &*PHYSICS_WORLD.0.get() }
}

fn physics_world_mut() -> &'static mut PhysicsWorld {
    unsafe { &mut *PHYSICS_WORLD.0.get() }
}

#[derive(Clone, Copy)]
struct Vec3 {
    x: f32,
    y: f32,
    z: f32,
}

impl Vec3 {
    const fn new(x: f32, y: f32, z: f32) -> Self {
        Self { x, y, z }
    }

    fn add(self, other: Vec3) -> Self {
        Self::new(self.x + other.x, self.y + other.y, self.z + other.z)
    }

    fn sub(self, other: Vec3) -> Self {
        Self::new(self.x - other.x, self.y - other.y, self.z - other.z)
    }

    fn mul(self, scale: f32) -> Self {
        Self::new(self.x * scale, self.y * scale, self.z * scale)
    }

    fn dot(self, other: Vec3) -> f32 {
        self.x * other.x + self.y * other.y + self.z * other.z
    }

    fn cross(self, other: Vec3) -> Self {
        Self::new(
            self.y * other.z - self.z * other.y,
            self.z * other.x - self.x * other.z,
            self.x * other.y - self.y * other.x,
        )
    }

    fn len_sq(self) -> f32 {
        self.dot(self)
    }

    fn normalized(self) -> Self {
        let len_sq = self.len_sq();
        if len_sq <= 0.0001 {
            Self::new(0.0, 0.0, 0.0)
        } else {
            self.mul(1.0 / len_sq.sqrt())
        }
    }

    fn clamp_len(self, max_len: f32) -> Self {
        let len_sq = self.len_sq();
        let max_sq = max_len * max_len;
        if len_sq <= max_sq || len_sq <= 0.0001 {
            self
        } else {
            self.mul(max_len / len_sq.sqrt())
        }
    }
}

#[derive(Clone, Copy)]
struct Vec2 {
    u: f32,
    v: f32,
}

impl Vec2 {
    const fn new(u: f32, v: f32) -> Self {
        Self { u, v }
    }
}

#[derive(Clone, Copy)]
struct Vertex {
    pos: Vec3,
    color: [u8; 3],
    uv: Vec2,
    texture_id: u32,
    reflectivity: f32,
}

impl Vertex {
    const fn reflective(pos: Vec3, color: [u8; 3], reflectivity: f32) -> Self {
        Self {
            pos,
            color,
            uv: Vec2::new(0.0, 0.0),
            texture_id: NO_TEXTURE,
            reflectivity,
        }
    }
}

#[derive(Clone, Copy)]
struct ScreenVertex {
    x: f32,
    y: f32,
    z: f32,
    color: [u8; 3],
    uv: Vec2,
    texture_id: u32,
}

#[derive(Clone, Copy)]
struct ModelTriangle {
    a: Vec3,
    b: Vec3,
    c: Vec3,
    uv_a: Vec2,
    uv_b: Vec2,
    uv_c: Vec2,
    color: [u8; 3],
    texture_id: u32,
}

impl ModelTriangle {
    const fn empty() -> Self {
        Self {
            a: Vec3::new(0.0, 0.0, 0.0),
            b: Vec3::new(0.0, 0.0, 0.0),
            c: Vec3::new(0.0, 0.0, 0.0),
            uv_a: Vec2::new(0.0, 0.0),
            uv_b: Vec2::new(0.0, 0.0),
            uv_c: Vec2::new(0.0, 0.0),
            color: [0, 0, 0],
            texture_id: 0,
        }
    }
}

#[derive(Clone, Copy)]
struct TextureInfo {
    width: u32,
    height: u32,
    loaded: bool,
}

impl TextureInfo {
    const fn empty() -> Self {
        Self {
            width: 0,
            height: 0,
            loaded: false,
        }
    }
}

struct TextureStore {
    textures: [TextureInfo; MAX_TEXTURES],
    pixels: [u8; TEXTURE_PIXELS],
    texture_count: u32,
}

impl TextureStore {
    const fn new() -> Self {
        Self {
            textures: [TextureInfo::empty(); MAX_TEXTURES],
            pixels: [0; TEXTURE_PIXELS],
            texture_count: 0,
        }
    }

    fn set_texture(&mut self, texture_id: u32, width: u32, height: u32) -> u32 {
        if texture_id as usize >= MAX_TEXTURES {
            return 0;
        }
        if width == 0
            || height == 0
            || width as usize > TEXTURE_SIZE
            || height as usize > TEXTURE_SIZE
        {
            return 0;
        }
        self.textures[texture_id as usize] = TextureInfo {
            width,
            height,
            loaded: true,
        };
        self.texture_count = self.texture_count.max(texture_id + 1);
        1
    }
}

#[derive(Clone, Copy)]
struct LightBody {
    id: u32,
    center: Vec3,
    radius: f32,
    enabled: bool,
}

impl LightBody {
    const fn empty() -> Self {
        Self {
            id: u32::MAX,
            center: Vec3::new(0.0, 0.0, 0.0),
            radius: 0.0,
            enabled: false,
        }
    }
}

struct PhysicsWorld {
    lights: [LightBody; MAX_PHYSICS_LIGHTS],
    light_count: u32,
}

impl PhysicsWorld {
    const fn new() -> Self {
        Self {
            lights: [LightBody::empty(); MAX_PHYSICS_LIGHTS],
            light_count: 0,
        }
    }

    fn clear_lights(&mut self) {
        self.light_count = 0;
    }

    fn register_light(&mut self, id: u32, center: Vec3, radius: f32) -> u32 {
        if self.light_count as usize >= MAX_PHYSICS_LIGHTS {
            return 0;
        }

        let index = self.light_count as usize;
        self.lights[index] = LightBody {
            id,
            center,
            radius: radius.max(0.05),
            enabled: true,
        };
        self.light_count += 1;
        1
    }

    fn light_enabled(&self, id: u32) -> u32 {
        for light in self.lights.iter().take(self.light_count as usize) {
            if light.id == id {
                return light.enabled as u32;
            }
        }
        0
    }

    fn toggle_light(&mut self, id: u32) -> u32 {
        for light in self.lights.iter_mut().take(self.light_count as usize) {
            if light.id == id {
                light.enabled = !light.enabled;
                return light.enabled as u32;
            }
        }
        0
    }

    fn toggle_by_ray(&mut self, origin: Vec3, direction: Vec3) -> i32 {
        let ray = direction.normalized();
        let mut best_index = usize::MAX;
        let mut best_t = f32::MAX;

        for (index, light) in self
            .lights
            .iter()
            .take(self.light_count as usize)
            .enumerate()
        {
            let oc = origin.sub(light.center);
            let b = oc.dot(ray);
            let c = oc.dot(oc) - light.radius * light.radius;
            let discriminant = b * b - c;
            if discriminant < 0.0 {
                continue;
            }

            let t = -b - discriminant.sqrt();
            if t > 0.0 && t < best_t {
                best_t = t;
                best_index = index;
            }
        }

        if best_index == usize::MAX {
            return -1;
        }

        let id = self.lights[best_index].id;
        self.toggle_light(id);
        id as i32
    }
}

#[derive(Clone, Copy)]
struct RenderModel {
    start: u32,
    count: u32,
}

impl RenderModel {
    const fn empty() -> Self {
        Self { start: 0, count: 0 }
    }
}

#[derive(Clone, Copy)]
struct RenderInstance {
    model_id: u32,
    position: Vec3,
    scale: f32,
    yaw: f32,
}

impl RenderInstance {
    const fn empty() -> Self {
        Self {
            model_id: 0,
            position: Vec3::new(0.0, 0.0, 0.0),
            scale: 0.0,
            yaw: 0.0,
        }
    }
}

struct ModelStore {
    models: [RenderModel; MAX_MODELS],
    triangles: [ModelTriangle; MAX_MODEL_TRIANGLES],
    instances: [RenderInstance; MAX_INSTANCES],
    model_count: u32,
    triangle_count: u32,
    instance_count: u32,
    pending_model: u32,
    pending_start: u32,
}

impl ModelStore {
    const fn new() -> Self {
        Self {
            models: [RenderModel::empty(); MAX_MODELS],
            triangles: [ModelTriangle::empty(); MAX_MODEL_TRIANGLES],
            instances: [RenderInstance::empty(); MAX_INSTANCES],
            model_count: 0,
            triangle_count: 0,
            instance_count: 0,
            pending_model: 0,
            pending_start: 0,
        }
    }

    fn clear(&mut self) {
        self.model_count = 0;
        self.triangle_count = 0;
        self.instance_count = 0;
        self.pending_model = 0;
        self.pending_start = 0;
    }

    fn begin_model(&mut self, model_id: u32) {
        if model_id as usize >= MAX_MODELS {
            return;
        }
        self.pending_model = model_id;
        self.pending_start = self.triangle_count;
        self.models[model_id as usize] = RenderModel {
            start: self.pending_start,
            count: 0,
        };
        self.model_count = self.model_count.max(model_id + 1);
    }

    fn add_triangle(&mut self, triangle: ModelTriangle) -> u32 {
        if self.triangle_count as usize >= MAX_MODEL_TRIANGLES {
            return 0;
        }
        self.triangles[self.triangle_count as usize] = triangle;
        self.triangle_count += 1;
        1
    }

    fn end_model(&mut self) {
        if self.pending_model as usize >= MAX_MODELS {
            return;
        }
        let count = self.triangle_count.saturating_sub(self.pending_start);
        self.models[self.pending_model as usize] = RenderModel {
            start: self.pending_start,
            count,
        };
    }

    fn add_instance(&mut self, instance: RenderInstance) -> u32 {
        if self.instance_count as usize >= MAX_INSTANCES {
            return 0;
        }
        if instance.model_id as usize >= MAX_MODELS {
            return 0;
        }
        self.instances[self.instance_count as usize] = instance;
        self.instance_count += 1;
        1
    }
}

struct Engine {
    camera_pos: Vec3,
    velocity: Vec3,
    yaw: f32,
    pitch: f32,
    input: u32,
    look_dx: f32,
    look_dy: f32,
    time: f32,
    frame: u32,
    triangles: u32,
}

impl Engine {
    const fn new() -> Self {
        Self {
            camera_pos: Vec3::new(0.0, 1.65, -7.0),
            velocity: Vec3::new(0.0, 0.0, 0.0),
            yaw: 0.0,
            pitch: -0.04,
            input: 0,
            look_dx: 0.0,
            look_dy: 0.0,
            time: 0.0,
            frame: 0,
            triangles: 0,
        }
    }

    fn reset(&mut self, seed: u32) {
        *self = Self::new();
        self.yaw = (seed as f32 * 0.000_001).sin() * 0.15;
    }

    fn update(&mut self, dt: f32) {
        let dt = dt.clamp(0.0, 0.04);
        self.time += dt;
        self.frame = self.frame.wrapping_add(1);

        self.yaw += self.look_dx * 0.0026;
        self.pitch = (self.pitch - self.look_dy * 0.0022).clamp(-1.15, 1.05);
        if self.input & INPUT_LOOK_UP != 0 {
            self.pitch = (self.pitch + 1.35 * dt).clamp(-1.15, 1.05);
        }
        if self.input & INPUT_LOOK_DOWN != 0 {
            self.pitch = (self.pitch - 1.35 * dt).clamp(-1.15, 1.05);
        }
        self.look_dx = 0.0;
        self.look_dy = 0.0;

        let forward = Vec3::new(self.yaw.sin(), 0.0, self.yaw.cos());
        let right = Vec3::new(forward.z, 0.0, -forward.x);
        let mut wish = Vec3::new(0.0, 0.0, 0.0);

        if self.input & INPUT_FORWARD != 0 {
            wish = wish.add(forward);
        }
        if self.input & INPUT_BACK != 0 {
            wish = wish.sub(forward);
        }
        if self.input & INPUT_RIGHT != 0 {
            wish = wish.add(right);
        }
        if self.input & INPUT_LEFT != 0 {
            wish = wish.sub(right);
        }
        if self.input & INPUT_UP != 0 {
            wish.y += 1.0;
        }
        if self.input & INPUT_DOWN != 0 {
            wish.y -= 1.0;
        }

        let accel = wish.clamp_len(1.0).mul(16.0);
        self.velocity = self.velocity.add(accel.mul(dt)).mul(0.86);
        self.velocity = self.velocity.clamp_len(5.4);
        self.camera_pos = self.camera_pos.add(self.velocity.mul(dt));
        self.camera_pos.x = self.camera_pos.x.clamp(-12.0, 12.0);
        self.camera_pos.y = self.camera_pos.y.clamp(0.7, 6.8);
        self.camera_pos.z = self.camera_pos.z.clamp(-14.0, 16.0);
    }

    fn camera_space(&self, point: Vec3) -> Vec3 {
        let p = point.sub(self.camera_pos);
        let sin_y = self.yaw.sin();
        let cos_y = self.yaw.cos();
        let x = cos_y * p.x - sin_y * p.z;
        let z = sin_y * p.x + cos_y * p.z;

        let sin_p = self.pitch.sin();
        let cos_p = self.pitch.cos();
        Vec3::new(x, cos_p * p.y + sin_p * z, -sin_p * p.y + cos_p * z)
    }

    fn camera_ray_to_world(&self, ray: Vec3) -> Vec3 {
        let sin_p = self.pitch.sin();
        let cos_p = self.pitch.cos();
        let y = cos_p * ray.y - sin_p * ray.z;
        let z = sin_p * ray.y + cos_p * ray.z;

        let sin_y = self.yaw.sin();
        let cos_y = self.yaw.cos();
        Vec3::new(cos_y * ray.x + sin_y * z, y, -sin_y * ray.x + cos_y * z).normalized()
    }
}

#[no_mangle]
pub extern "C" fn init(seed: u32) {
    engine_mut().reset(seed);
    render();
}

#[no_mangle]
pub extern "C" fn set_input(input: u32) {
    engine_mut().input = input;
}

#[no_mangle]
pub extern "C" fn set_look(dx: f32, dy: f32) {
    let engine = engine_mut();
    engine.look_dx += dx.clamp(-90.0, 90.0);
    engine.look_dy += dy.clamp(-90.0, 90.0);
}

#[no_mangle]
pub extern "C" fn set_camera_state(x: f32, y: f32, z: f32, yaw: f32, pitch: f32, time: f32) {
    let engine = engine_mut();
    engine.camera_pos = Vec3::new(x, y, z);
    engine.yaw = yaw;
    engine.pitch = pitch;
    engine.time = time;
}

#[no_mangle]
pub extern "C" fn clear_render_models() {
    model_store_mut().clear();
}

#[no_mangle]
pub extern "C" fn begin_render_model(model_id: u32) {
    model_store_mut().begin_model(model_id);
}

#[no_mangle]
pub extern "C" fn texture_upload_ptr(texture_id: u32) -> *mut u8 {
    if texture_id as usize >= MAX_TEXTURES {
        return std::ptr::null_mut();
    }
    let offset = texture_id as usize * TEXTURE_SIZE * TEXTURE_SIZE * 4;
    texture_pixels_mut()[offset..].as_mut_ptr()
}

#[no_mangle]
pub extern "C" fn set_texture(texture_id: u32, width: u32, height: u32) -> u32 {
    texture_store_mut().set_texture(texture_id, width, height)
}

#[no_mangle]
pub extern "C" fn loaded_texture_count() -> u32 {
    texture_store().texture_count
}

#[no_mangle]
pub extern "C" fn physics_clear_lights() {
    physics_world_mut().clear_lights();
}

#[no_mangle]
pub extern "C" fn physics_register_light(
    id: u32,
    x: f32,
    y: f32,
    z: f32,
    radius: f32,
) -> u32 {
    physics_world_mut().register_light(id, Vec3::new(x, y, z), radius)
}

#[no_mangle]
pub extern "C" fn physics_toggle_light(id: u32) -> u32 {
    physics_world_mut().toggle_light(id)
}

#[no_mangle]
pub extern "C" fn physics_toggle_light_by_ray(
    ox: f32,
    oy: f32,
    oz: f32,
    dx: f32,
    dy: f32,
    dz: f32,
) -> i32 {
    physics_world_mut().toggle_by_ray(Vec3::new(ox, oy, oz), Vec3::new(dx, dy, dz))
}

#[no_mangle]
pub extern "C" fn physics_light_enabled(id: u32) -> u32 {
    physics_world().light_enabled(id)
}

#[no_mangle]
pub extern "C" fn add_model_triangle(
    ax: f32,
    ay: f32,
    az: f32,
    au: f32,
    av: f32,
    bx: f32,
    by: f32,
    bz: f32,
    bu: f32,
    bv: f32,
    cx: f32,
    cy: f32,
    cz: f32,
    cu: f32,
    cv: f32,
    r: u32,
    g: u32,
    b: u32,
    texture_id: u32,
) -> u32 {
    model_store_mut().add_triangle(ModelTriangle {
        a: Vec3::new(ax, ay, az),
        b: Vec3::new(bx, by, bz),
        c: Vec3::new(cx, cy, cz),
        uv_a: Vec2::new(au, av),
        uv_b: Vec2::new(bu, bv),
        uv_c: Vec2::new(cu, cv),
        color: [r.min(255) as u8, g.min(255) as u8, b.min(255) as u8],
        texture_id,
    })
}

#[no_mangle]
pub extern "C" fn end_render_model() {
    model_store_mut().end_model();
}

#[no_mangle]
pub extern "C" fn add_model_instance(
    model_id: u32,
    x: f32,
    y: f32,
    z: f32,
    scale: f32,
    yaw: f32,
) -> u32 {
    model_store_mut().add_instance(RenderInstance {
        model_id,
        position: Vec3::new(x, y, z),
        scale,
        yaw,
    })
}

#[no_mangle]
pub extern "C" fn loaded_model_count() -> u32 {
    model_store().model_count
}

#[no_mangle]
pub extern "C" fn loaded_instance_count() -> u32 {
    model_store().instance_count
}

#[no_mangle]
pub extern "C" fn update(dt_ms: f32) {
    engine_mut().update(dt_ms / 1000.0);
    render();
}

#[no_mangle]
pub extern "C" fn update_camera(dt_ms: f32) {
    engine_mut().update(dt_ms / 1000.0);
}

#[no_mangle]
pub extern "C" fn camera_x() -> f32 {
    engine().camera_pos.x
}

#[no_mangle]
pub extern "C" fn camera_y() -> f32 {
    engine().camera_pos.y
}

#[no_mangle]
pub extern "C" fn camera_z() -> f32 {
    engine().camera_pos.z
}

#[no_mangle]
pub extern "C" fn camera_yaw() -> f32 {
    engine().yaw
}

#[no_mangle]
pub extern "C" fn camera_pitch() -> f32 {
    engine().pitch
}

#[no_mangle]
pub extern "C" fn width() -> u32 {
    WIDTH as u32
}

#[no_mangle]
pub extern "C" fn height() -> u32 {
    HEIGHT as u32
}

#[no_mangle]
pub extern "C" fn buffer_ptr() -> *const u8 {
    framebuffer().as_ptr()
}

#[no_mangle]
pub extern "C" fn score() -> u32 {
    engine().triangles
}

#[no_mangle]
pub extern "C" fn health() -> i32 {
    (engine().camera_pos.y * 100.0).round() as i32
}

#[no_mangle]
pub extern "C" fn energy() -> u32 {
    (engine().velocity.len_sq().sqrt() * 20.0).round() as u32
}

#[no_mangle]
pub extern "C" fn is_game_over() -> u32 {
    0
}

#[no_mangle]
pub extern "C" fn elapsed_seconds() -> u32 {
    engine().time as u32
}

#[no_mangle]
pub extern "C" fn render() {
    clear_buffers();

    let engine = engine();
    draw_sky(engine);

    let light = sun_direction(engine.time);
    let mut triangles = 0;

    render_floor(engine, light, &mut triangles);
    let store = model_store();

    if store.instance_count > 0 {
        render_model_instances(engine, store, light, &mut triangles);
    } else {
        let cubes = [
            (
                Vec3::new(-4.6, 1.0, 3.3),
                Vec3::new(1.6, 2.0, 1.6),
                0.12,
                [53, 151, 255],
            ),
            (
                Vec3::new(0.0, 0.8, 4.5),
                Vec3::new(1.4, 1.6, 1.4),
                0.7,
                [72, 229, 194],
            ),
            (
                Vec3::new(4.0, 1.3, 2.0),
                Vec3::new(2.0, 2.6, 1.2),
                -0.35,
                [255, 99, 132],
            ),
        ];

        for (i, (center, size, yaw, base_color)) in cubes.iter().enumerate() {
            render_cube(
                engine,
                center.add(Vec3::new(
                    0.0,
                    (engine.time * 1.4 + i as f32).sin() * 0.06,
                    0.0,
                )),
                *size,
                yaw + engine.time * (0.16 + i as f32 * 0.02),
                *base_color,
                light,
                &mut triangles,
            );
        }
    }

    apply_antialiasing();
    render_axis_gizmo();
    engine_mut().triangles = triangles;
}

fn clear_buffers() {
    let fb = framebuffer_mut();
    let depth = depth_mut();

    for pixel in fb.chunks_exact_mut(4) {
        pixel[0] = 0;
        pixel[1] = 0;
        pixel[2] = 0;
        pixel[3] = 255;
    }

    for value in depth.iter_mut() {
        *value = FAR_PLANE;
    }
}

fn draw_sky(engine: &Engine) {
    let fb = framebuffer_mut();
    let mut y = 0;
    while y < HEIGHT {
        let sy = HEIGHT as f32 * 0.5 - (y as f32 + 0.5);
        let mut x = 0;
        while x < WIDTH {
            let sx = x as f32 + 0.5 - WIDTH as f32 * 0.5;
            let camera_ray = Vec3::new(sx / FOCAL_LENGTH, sy / FOCAL_LENGTH, 1.0).normalized();
            let world_ray = engine.camera_ray_to_world(camera_ray);
            let color = sky_color(world_ray, engine.time);
            for oy in 0..2 {
                for ox in 0..2 {
                    let px = x + ox;
                    let py = y + oy;
                    if px >= WIDTH || py >= HEIGHT {
                        continue;
                    }
                    let idx = (py * WIDTH + px) * 4;
                    fb[idx] = color[0];
                    fb[idx + 1] = color[1];
                    fb[idx + 2] = color[2];
                    fb[idx + 3] = 255;
                }
            }
            x += 2;
        }
        y += 2;
    }
}

fn sky_color(direction: Vec3, time: f32) -> [u8; 3] {
    let horizon = (direction.y * 0.5 + 0.5).clamp(0.0, 1.0);
    let sun = sun_direction(time);
    let sun_dot = direction.dot(sun).max(0.0);
    let sun2 = sun_dot * sun_dot;
    let sun4 = sun2 * sun2;
    let sun8 = sun4 * sun4;
    let sun_glow = sun8 * sun4 * sun2;
    let sun_core = sun8 * sun8 * sun8 * sun8;
    let cloud = ((direction.x * 7.5 + time * 0.035).sin()
        * (direction.z * 5.2 - time * 0.025).cos()
        * 0.5
        + 0.5)
        .clamp(0.0, 1.0);
    let cloud = cloud * cloud * cloud
        * (1.0 - horizon).clamp(0.0, 1.0)
        * 0.22;

    let r = lerp(18.0, 7.0, horizon) + sun_glow * 72.0 + sun_core * 180.0 + cloud * 38.0;
    let g = lerp(44.0, 15.0, horizon) + sun_glow * 54.0 + sun_core * 150.0 + cloud * 42.0;
    let b = lerp(82.0, 34.0, horizon) + sun_glow * 28.0 + sun_core * 92.0 + cloud * 48.0;
    [r.min(255.0) as u8, g.min(255.0) as u8, b.min(255.0) as u8]
}

fn sun_direction(time: f32) -> Vec3 {
    Vec3::new(-0.48 + (time * 0.07).sin() * 0.08, 0.78, -0.42).normalized()
}

fn apply_antialiasing() {
    let source = aa_buffer_mut();
    source.copy_from_slice(framebuffer());

    let fb = framebuffer_mut();
    for y in 1..HEIGHT - 1 {
        for x in 1..WIDTH - 1 {
            let idx = (y * WIDTH + x) * 4;
            let center = luma(source, idx);
            let left = luma(source, idx - 4);
            let right = luma(source, idx + 4);
            let up = luma(source, idx - WIDTH * 4);
            let down = luma(source, idx + WIDTH * 4);
            let horizontal = (left - right).abs();
            let vertical = (up - down).abs();
            let contrast = (center - left)
                .abs()
                .max((center - right).abs())
                .max((center - up).abs())
                .max((center - down).abs())
                .max(horizontal)
                .max(vertical);

            if contrast < AA_EDGE_THRESHOLD {
                continue;
            }

            let use_horizontal = horizontal >= vertical;
            for channel in 0..3 {
                let center_value = source[idx + channel] as u32 * 2;
                let blended = if use_horizontal {
                    center_value
                        + source[idx - 4 + channel] as u32
                        + source[idx + 4 + channel] as u32
                } else {
                    center_value
                        + source[idx - WIDTH * 4 + channel] as u32
                        + source[idx + WIDTH * 4 + channel] as u32
                };
                fb[idx + channel] = (blended / 4) as u8;
            }
        }
    }
}

fn luma(buffer: &[u8; PIXELS], idx: usize) -> i32 {
    (buffer[idx] as i32 * 77 + buffer[idx + 1] as i32 * 150 + buffer[idx + 2] as i32 * 29) >> 8
}

fn render_floor(engine: &Engine, light: Vec3, triangles: &mut u32) {
    let extent = 16;
    for z in -extent..extent {
        for x in -extent..extent {
            let checker = ((x + z) & 1) == 0;
            let color = if checker { [18, 34, 58] } else { [11, 25, 45] };
            let x0 = x as f32;
            let x1 = x0 + 1.0;
            let z0 = z as f32;
            let z1 = z0 + 1.0;
            let y = -0.02;

            draw_world_triangle(
                engine,
                Vertex::reflective(Vec3::new(x0, y, z0), color, 0.34),
                Vertex::reflective(Vec3::new(x1, y, z0), color, 0.34),
                Vertex::reflective(Vec3::new(x1, y, z1), color, 0.34),
                light,
                triangles,
            );
            draw_world_triangle(
                engine,
                Vertex::reflective(Vec3::new(x0, y, z0), color, 0.34),
                Vertex::reflective(Vec3::new(x1, y, z1), color, 0.34),
                Vertex::reflective(Vec3::new(x0, y, z1), color, 0.34),
                light,
                triangles,
            );
        }
    }
}

fn render_cube(
    engine: &Engine,
    center: Vec3,
    size: Vec3,
    yaw: f32,
    color: [u8; 3],
    light: Vec3,
    triangles: &mut u32,
) {
    let hx = size.x * 0.5;
    let hy = size.y * 0.5;
    let hz = size.z * 0.5;
    let local = [
        Vec3::new(-hx, -hy, -hz),
        Vec3::new(hx, -hy, -hz),
        Vec3::new(hx, hy, -hz),
        Vec3::new(-hx, hy, -hz),
        Vec3::new(-hx, -hy, hz),
        Vec3::new(hx, -hy, hz),
        Vec3::new(hx, hy, hz),
        Vec3::new(-hx, hy, hz),
    ];

    let mut world = [Vec3::new(0.0, 0.0, 0.0); 8];
    for (i, vertex) in local.iter().enumerate() {
        world[i] = rotate_y(*vertex, yaw).add(center);
    }

    let faces = [
        (0, 1, 2, 3),
        (5, 4, 7, 6),
        (4, 0, 3, 7),
        (1, 5, 6, 2),
        (3, 2, 6, 7),
        (4, 5, 1, 0),
    ];

    for (a, b, c, d) in faces {
        let normal = world[b]
            .sub(world[a])
            .cross(world[c].sub(world[a]))
            .normalized();
        let shade = normal.dot(light).max(0.0) * 0.65 + 0.28;
        let face_color = shade_color(color, shade);

        draw_world_triangle(
            engine,
            Vertex::reflective(world[a], face_color, 0.18),
            Vertex::reflective(world[b], face_color, 0.18),
            Vertex::reflective(world[c], face_color, 0.18),
            light,
            triangles,
        );
        draw_world_triangle(
            engine,
            Vertex::reflective(world[a], face_color, 0.18),
            Vertex::reflective(world[c], face_color, 0.18),
            Vertex::reflective(world[d], face_color, 0.18),
            light,
            triangles,
        );
    }
}

fn render_model_instances(engine: &Engine, store: &ModelStore, light: Vec3, triangles: &mut u32) {
    for instance in store.instances.iter().take(store.instance_count as usize) {
        if instance.model_id as usize >= MAX_MODELS {
            continue;
        }

        let model = store.models[instance.model_id as usize];
        let end = (model.start + model.count).min(store.triangle_count);
        for triangle in store.triangles[model.start as usize..end as usize].iter() {
            let wave = (engine.time * 1.1 + instance.position.x * 0.35).sin() * 0.035;
            let position = instance.position.add(Vec3::new(0.0, wave, 0.0));
            draw_world_triangle(
                engine,
                Vertex {
                    pos: transform_model_point(triangle.a, position, instance.scale, instance.yaw),
                    color: triangle.color,
                    uv: triangle.uv_a,
                    texture_id: triangle.texture_id,
                    reflectivity: if triangle.texture_id == NO_TEXTURE { 0.08 } else { 0.13 },
                },
                Vertex {
                    pos: transform_model_point(triangle.b, position, instance.scale, instance.yaw),
                    color: triangle.color,
                    uv: triangle.uv_b,
                    texture_id: triangle.texture_id,
                    reflectivity: if triangle.texture_id == NO_TEXTURE { 0.08 } else { 0.13 },
                },
                Vertex {
                    pos: transform_model_point(triangle.c, position, instance.scale, instance.yaw),
                    color: triangle.color,
                    uv: triangle.uv_c,
                    texture_id: triangle.texture_id,
                    reflectivity: if triangle.texture_id == NO_TEXTURE { 0.08 } else { 0.13 },
                },
                light,
                triangles,
            );
        }
    }
}

fn draw_world_triangle(
    engine: &Engine,
    a: Vertex,
    b: Vertex,
    c: Vertex,
    light: Vec3,
    triangles: &mut u32,
) {
    let world_normal = b.pos.sub(a.pos).cross(c.pos.sub(a.pos)).normalized();
    let to_camera = engine.camera_pos.sub(a.pos).normalized();
    let double_sided =
        a.texture_id != NO_TEXTURE || b.texture_id != NO_TEXTURE || c.texture_id != NO_TEXTURE;
    let facing = world_normal.dot(to_camera);
    if !double_sided && facing <= -0.08 {
        return;
    }
    let lighting_normal = if double_sided && facing < 0.0 {
        world_normal.mul(-1.0)
    } else {
        world_normal
    };

    let mut va = Vertex {
        pos: engine.camera_space(a.pos),
        color: a.color,
        uv: a.uv,
        texture_id: a.texture_id,
        reflectivity: a.reflectivity,
    };
    let mut vb = Vertex {
        pos: engine.camera_space(b.pos),
        color: b.color,
        uv: b.uv,
        texture_id: b.texture_id,
        reflectivity: b.reflectivity,
    };
    let mut vc = Vertex {
        pos: engine.camera_space(c.pos),
        color: c.color,
        uv: c.uv,
        texture_id: c.texture_id,
        reflectivity: c.reflectivity,
    };

    let center = a.pos.add(b.pos).add(c.pos).mul(1.0 / 3.0);
    let view_dir = engine.camera_pos.sub(center).normalized();
    let half_dir = light.add(view_dir).normalized();
    let diffuse = lighting_normal.dot(light).max(0.0);
    let sky_bounce = lighting_normal.y.max(0.0);
    let rim = (1.0 - lighting_normal.dot(view_dir).max(0.0)).powf(2.0);
    let specular_base = lighting_normal.dot(half_dir).max(0.0);
    let specular2 = specular_base * specular_base;
    let specular4 = specular2 * specular2;
    let specular8 = specular4 * specular4;
    let specular = specular8 * specular8 * specular4;
    let point_light = moving_point_light(center, engine.time, lighting_normal);
    let shade = 0.34 + diffuse * 0.48 + sky_bounce * 0.1 + point_light * 0.24;
    let reflection = reflection_color(center, engine.camera_pos, lighting_normal, engine.time);
    let reflectivity = ((a.reflectivity + b.reflectivity + c.reflectivity) / 3.0).clamp(0.0, 0.65);
    let highlight = (specular * 115.0 + rim * reflectivity * 38.0).min(160.0);
    va.color = light_material_color(va.color, shade, reflection, reflectivity, highlight);
    vb.color = light_material_color(vb.color, shade, reflection, reflectivity, highlight);
    vc.color = light_material_color(vc.color, shade, reflection, reflectivity, highlight);

    if va.pos.z <= NEAR_PLANE || vb.pos.z <= NEAR_PLANE || vc.pos.z <= NEAR_PLANE {
        return;
    }

    let Some(sa) = project(va) else { return };
    let Some(sb) = project(vb) else { return };
    let Some(sc) = project(vc) else { return };

    raster_triangle(sa, sb, sc);
    *triangles += 1;
}

fn transform_model_point(point: Vec3, position: Vec3, scale: f32, yaw: f32) -> Vec3 {
    rotate_y(point.mul(scale), yaw).add(position)
}

fn project(vertex: Vertex) -> Option<ScreenVertex> {
    if vertex.pos.z <= NEAR_PLANE || vertex.pos.z >= FAR_PLANE {
        return None;
    }

    Some(ScreenVertex {
        x: WIDTH as f32 * 0.5 + vertex.pos.x * FOCAL_LENGTH / vertex.pos.z,
        y: HEIGHT as f32 * 0.5 - vertex.pos.y * FOCAL_LENGTH / vertex.pos.z,
        z: vertex.pos.z,
        color: vertex.color,
        uv: vertex.uv,
        texture_id: vertex.texture_id,
    })
}

fn raster_triangle(a: ScreenVertex, b: ScreenVertex, c: ScreenVertex) {
    let min_x = a.x.min(b.x).min(c.x).floor().max(0.0) as i32;
    let max_x = a.x.max(b.x).max(c.x).ceil().min((WIDTH - 1) as f32) as i32;
    let min_y = a.y.min(b.y).min(c.y).floor().max(0.0) as i32;
    let max_y = a.y.max(b.y).max(c.y).ceil().min((HEIGHT - 1) as f32) as i32;
    if min_x > max_x || min_y > max_y {
        return;
    }

    let area = edge(a.x, a.y, b.x, b.y, c.x, c.y);
    if area.abs() <= 0.0001 {
        return;
    }

    let fb = framebuffer_mut();
    let depth = depth_mut();

    for y in min_y..=max_y {
        for x in min_x..=max_x {
            let px = x as f32 + 0.5;
            let py = y as f32 + 0.5;
            let w0 = edge(b.x, b.y, c.x, c.y, px, py) / area;
            let w1 = edge(c.x, c.y, a.x, a.y, px, py) / area;
            let w2 = edge(a.x, a.y, b.x, b.y, px, py) / area;

            if w0 < 0.0 || w1 < 0.0 || w2 < 0.0 {
                continue;
            }

            let inv_z = w0 / a.z + w1 / b.z + w2 / c.z;
            if inv_z <= 0.0 {
                continue;
            }
            let z = 1.0 / inv_z;
            let idx = y as usize * WIDTH + x as usize;
            if z >= depth[idx] {
                continue;
            }

            depth[idx] = z;
            let fog = ((z - 5.0) / 30.0).clamp(0.0, 1.0);
            let base_r = perspective_channel(
                a.color[0], b.color[0], c.color[0], w0, w1, w2, a.z, b.z, c.z, z,
            );
            let base_g = perspective_channel(
                a.color[1], b.color[1], c.color[1], w0, w1, w2, a.z, b.z, c.z, z,
            );
            let base_b = perspective_channel(
                a.color[2], b.color[2], c.color[2], w0, w1, w2, a.z, b.z, c.z, z,
            );
            let uv = Vec2::new(
                perspective_float(a.uv.u, b.uv.u, c.uv.u, w0, w1, w2, a.z, b.z, c.z, z),
                perspective_float(a.uv.v, b.uv.v, c.uv.v, w0, w1, w2, a.z, b.z, c.z, z),
            );
            let [r, g, bch] = sample_texture(a.texture_id, uv, [base_r, base_g, base_b]);
            let px_idx = idx * 4;
            fb[px_idx] = lerp(r as f32, 8.0, fog) as u8;
            fb[px_idx + 1] = lerp(g as f32, 13.0, fog) as u8;
            fb[px_idx + 2] = lerp(bch as f32, 25.0, fog) as u8;
            fb[px_idx + 3] = 255;
        }
    }
}

fn render_axis_gizmo() {
    draw_rect(16, HEIGHT as i32 - 44, 46, 4, [255, 82, 109]);
    draw_rect(16, HEIGHT as i32 - 44, 4, -32, [78, 229, 194]);
    draw_rect(16, HEIGHT as i32 - 44, 28, -20, [78, 149, 255]);
}

fn draw_rect(x: i32, y: i32, w: i32, h: i32, color: [u8; 3]) {
    let x0 = x.min(x + w);
    let x1 = x.max(x + w);
    let y0 = y.min(y + h);
    let y1 = y.max(y + h);
    let fb = framebuffer_mut();

    for py in y0..=y1 {
        for px in x0..=x1 {
            if px < 0 || py < 0 || px >= WIDTH as i32 || py >= HEIGHT as i32 {
                continue;
            }
            let idx = (py as usize * WIDTH + px as usize) * 4;
            fb[idx] = color[0];
            fb[idx + 1] = color[1];
            fb[idx + 2] = color[2];
            fb[idx + 3] = 255;
        }
    }
}

fn edge(ax: f32, ay: f32, bx: f32, by: f32, px: f32, py: f32) -> f32 {
    (px - ax) * (by - ay) - (py - ay) * (bx - ax)
}

fn perspective_channel(
    a: u8,
    b: u8,
    c: u8,
    w0: f32,
    w1: f32,
    w2: f32,
    za: f32,
    zb: f32,
    zc: f32,
    z: f32,
) -> u8 {
    ((w0 * a as f32 / za + w1 * b as f32 / zb + w2 * c as f32 / zc) * z).clamp(0.0, 255.0) as u8
}

fn perspective_float(
    a: f32,
    b: f32,
    c: f32,
    w0: f32,
    w1: f32,
    w2: f32,
    za: f32,
    zb: f32,
    zc: f32,
    z: f32,
) -> f32 {
    (w0 * a / za + w1 * b / zb + w2 * c / zc) * z
}

fn sample_texture(texture_id: u32, uv: Vec2, fallback: [u8; 3]) -> [u8; 3] {
    if texture_id == NO_TEXTURE || texture_id as usize >= MAX_TEXTURES {
        return fallback;
    }

    let store = texture_store();
    let info = store.textures[texture_id as usize];
    if !info.loaded || info.width == 0 || info.height == 0 {
        return fallback;
    }

    let u = uv.u.rem_euclid(1.0);
    let v = uv.v.rem_euclid(1.0);
    let x = (u * (info.width - 1) as f32).round() as usize;
    let y = ((1.0 - v) * (info.height - 1) as f32).round() as usize;
    let offset = texture_id as usize * TEXTURE_SIZE * TEXTURE_SIZE * 4 + (y * TEXTURE_SIZE + x) * 4;
    let alpha = store.pixels[offset + 3] as f32 / 255.0;
    let tex = [
        store.pixels[offset] as f32,
        store.pixels[offset + 1] as f32,
        store.pixels[offset + 2] as f32,
    ];

    [
        (fallback[0] as f32 * tex[0] / 255.0 * alpha + fallback[0] as f32 * (1.0 - alpha))
            .clamp(0.0, 255.0) as u8,
        (fallback[1] as f32 * tex[1] / 255.0 * alpha + fallback[1] as f32 * (1.0 - alpha))
            .clamp(0.0, 255.0) as u8,
        (fallback[2] as f32 * tex[2] / 255.0 * alpha + fallback[2] as f32 * (1.0 - alpha))
            .clamp(0.0, 255.0) as u8,
    ]
}

fn moving_point_light(point: Vec3, time: f32, normal: Vec3) -> f32 {
    let light_pos = Vec3::new((time * 0.8).sin() * 5.0, 3.2, 4.5 + (time * 0.55).cos() * 2.2);
    let to_light = light_pos.sub(point);
    let distance_sq = to_light.len_sq().max(0.001);
    let direction = to_light.normalized();
    let attenuation = (8.5 / distance_sq).min(1.0);
    normal.dot(direction).max(0.0) * attenuation
}

fn reflection_color(point: Vec3, camera_pos: Vec3, normal: Vec3, time: f32) -> [u8; 3] {
    let incident = point.sub(camera_pos).normalized();
    let reflected = incident.sub(normal.mul(2.0 * incident.dot(normal))).normalized();
    sky_color(reflected, time)
}

fn light_material_color(
    color: [u8; 3],
    shade: f32,
    reflection: [u8; 3],
    reflectivity: f32,
    highlight: f32,
) -> [u8; 3] {
    let base = [
        color[0] as f32 * shade,
        color[1] as f32 * shade,
        color[2] as f32 * shade,
    ];
    [
        (lerp(base[0], reflection[0] as f32, reflectivity) + highlight).clamp(0.0, 255.0) as u8,
        (lerp(base[1], reflection[1] as f32, reflectivity) + highlight).clamp(0.0, 255.0) as u8,
        (lerp(base[2], reflection[2] as f32, reflectivity) + highlight).clamp(0.0, 255.0) as u8,
    ]
}

fn rotate_y(point: Vec3, angle: f32) -> Vec3 {
    let sin = angle.sin();
    let cos = angle.cos();
    Vec3::new(
        point.x * cos + point.z * sin,
        point.y,
        -point.x * sin + point.z * cos,
    )
}

fn shade_color(color: [u8; 3], shade: f32) -> [u8; 3] {
    [
        (color[0] as f32 * shade).clamp(0.0, 255.0) as u8,
        (color[1] as f32 * shade).clamp(0.0, 255.0) as u8,
        (color[2] as f32 * shade).clamp(0.0, 255.0) as u8,
    ]
}

fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}
