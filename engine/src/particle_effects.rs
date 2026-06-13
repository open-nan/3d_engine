pub const NONE: u32 = 0;
pub const FLAME: u32 = 1;
pub const ELECTRIC_GLOW: u32 = 2;

#[no_mangle]
pub extern "C" fn particle_effect_none() -> u32 {
    NONE
}

#[no_mangle]
pub extern "C" fn particle_effect_flame() -> u32 {
    FLAME
}

#[no_mangle]
pub extern "C" fn particle_effect_electric_glow() -> u32 {
    ELECTRIC_GLOW
}
