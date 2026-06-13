export const PARTICLE_SHAPES = {
  FLAME: "flame",
  ORB: "orb"
};

export function flameEffect(overrides = {}) {
  return {
    particleEffect: "FLAME",
    particleShape: PARTICLE_SHAPES.FLAME,
    particleCount: 48,
    spread: 0.022,
    rise: 0.2,
    size: 34,
    speed: 1.5,
    flicker: 0.18,
    colorInner: [1.0, 0.88, 0.42],
    colorOuter: [1.0, 0.32, 0.06],
    ...overrides
  };
}

export function electricOrbEffect(overrides = {}) {
  return {
    particleEffect: "ELECTRIC_GLOW",
    particleShape: PARTICLE_SHAPES.ORB,
    ellipsoid: [1.0, 1.0, 1.0],
    color: [0.76, 0.9, 1.0],
    intensity: 1.8,
    radius: 5.0,
    glowSize: 96,
    flicker: 0.0,
    pickRadius: 0.48,
    ...overrides
  };
}
