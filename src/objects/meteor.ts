import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {GAME_CONFIG} from '../config';
import {CollideEvent} from '../collide';
import {CharacterController} from '../character';
import {TargetRing} from '../effects/targetRing';

type MeteorParams = {
  key: string;
  scene: THREE.Scene;
  world: CANNON.World;
  controller: CharacterController;
  atmosphereRadius: number;
  planetRadius: number;
  groundMaterial: CANNON.Material;
  activeMeteors: Map<string, Meteor>;
  reservedMeteors: Map<string, Meteor>;
  showCoin: (position: THREE.Vector3) => void;
  showHeart: (position: THREE.Vector3) => void;
  ring: TargetRing; // pooled; hidden while reserved, shown while active
  model: THREE.Group; // shared, preloaded template; cloned per instance
  registerPhysicsBody?: (body: CANNON.Body) => void;
  unregisterPhysicsBody?: (body: CANNON.Body) => void;
};

export class Meteor {
  private _mesh: THREE.Group;
  private _body: CANNON.Body;
  private _crash = false;
  private _elite = false;
  private _radius: number = GAME_CONFIG.METEORS.RADIUS_MIN;
  private _speed: number = GAME_CONFIG.METEORS.SPEED_MIN;
  private _altitudeAtShow = 0;
  private _timeActive = 0;
  private _collideHandler: (event: CollideEvent) => void;
  private _showPos = new THREE.Vector3();
  private _hitDir = new THREE.Vector3();

  // Raycast (throttled) against the planet collision mesh so the target ring
  // hugs the actual bumpy surface instead of the perfect-sphere estimate.
  private _rayFrom = new CANNON.Vec3(0, 0, 0);
  private _rayTo = new CANNON.Vec3();
  private _rayOptions: CANNON.RayOptions = {
    collisionFilterGroup: 1,
    collisionFilterMask: 1,
  };
  private _rayResult = new CANNON.RaycastResult();
  private _surfacePoint = new THREE.Vector3();
  private _surfaceNormal = new THREE.Vector3();
  private _hasSurface = false;
  private _surfaceTimer = 0;
  private _ringPos = new THREE.Vector3();
  private _ringNormal = new THREE.Vector3();

  private _scratchUp = new THREE.Vector3();
  private _scratchRand = new THREE.Vector3();
  private _scratchTangent = new THREE.Vector3();
  private _scratchAim = new THREE.Vector3();
  private _steerToPlayer = new THREE.Vector3();
  private _ringImpact = new THREE.Vector3();
  private _player = new THREE.Vector3();

  private constructor(private _params: MeteorParams) {}

  static async create(params: MeteorParams): Promise<Meteor> {
    const meteor = new Meteor(params);
    await meteor._init();
    return meteor;
  }

