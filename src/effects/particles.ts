import * as THREE from 'three';
import {GAME_CONFIG} from '../config';

// RingGeometry lies in the XY plane, so its plane-normal is +Z.
const Z_AXIS = new THREE.Vector3(0, 0, 1);

type ParticleEffectsParams = {
  scene: THREE.Scene;
};

type RingFx = {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
  fromScale: number;
  toScale: number;
};

const PARTICLE_VERTEX_SHADER = `
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(aSize * (600.0 / -mvPosition.z), 1.0, 48.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const PARTICLE_FRAGMENT_SHADER = `
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float alpha = 1.0 - smoothstep(0.05, 0.5, d);
    gl_FragColor = vec4(vColor, alpha);
  }
`;

export class ParticleEffects {
  private _points: THREE.Points;
  private _geometry: THREE.BufferGeometry;
  private _positions: Float32Array;
  private _colors: Float32Array;
  private _sizes: Float32Array;

  private _velocities: Float32Array;
  private _baseColors: Float32Array;
  private _maxLives: Float32Array;
  private _lives: Float32Array;
  private _baseSizes: Float32Array;
  private _cursor = 0;

  private _rings: RingFx[] = [];
  private _ringCursor = 0;

  private _normal = new THREE.Vector3();
  private _tangent = new THREE.Vector3();
  private _rand = new THREE.Vector3();
  private _tmp = new THREE.Vector3();
  private _ringQuat = new THREE.Quaternion();

  constructor(params: ParticleEffectsParams) {
    const budget = GAME_CONFIG.EFFECTS.PARTICLE_BUDGET;
    this._positions = new Float32Array(budget * 3);
    this._colors = new Float32Array(budget * 3);
    this._sizes = new Float32Array(budget);
    this._baseColors = new Float32Array(budget * 3);
    this._velocities = new Float32Array(budget * 3);
    this._maxLives = new Float32Array(budget);
    this._lives = new Float32Array(budget);
    this._baseSizes = new Float32Array(budget);

    this._geometry = new THREE.BufferGeometry();
    this._geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this._positions, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    this._geometry.setAttribute(
      'aColor',
      new THREE.BufferAttribute(this._colors, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    this._geometry.setAttribute(
      'aSize',
      new THREE.BufferAttribute(this._sizes, 1).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );

    const material = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERTEX_SHADER,
      fragmentShader: PARTICLE_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this._points = new THREE.Points(this._geometry, material);
    this._points.frustumCulled = false;
    this._points.renderOrder = 20;
    params.scene.add(this._points);

    for (let i = 0; i < GAME_CONFIG.EFFECTS.SHOCKWAVE_COUNT; i++) {
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xffc070,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(
        new THREE.RingGeometry(0.72, 1, 40),
        ringMaterial,
      );
      mesh.visible = false;
      mesh.renderOrder = 15;
      params.scene.add(mesh);
      this._rings.push({
        mesh,
        material: ringMaterial,
        life: 0,
        maxLife: 0,
        fromScale: 0,
        toScale: 0,
      });
    }
  }

  public burst(
    position: THREE.Vector3,
    normal: THREE.Vector3,
    radius: number,
    elite: boolean,
  ): void {
    const sparkCount = elite ? 42 : 26;
    const smokeCount = 6;

    this._normal.copy(normal).normalize();
    if (this._normal.lengthSq() < 1e-6) this._normal.set(0, 1, 0);

    for (let i = 0; i < sparkCount + smokeCount; i++) {
      const isSmoke = i >= sparkCount;
      const slot = this._cursor++ % GAME_CONFIG.EFFECTS.PARTICLE_BUDGET;
      const i3 = slot * 3;

      this._rand.set(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
      );
      // Remove the height component so the random direction is tangent to the
      // surface, then bias upward for a hemi-sphere scatter.
      this._tangent
        .copy(this._rand)
        .addScaledVector(this._normal, -this._rand.dot(this._normal));
      if (this._tangent.lengthSq() < 1e-6) this._tangent.set(1, 0, 0);
      this._tangent.normalize();

      const upAmount = isSmoke
        ? 0.15 + Math.random() * 0.25
        : 0.35 + Math.random() * 0.6;
      const sideAmount = Math.random() * (isSmoke ? 0.25 : 1.1);
      this._tmp
        .copy(this._normal)
        .multiplyScalar(upAmount)
        .addScaledVector(this._tangent, sideAmount)
        .normalize();

      const speed =
        (isSmoke ? 10 + Math.random() * 12 : 26 + Math.random() * 34) *
        (0.6 + radius / (GAME_CONFIG.METEORS.RADIUS_MAX * 1.2));
      this._velocities[i3] = this._tmp.x * speed;
      this._velocities[i3 + 1] = this._tmp.y * speed;
      this._velocities[i3 + 2] = this._tmp.z * speed;

      this._maxLives[slot] = isSmoke
        ? 0.7 + Math.random() * 0.6
        : 0.35 + Math.random() * 0.45;
      this._lives[slot] = 0;

      this._baseSizes[slot] = isSmoke
        ? 10 + Math.random() * 8
        : 5 + Math.random() * 6;
      this._sizes[slot] = this._baseSizes[slot];

      if (isSmoke) {
        const s = 0.55 + Math.random() * 0.3;
        this._baseColors[i3] = 0.5 * s;
        this._baseColors[i3 + 1] = 0.34 * s;
        this._baseColors[i3 + 2] = 0.22 * s;
      } else if (elite) {
        const s = 0.8 + Math.random() * 0.4;
        this._baseColors[i3] = 1.0 * s;
        this._baseColors[i3 + 1] = 0.35 * s;
        this._baseColors[i3 + 2] = 0.12 * s;
      } else {
        const s = 0.7 + Math.random() * 0.5;
        this._baseColors[i3] = 1.0 * s;
        this._baseColors[i3 + 1] = 0.55 * s;
        this._baseColors[i3 + 2] = 0.18 * s;
      }
      this._colors[i3] = this._baseColors[i3];
      this._colors[i3 + 1] = this._baseColors[i3 + 1];
      this._colors[i3 + 2] = this._baseColors[i3 + 2];

      const spread = 0.8 + radius * 0.06;
      this._positions[i3] = position.x + (Math.random() - 0.5) * spread;
      this._positions[i3 + 1] = position.y + (Math.random() - 0.5) * spread;
      this._positions[i3 + 2] = position.z + (Math.random() - 0.5) * spread;
    }

    // Expanding shockwave ring.
    const fx = this._rings[this._ringCursor++ % this._rings.length];
    fx.life = 0;
    fx.maxLife = GAME_CONFIG.EFFECTS.SHOCKWAVE_LIFETIME;
    fx.fromScale = Math.max(1, radius * 0.5);
    fx.toScale = radius * 2.4;
    fx.material.color.setHex(elite ? 0xff5533 : 0xffc070);
    this._ringQuat.setFromUnitVectors(Z_AXIS, this._normal);
    fx.mesh.quaternion.copy(this._ringQuat);
    fx.mesh.position.copy(position).addScaledVector(this._normal, 0.4);
    fx.mesh.visible = true;
  }

  public update(deltaSeconds: number): void {
    if (deltaSeconds <= 0) return;

    const budget = GAME_CONFIG.EFFECTS.PARTICLE_BUDGET;
    const drag =
      1 - Math.min(1, GAME_CONFIG.EFFECTS.PARTICLE_DRAG * deltaSeconds);
    const gravity = GAME_CONFIG.EFFECTS.PARTICLE_GRAVITY;
    let dirty = false;

    for (let slot = 0; slot < budget; slot++) {
      if (this._maxLives[slot] <= 0) continue;
      dirty = true;
      const i3 = slot * 3;

      this._lives[slot] += deltaSeconds;
      const progress = this._lives[slot] / this._maxLives[slot];

      if (progress >= 1) {
        this._maxLives[slot] = 0;
        this._sizes[slot] = 0;
        this._colors[i3] = 0;
        this._colors[i3 + 1] = 0;
        this._colors[i3 + 2] = 0;
        continue;
      }

      // Simple Euler + radial gravity pulled toward the planet center.
      const px = this._positions[i3];
      const py = this._positions[i3 + 1];
      const pz = this._positions[i3 + 2];
      const length = Math.sqrt(px * px + py * py + pz * pz);
      if (length > 1e-6) {
        this._velocities[i3] -= (px / length) * gravity * deltaSeconds;
        this._velocities[i3 + 1] -= (py / length) * gravity * deltaSeconds;
        this._velocities[i3 + 2] -= (pz / length) * gravity * deltaSeconds;
      }
      this._velocities[i3] *= drag;
      this._velocities[i3 + 1] *= drag;
      this._velocities[i3 + 2] *= drag;

      this._positions[i3] += this._velocities[i3] * deltaSeconds;
      this._positions[i3 + 1] += this._velocities[i3 + 1] * deltaSeconds;
      this._positions[i3 + 2] += this._velocities[i3 + 2] * deltaSeconds;

      const fade = 1 - progress;
      this._sizes[slot] = this._baseSizes[slot] * Math.max(0.1, fade);
      this._colors[i3] = this._baseColors[i3] * fade;
      this._colors[i3 + 1] = this._baseColors[i3 + 1] * fade;
      this._colors[i3 + 2] = this._baseColors[i3 + 2] * fade;
    }

    for (const fx of this._rings) {
      if (!fx.mesh.visible) continue;
      fx.life += deltaSeconds;
      const p = fx.life / fx.maxLife;
      if (p >= 1) {
        fx.mesh.visible = false;
        fx.material.opacity = 0;
        continue;
      }
      fx.mesh.scale.setScalar(fx.fromScale + (fx.toScale - fx.fromScale) * p);
      fx.material.opacity = (1 - p) * (1 - p) * 0.55;
    }

    const positionAttr = this._geometry.getAttribute(
      'position',
    ) as THREE.BufferAttribute;
    const colorAttr = this._geometry.getAttribute(
      'aColor',
    ) as THREE.BufferAttribute;
    const sizeAttr = this._geometry.getAttribute(
      'aSize',
    ) as THREE.BufferAttribute;
    if (dirty) {
      positionAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
    }
  }

  public reset(): void {
    this._maxLives.fill(0);
    this._lives.fill(0);
    this._sizes.fill(0);
    this._colors.fill(0);
    this._cursor = 0;
    this._ringCursor = 0;
    for (const fx of this._rings) {
      fx.life = 0;
      fx.maxLife = 0;
      fx.mesh.visible = false;
      fx.material.opacity = 0;
    }
    const positionAttr = this._geometry.getAttribute(
      'position',
    ) as THREE.BufferAttribute;
    const colorAttr = this._geometry.getAttribute(
      'aColor',
    ) as THREE.BufferAttribute;
    const sizeAttr = this._geometry.getAttribute(
      'aSize',
    ) as THREE.BufferAttribute;
    positionAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }

  public dispose(): void {
    this._points.parent?.remove(this._points);
    this._geometry.dispose();
    (this._points.material as THREE.Material).dispose();
    for (const fx of this._rings) {
      fx.mesh.parent?.remove(fx.mesh);
      fx.mesh.geometry.dispose();
      fx.material.dispose();
    }
  }
}
