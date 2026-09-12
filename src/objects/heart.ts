import * as THREE from 'three';
import {CharacterController} from '../character';
import {AudioManager} from '../audio';
import {GAME_CONFIG} from '../config';

type HeartParams = {
  key: string;
  scene: THREE.Scene;
  controller: CharacterController;
  activeHearts: Map<string, Heart>;
  reservedHearts: Map<string, Heart>;
  onCollect: (position: THREE.Vector3) => void;
  audio: AudioManager;
};

/**
 * Heart pickup dropped by elite meteors. Stands upright on the ground and
 * turns to face the player so it reads clearly as a collectible; restores one
 * HP on collection.
 */
export class Heart {
  private _mesh: THREE.Mesh;
  private _lifeTimer = 0;
  private _birthTime = 0;
  private _groundOffset = 0;
  private _basePoint = new THREE.Vector3();
  private _basis = new THREE.Matrix4();
  private _up = new THREE.Vector3();
  private _toPlayer = new THREE.Vector3();
  private _tangent = new THREE.Vector3();
  private _xAxis = new THREE.Vector3();
  private _refA = new THREE.Vector3(0, 1, 0);
  private _refB = new THREE.Vector3(1, 0, 0);

  private constructor(private _params: HeartParams) {}

  static create(params: HeartParams): Heart {
    const heart = new Heart(params);
    heart._init();
    return heart;
  }

  private _init(): void {
    this._mesh = Heart._createMesh();
    this._mesh.geometry.computeBoundingBox();
    // The mesh origin sits mid-heart; lift the base so the pointy bottom
    // rests on the ground (bbox is unscaled, so account for scale here).
    const minY = this._mesh.geometry.boundingBox?.min.y ?? 0;
    this._groundOffset = -minY * 4;
  }

  private static _createMesh(): THREE.Mesh {
    const shape = new THREE.Shape();
    shape.moveTo(0.5, 0.5);
    shape.bezierCurveTo(0.5, 0.5, 0.4, 0, 0, 0);
    shape.bezierCurveTo(-0.6, 0, -0.6, 0.7, -0.6, 0.7);
    shape.bezierCurveTo(-0.6, 1.1, -0.3, 1.54, 0.5, 1.9);
    shape.bezierCurveTo(1.2, 1.54, 1.6, 1.1, 1.6, 0.7);
    shape.bezierCurveTo(1.6, 0.7, 1.6, 0, 1.0, 0);
    shape.bezierCurveTo(0.7, 0, 0.5, 0.5, 0.5, 0.5);

    // Extrusion lies in the XY plane with its face normal on +Z. The shape
    // path draws the pointy end at +Y, so flip it so the lobes point up; the
    // pickup then stands with +Y along the surface normal and reads upright.
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.35,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.12,
      bevelSegments: 3,
    });
    geometry.rotateZ(Math.PI);
    const material = new THREE.MeshPhongMaterial({
      color: 0xff2255,
      emissive: 0x881122,
      emissiveIntensity: 0.8,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.scale.setScalar(4);
    return mesh;
  }

  public show(position: THREE.Vector3): void {
    this._params.reservedHearts.delete(this._params.key);
    this._birthTime = performance.now();

    const up = this._up.copy(position).normalize();
    this._basePoint
      .copy(position)
      .addScaledVector(up, this._groundOffset + 0.2);

    this._facePlayer();
    this._mesh.position.copy(this._basePoint);

    this._params.scene.add(this._mesh);
    this._params.activeHearts.set(this._params.key, this);
  }

  public hide(): void {
    this._params.activeHearts.delete(this._params.key);
    this._params.scene.remove(this._mesh);
    this._params.reservedHearts.set(this._params.key, this);
  }

  public animate(): void {
    this._lifeTimer += 1 / 60;

    this._facePlayer();

    // Gentle bob along the local "up" (radial) so it reads as a float pickup.
    const up = this._up.set(
      this._basePoint.x,
      this._basePoint.y,
      this._basePoint.z,
    );
    const bob = Math.sin(this._lifeTimer * 3) * 0.8;
    this._mesh.position
      .copy(this._basePoint)
      .addScaledVector(up.normalize(), bob);

    const playerPos = this._params.controller.body.position;
    const heartPos = this._mesh.position;
    const dx = heartPos.x - playerPos.x;
    const dy = heartPos.y - playerPos.y;
    const dz = heartPos.z - playerPos.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const threshold = GAME_CONFIG.HEARTS.COLLECTION_DISTANCE_SQUARED;
    if (distSq < threshold) {
      this._params.audio.play('heart', 0.8);
      this.hide();
      this._params.onCollect(this._mesh.position);
      return;
    }

    // Uncollected hearts fade back to the pool so elite meteors can keep
    // dropping them.
    if (performance.now() - this._birthTime >= GAME_CONFIG.HEARTS.LIFETIME_MS) {
      this.hide();
    }
  }

  private _facePlayer(): void {
    const playerPos = this._params.controller.body.position;
    this._toPlayer
      .set(playerPos.x, playerPos.y, playerPos.z)
      .sub(this._basePoint);

    const up = this._up.copy(this._basePoint).normalize();

    // Remove the radial component so the heart faces tangentially (upright)
    // toward the player rather than leaning toward the sky.
    this._tangent
      .copy(this._toPlayer)
      .addScaledVector(up, -up.dot(this._toPlayer));
    if (this._tangent.lengthSq() < 1e-6) {
      // Player is directly above/below the heart; build an arbitrary tangent.
      const ref = Math.abs(up.y) < 0.99 ? this._refA : this._refB;
      this._tangent.crossVectors(up, ref);
    }
    this._tangent.normalize();

    // Right = up × face. Re-deriving the tangent from the cross product keeps
    // the basis orthonormal regardless of the raw direction's perpendicularity.
    this._xAxis.crossVectors(up, this._tangent).normalize();
    this._tangent.crossVectors(this._xAxis, up);

    this._basis.makeBasis(this._xAxis, up, this._tangent);
    this._mesh.quaternion.setFromRotationMatrix(this._basis);
  }
}