  private async _init(): Promise<void> {
    const fbx: THREE.Group = this._params.model.clone();
    fbx.traverse(child => {
      child.castShadow = true;
      // Clones share materials with the template by default; give each
      // meteor its own material so elite tinting never leaks across instances.
      if ((child as THREE.Mesh).isMesh) {
        const material = (child as THREE.Mesh).material;
        if (material && !Array.isArray(material)) {
          (child as THREE.Mesh).material = material.clone();
        }
      }
    });

    const {RADIUS_MIN, RADIUS_MAX, RADIUS_EXPECTED_VISUAL_SIZE} = {
      RADIUS_MIN: GAME_CONFIG.METEORS.RADIUS_MIN,
      RADIUS_MAX: GAME_CONFIG.METEORS.RADIUS_MAX,
      RADIUS_EXPECTED_VISUAL_SIZE: GAME_CONFIG.METEORS.EXPECTED_VISUAL_SIZE,
    };
    this._elite = Math.random() < GAME_CONFIG.METEORS.ELITE_CHANCE;

    let radius = RADIUS_MIN + Math.random() * (RADIUS_MAX - RADIUS_MIN);
    if (this._elite) {
      radius = Math.min(
        radius * GAME_CONFIG.METEORS.ELITE_RADIUS_SCALE,
        RADIUS_MAX * GAME_CONFIG.METEORS.ELITE_RADIUS_SCALE,
      );
    }
    this._radius = radius;

    const scale = (2 * radius) / RADIUS_EXPECTED_VISUAL_SIZE;
    fbx.scale.set(scale, scale, scale); // original size is ~5.5
    if (this._elite) {
      fbx.traverse(child => {
        const mesh = child as THREE.Mesh;
        const material = mesh.material as
          THREE.MeshStandardMaterial | THREE.MeshPhongMaterial | undefined;
        if (!mesh.isMesh || !material) return;
        material.emissive = new THREE.Color(0x661111);
        material.emissiveIntensity = 0.8;
        (material as THREE.MeshStandardMaterial).color?.set(0xa02010);
      });
    }
    fbx.updateMatrixWorld(true);

    this._mesh = fbx;

    const sphereShape = new CANNON.Sphere(radius);
    this._body = new CANNON.Body({
      mass: 1000,
      shape: sphereShape,
      material: this._params.groundMaterial,
      // Group 2: collide only with the planet (group 1), so meteors never
      // engage the player physically. Player damage is a distance check.
      collisionFilterGroup: 2,
      collisionFilterMask: 1,
    });

    this._speed =
      GAME_CONFIG.METEORS.SPEED_MIN +
      Math.random() *
        (GAME_CONFIG.METEORS.SPEED_MAX - GAME_CONFIG.METEORS.SPEED_MIN);
    if (this._elite) {
      this._speed *= GAME_CONFIG.METEORS.ELITE_SPEED_SCALE;
    }

    this._collideHandler = (event: CollideEvent) => {
      if (this._crash) return;
      const other = event.body;
      if (!other || other.mass === 1000) return; // ignore meteor-meteor

      this._crash = true;

      if (other.mass === 0) {
        // Drop loot at the real (bumpy) ground under the meteor, not the
        // perfect-sphere radius, so coins/hearts land where the meteor hit.
        this._ringImpact.set(
          this._body.position.x,
          this._body.position.y,
          this._body.position.z,
        );
        if (this._ringImpact.lengthSq() > 1e-9) {
          this._ringImpact.normalize();
          this._surfaceTimer = 0;
          this._raycastSurface();
        }
        if (this._hasSurface) {
          this._showPos.copy(this._surfacePoint);
        } else {
          const length = this._body.position.length();
          if (length > 1e-9) {
            const k = this._params.planetRadius / length;
            this._showPos.set(
              this._body.position.x * k,
              this._body.position.y * k,
              this._body.position.z * k,
            );
          }
        }
        if (this._elite) {
          this._params.showHeart(this._showPos);
        } else {
          this._params.showCoin(this._showPos);
        }
      }
    };
  }

  private _playerPosition(): THREE.Vector3 {
    const p = this._params.controller.body.position;
    return this._player.set(p.x, p.y, p.z);
  }

  public show(): void {
    this._params.reservedMeteors.delete(this._params.key);
    this._params.activeMeteors.set(this._params.key, this);

    this._crash = false;
    this._timeActive = 0;

    const planetRadius = this._params.planetRadius;
    const playerPos = this._playerPosition();

    // 'up' is always the player's radial direction (outward from the
    // origin), wherever they stand on the sphere; jitter is a small tangent
    // offset of the *unit* vector, so the aim stays close to overhead.
    this._scratchUp.copy(playerPos).normalize();
    this._scratchRand.set(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
    );
    this._scratchTangent
      .copy(this._scratchRand)
      .addScaledVector(
        this._scratchUp,
        -this._scratchRand.dot(this._scratchUp),
      );
    if (this._scratchTangent.lengthSq() < 1e-6) {
      this._scratchTangent.set(1, 0, 0);
    }
    this._scratchTangent.normalize();

    const {AIM_JITTER_MIN, AIM_JITTER_MAX} = GAME_CONFIG.METEORS;
    const jitter =
      AIM_JITTER_MIN + Math.random() * (AIM_JITTER_MAX - AIM_JITTER_MIN);
    this._scratchAim
      .copy(this._scratchUp)
      .addScaledVector(this._scratchTangent, jitter)
      .normalize();

    const {
      SPAWN_DIST_MIN,
      SPAWN_DIST_MAX,
      HOMING_CEILING,
      SPIN_SPEED_MIN,
      SPIN_SPEED_MAX,
    } = GAME_CONFIG.METEORS;
    const spawnDist =
      SPAWN_DIST_MIN + Math.random() * (SPAWN_DIST_MAX - SPAWN_DIST_MIN);
    this._altitudeAtShow = Math.max(
      spawnDist - planetRadius,
      HOMING_CEILING * 0.5,
    );

    this._body.position.set(
      this._scratchAim.x * spawnDist,
      this._scratchAim.y * spawnDist,
      this._scratchAim.z * spawnDist,
    );
    this._body.velocity.set(
      -this._scratchAim.x * this._speed,
      -this._scratchAim.y * this._speed,
      -this._scratchAim.z * this._speed,
    );
    this._body.angularVelocity.set(
      SPIN_SPEED_MIN + Math.random() * (SPIN_SPEED_MAX - SPIN_SPEED_MIN) - 1,
      SPIN_SPEED_MIN + Math.random() * (SPIN_SPEED_MAX - SPIN_SPEED_MIN) - 1,
      SPIN_SPEED_MIN + Math.random() * (SPIN_SPEED_MAX - SPIN_SPEED_MIN) - 1,
    );

    // Show the telegraph ring immediately so the player sees where it lands.
    this._showRing();

    this._params.scene.add(this._mesh);
    this._params.world.addBody(this._body);
    this._params.registerPhysicsBody?.(this._body);

    this._body.addEventListener('collide', this._collideHandler);
  }

