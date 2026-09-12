/**
 * Centralized game configuration and constants.
 */

export const GAME_CONFIG = {
  CHARACTER: {
    BODY_RADIUS: 8,
    VELOCITY_FACTOR: 1.5,
    JUMP_FORCE: 5000000,
    JUMP_DURATION: 0.2,
    MAX_HEALTH: 3,
    IFRAMES_DURATION: 1.5,
    KNOCKBACK_STRENGTH: 120,
    HIT_RADIUS: 6, // player hitbox radius used for damage checks
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
    INITIAL_COUNT: 3,
    MAX_COUNT: 15,
    INCREASE_INTERVAL: 10000,
    SPAWN_INTERVAL: 1000, // min ms between spawns (meteors die fast now)
    RADIUS_MIN: 5,
    RADIUS_MAX: 15,
    EXPECTED_VISUAL_SIZE: 5.5, // FBX model original size
    // Spawn is aimed at (near) the player so meteors are an actual threat.
    // 'up' is always the player's radial direction (outward from origin);
    // jitter offsets are unit-vector tangent amounts (≈ tan of the angle),
    // so 0.12–0.4 rad ≈ 12–40 units along the surface on a radius-100 planet.
    SPAWN_DIST_MIN: 200, // planet radius + atmosphere radius
    SPAWN_DIST_MAX: 320,
    AIM_JITTER_MIN: 0.12,
    AIM_JITTER_MAX: 0.4,
    SPEED_MIN: 105,
    SPEED_MAX: 165,
    MAX_SPEED: 200,
    SPIN_SPEED_MIN: 1,
    SPIN_SPEED_MAX: 5,
    // Gentle homing keeps meteors threatening while the player dodges.
    HOMING_CEILING: 250, // altitude below which homing is applied
    HOMING_FLOOR: 45, // altitude below which meteors go ballistic (fairer)
    HOMING_STRENGTH: 42, // max lateral velocity gain per second (u/s^2)
    SURFACE_RAYCAST_INTERVAL: 0.25, // seconds between terrain raycasts per meteor
    // Red/elite variant: larger, faster, drops a heart on impact.
    ELITE_CHANCE: 0.15,
    ELITE_RADIUS_SCALE: 1.6,
    ELITE_SPEED_SCALE: 1.3,
  },
  HEARTS: {
    MAX_HEARTS: 8,
    COLLECTION_DISTANCE_SQUARED: 64, // 8 * 8
    SPIN_RATE: Math.PI / 180,
    LIFETIME_MS: 15000, // auto-despawn, freeing the pooled slot again
  },
  COINS: {
    MAX_COINS: 20,
    COLLECTION_DISTANCE_SQUARED: 64, // 8 * 8
    SPIN_RATE: Math.PI / 180,
    LIFETIME_MS: 20000, // auto-despawn, freeing the pooled slot again
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
