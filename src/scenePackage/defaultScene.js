import { electricOrbEffect, flameEffect } from "../share/particleEffects.js";
import defaultSceneBundleUrl from "./defaultScene.bundle?url";

export const DEFAULT_SCENE = {
  id: "default-room-gallery",
  resourceBundle: {
    id: "default-room-gallery",
    version: 1,
    format: "ngb-deflate-v1",
    url: defaultSceneBundleUrl
  },
  textureSize: 128,
  layout: {
    columns: 12,
    spacing: 1.9,
    startZ: 2.4,
    rowSpacing: 1.65,
    groundClearance: 0.08,
    compactScale: 0.95,
    defaultScale: 1.1
  },
  materials: {
    default: {
      reflectivity: 0.1,
      roughness: 0.72,
      fresnel: 0.42,
      envIntensity: 0.55
    },
    textured: {
      reflectivity: 0.14,
      roughness: 0.64,
      fresnel: 0.36,
      envIntensity: 0.58
    },
    floor: {
      reflectivity: 0.32,
      roughness: 0.48,
      fresnel: 0.7,
      envIntensity: 0.68
    },
    overrides: {
      "Monitor.glb": {
        reflectivity: 0.28,
        roughness: 0.34,
        fresnel: 0.64,
        envIntensity: 0.9
      },
      "Computer.glb": {
        reflectivity: 0.22,
        roughness: 0.42,
        fresnel: 0.58,
        envIntensity: 0.78
      },
      "Wine Glass.glb": {
        reflectivity: 0.46,
        roughness: 0.18,
        fresnel: 0.86,
        envIntensity: 1.0
      },
      "Trophy.glb": {
        reflectivity: 0.36,
        roughness: 0.25,
        fresnel: 0.72,
        envIntensity: 0.92
      }
    }
  },
  resources: [
    "Stool.glb",
    "Baseball Bat.glb",
    "Present.glb",
    "Stapler.glb",
    "Bed.glb",
    "Cup Of Tea.glb",
    "Painting.glb",
    "Ladder.glb",
    "Desk Fan.glb",
    "Closed Umbrella.glb",
    "Table Large Circular.glb",
    "Hamburger.glb",
    "Toolbox.glb",
    "Bird House.glb",
    "Hair Dryer.glb",
    "Hand Saw.glb",
    "Couch.glb",
    "Desk Lamp.glb",
    "Mailbox.glb",
    "Safe.glb",
    "Chips.glb",
    "Tissue Box.glb",
    "Cabinet.glb",
    "Books.glb",
    "Propane Tank.glb",
    "Bathtub.glb",
    "Flowers.glb",
    "Telescope.glb",
    "Trash Bin.glb",
    "Jar.glb",
    "Desk.glb",
    "Mug With Office Tool.glb",
    "Empty Box.glb",
    "Barbecue.glb",
    "Rocking Chair.glb",
    "Rubber Duck.glb",
    "Headphones.glb",
    "Bathroom Sink.glb",
    "Fruit Bowl.glb",
    "Ceiling Fan.glb",
    "Potted Plant.glb",
    "Trophy.glb",
    "Bookshelf.glb",
    "Printer.glb",
    "Hoe.glb",
    "Coat Rack.glb",
    "Piggy Bank.glb",
    "Table.glb",
    "Pumpkin.glb",
    "Treadmill.glb",
    "Watering Can.glb",
    "Wall Corkboard.glb",
    "Wrench.glb",
    "Toilet.glb",
    "Candlestick.glb",
    "Refrigirator.glb",
    "Computer.glb",
    "Hand Rake.glb",
    "Dresser.glb",
    "Hammer.glb",
    "Lamp With Shade.glb",
    "Dumbbell.glb",
    "Grandfathers Clock.glb",
    "Globe.glb",
    "End Table.glb",
    "Wine Glass.glb",
    "Stove.glb",
    "Caldron.glb",
    "Frying Pan.glb",
    "Chandelier.glb",
    "Doll.glb",
    "Chair.glb",
    "Monitor.glb",
    "Screwdriver.glb",
    "Mouse.glb"
  ],
  effects: {
    "Candlestick.glb": {
      flame: flameEffect({
        localPosition: [0, 0.95, 0],
        particleCount: 58,
        spread: 0.024,
        rise: 0.24,
        size: 42,
        speed: 1.55,
        flicker: 0.18,
        colorInner: [1.0, 0.86, 0.35],
        colorOuter: [1.0, 0.28, 0.05]
      }),
      softLight: {
        color: [1.0, 0.48, 0.16],
        intensity: 1.55,
        radius: 5.2,
        glowSize: 118,
        flicker: 0.22,
        pickRadius: 0.42
      }
    },
    "Chandelier.glb": {
      flame: flameEffect({
        localPositions: [
          [0.46, 0.62, 0],
          [0.33, 0.62, 0.33],
          [0, 0.62, 0.46],
          [-0.33, 0.62, 0.33],
          [-0.46, 0.62, 0],
          [-0.33, 0.62, -0.33],
          [0, 0.62, -0.46],
          [0.33, 0.62, -0.33]
        ],
        particleCount: 18,
        spread: 0.02,
        rise: 0.16,
        size: 28,
        speed: 1.45,
        flicker: 0.16,
        colorInner: [1.0, 0.9, 0.48],
        colorOuter: [1.0, 0.36, 0.08]
      }),
      softLight: {
        color: [1.0, 0.55, 0.22],
        intensity: 0.42,
        radius: 2.8,
        glowSize: 72,
        flicker: 0.24,
        pickRadius: 0.28
      }
    },
    "Desk Lamp.glb": {
      electricLight: electricOrbEffect({
        localPosition: [0, 0.82, 0.08],
        ellipsoid: [1.0, 1.0, 1.0],
        color: [0.72, 0.88, 1.0],
        intensity: 2.25,
        radius: 5.6,
        glowSize: 92,
        flicker: 0.0,
        pickRadius: 0.48
      })
    },
    "Lamp With Shade.glb": {
      electricLight: electricOrbEffect({
        localPosition: [0, 0.78, 0],
        ellipsoid: [1.15, 0.9, 1.0],
        color: [1.0, 0.76, 0.42],
        intensity: 1.45,
        radius: 4.8,
        glowSize: 118,
        flicker: 0.0,
        pickRadius: 0.5
      }),
      shadeTransmission: {
        color: [0.34, 0.52, 1.0],
        strength: 0.62,
        alpha: 0.66
      }
    }
  }
};