  private _ringColor(): number {
    return this._elite ? 0xff2233 : 0xffa040;
  }

  private _ringIntensity(): number {
    return this._elite ? 1.35 : 1;
  }

  private _showRing(): void {
    this._hasSurface = false;
    this._surfaceTimer = 0;
    this._refreshRing(0, this._altitudeAtShow);
  }

  public delete(): void {
    this._params.world.removeBody(this._body);
    this._params.unregisterPhysicsBody?.(this._body);
    this._params.scene.remove(this._mesh);
    if (this._collideHandler) {
      this._body.removeEventListener('collide', this._collideHandler);
    }
    this._params.ring.hide();
    this._hasSurface = false;

    this._params.activeMeteors.delete(this._params.key);
    this._params.reservedMeteors.set(this._params.key, this);
  }

  public updatePosition(deltaSeconds: number): void {
    if (!this._mesh || !this._body) return;

    this._mesh.position.set(
      this._body.position.x,
      this._body.position.y,
      this._body.position.z,
    );
    this._mesh.quaternion.set(
      this._body.quaternion.x,
      this._body.quaternion.y,
      this._body.quaternion.z,
      this._body.quaternion.w,
    );

    const length = this._body.position.length();
    const altitude = length - this._params.planetRadius;

    if (!this._crash) {
      this._timeActive += deltaSeconds;
      this._checkPlayerHit();
      this._steerTowardPlayer(deltaSeconds, altitude);
      this._refreshRing(deltaSeconds, altitude);
    } else {
      this._params.ring.hide();
    }

    if (this._crash || length > 1000 || altitude < -20) {
      this.delete();
    }
  }

  private _checkPlayerHit(): void {
    const playerBody = this._params.controller.body;
    const px = playerBody.position.x - this._body.position.x;
    const py = playerBody.position.y - this._body.position.y;
    const pz = playerBody.position.z - this._body.position.z;
    const distSq = px * px + py * py + pz * pz;
    const hitDist = this._radius + GAME_CONFIG.CHARACTER.HIT_RADIUS;
    if (distSq >= hitDist * hitDist) return;

    this._hitDir.set(px, py, pz);
    if (this._hitDir.lengthSq() > 1e-6) {
      this._hitDir.normalize();
    } else {
      this._hitDir.set(0, 1, 0);
    }
    this._params.controller.takeHit(this._hitDir);
  }

  private _steerTowardPlayer(deltaSeconds: number, altitude: number): void {
    const {HOMING_CEILING, HOMING_FLOOR, HOMING_STRENGTH, MAX_SPEED} =
      GAME_CONFIG.METEORS;
    if (deltaSeconds <= 0 || altitude <= 0) return;
    if (altitude > HOMING_CEILING || altitude < HOMING_FLOOR) return;

    const pos = this._body.position;
    const player = this._playerPosition();

    this._steerToPlayer.set(
      player.x - pos.x,
      player.y - pos.y,
      player.z - pos.z,
    );
    if (this._steerToPlayer.lengthSq() < 1e-6) return;
    this._steerToPlayer.normalize();

    const velocity = this._body.velocity;
    const tx = this._steerToPlayer.x;
    const ty = this._steerToPlayer.y;
    const tz = this._steerToPlayer.z;
    const speed = Math.sqrt(
      velocity.x * velocity.x +
        velocity.y * velocity.y +
        velocity.z * velocity.z,
    );
    if (speed < 1e-4) return;

    const targetSpeed = Math.min(speed, MAX_SPEED);
    const steerX = tx * targetSpeed - velocity.x;
    const steerY = ty * targetSpeed - velocity.y;
    const steerZ = tz * targetSpeed - velocity.z;
    const steerLength = Math.sqrt(
      steerX * steerX + steerY * steerY + steerZ * steerZ,
    );
    if (steerLength < 1e-4) return;

    const correction = Math.min(HOMING_STRENGTH * deltaSeconds, steerLength);
    velocity.x += (steerX / steerLength) * correction;
    velocity.y += (steerY / steerLength) * correction;
    velocity.z += (steerZ / steerLength) * correction;

    const correctedSpeed = Math.sqrt(
      velocity.x * velocity.x +
        velocity.y * velocity.y +
        velocity.z * velocity.z,
    );
    if (correctedSpeed > MAX_SPEED) {
      velocity.x *= MAX_SPEED / correctedSpeed;
      velocity.y *= MAX_SPEED / correctedSpeed;
      velocity.z *= MAX_SPEED / correctedSpeed;
    }
  }

