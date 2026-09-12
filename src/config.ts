/**
 * Centralized game configuration and constants.
 */

export const GAME_CONFIG = {
  CHARACTER: {
    BODY_RADIUS: 8,
    VELOCITY_FACTOR: 1.5,
    JUMP_FORCE: 5000000,
    JUMP_DURATION: 0.2,
  },
  CAMERA: {
    TRANSITION_DURATION: 4,
    OFFSET: {x: -15, y: 28, z: -30},
    LOOKAT_OFFSET: {x: 0, y: 18, z: 50},
  },
  PHYSICS: {
    GRAVITY_STRENGTH: 1,
    PLANET_RADIUS: 100,
    ATMOSPHERE_RADIUS: 100,
    GRAVITY_FORCE_SCALE: 300,
    VELOCITY_DAMPING: 0.8,
  },
  METEORS: {
    INITIAL_COUNT: 5,
    MAX_COUNT: 25,
    INCREASE_INTERVAL: 7500,
    RADIUS_MIN: 5,
    RADIUS_MAX: 15,
    EXPECTED_VISUAL_SIZE: 5.5, // FBX model original size
  },
  COINS: {
    MAX_COINS: 20,
    COLLECTION_DISTANCE_SQUARED: 64, // 8 * 8
    SPIN_RATE: Math.PI / 180,
  },
  RENDERING: {
    SHADOW_MAP_SIZE: 1024,
    SHADOW_MAP_SIZE_MOBILE: 512,
    DEFAULT_PIXEL_RATIO_CAP: 2,
    // Tier 0 = high, 1 = medium, 2 = low (adaptive quality scaling).
    QUALITY_TIERS: {
      MIN_FPS_LOW: 40, // sustained fps below this lowers the tier
      MIN_FPS_HIGH: 55, // sustained fps above this may raise the tier
      TIER_MS: 2000, // window (ms) over which fps is averaged
      PIXEL_RATIOS: [2, 1, 1],
      SHADOW_MAP_SIZES: [1024, 512, 256],
    },
    QUALITY_STORAGE_KEY: 'atw-quality-tier',
  },
  OUT_OF_BOUNDS_DISTANCE: 250,
} as const;