  private _refreshRing(deltaSeconds: number, altitude: number): void {
    // Ray-sphere intersection of the current velocity against the planet to
    // predict where the meteor will strike; the ring tracks it as it curves.
    const planetRadius = this._params.planetRadius;
    const impactR = planetRadius + this._radius * 0.5;
    const pos = this._body.position;
    const v = this._body.velocity;

    const a = v.x * v.x + v.y * v.y + v.z * v.z;
    const b = 2 * (pos.x * v.x + pos.y * v.y + pos.z * v.z);
    const c = pos.x * pos.x + pos.y * pos.y + pos.z * pos.z - impactR * impactR;
    const discriminant = b * b - 4 * a * c;

    if (a <= 1e-8 || discriminant < 0) {
      this._params.ring.hide();
      return;
    }

    const t = (-b - Math.sqrt(discriminant)) / (2 * a);
    if (t <= 0) {
      this._params.ring.hide();
      return;
    }

    this._ringImpact.set(pos.x + v.x * t, pos.y + v.y * t, pos.z + v.z * t);
    const impactLength = this._ringImpact.length();
    if (impactLength < 1e-6) {
      this._params.ring.hide();
      return;
    }
    this._ringImpact.multiplyScalar(1 / impactLength);

    const progress = Math.min(
      1,
      1 - altitude / Math.max(1, this._altitudeAtShow),
    );

    // Raycast the predicted impact direction against the real planet mesh
    // (throttled) so the ring sits on the actual bumpy ground with the local
    // slope's normal, rather than floating at the perfect-sphere radius.
    this._surfaceTimer += deltaSeconds;
    if (
      !this._hasSurface ||
      this._surfaceTimer >= GAME_CONFIG.METEORS.SURFACE_RAYCAST_INTERVAL
    ) {
      this._surfaceTimer = 0;
      this._raycastSurface();
    }

    if (this._hasSurface) {
      this._ringPos.copy(this._surfacePoint);
      this._ringNormal.copy(this._surfaceNormal);
    } else {
      this._ringPos
        .copy(this._ringImpact)
        .multiplyScalar(planetRadius + this._radius * 0.5);
      this._ringNormal.copy(this._ringImpact);
    }

    this._params.ring.show(
      this._ringPos,
      this._ringNormal,
      this._radius * 1.8,
      this._ringColor(),
      this._ringIntensity(),
    );
    this._params.ring.update(this._timeActive, progress);
  }

  private _raycastSurface(): void {
    const dir = this._ringImpact;
    const maxDist = this._params.planetRadius * 2;
    this._rayTo.set(dir.x * maxDist, dir.y * maxDist, dir.z * maxDist);
    this._rayResult.reset();
    this._params.world.raycastClosest(
      this._rayFrom,
      this._rayTo,
      this._rayOptions,
      this._rayResult,
    );
    if (!this._rayResult.hasHit) return;

    this._surfacePoint.set(
      this._rayResult.hitPointWorld.x,
      this._rayResult.hitPointWorld.y,
      this._rayResult.hitPointWorld.z,
    );
    this._surfaceNormal.set(
      this._rayResult.hitNormalWorld.x,
      this._rayResult.hitNormalWorld.y,
      this._rayResult.hitNormalWorld.z,
    );
    if (this._surfaceNormal.dot(dir) < 0) {
      this._surfaceNormal.negate();
    }
    this._hasSurface = true;
  }
}
