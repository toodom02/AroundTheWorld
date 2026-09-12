import * as THREE from 'three';

// RingGeometry lies in the XY plane, so its plane-normal is +Z. Aligning Z
// with the surface normal keeps the ring flat on the planet at any latitude.
const Z_AXIS = new THREE.Vector3(0, 0, 1);

type TargetRingParams = {
  scene: THREE.Scene;
};

export class TargetRing {
  private _mesh: THREE.Mesh;
  private _material: THREE.MeshBasicMaterial;
  private _baseOpacity = 0;
  private _targetPos = new THREE.Vector3();
  private _targetNormal = new THREE.Vector3(0, 1, 0);
  private _targetScale = 1;
  private _hasTarget = false;
  private _targetQuat = new THREE.Quaternion();
  private _lerpTarget = new THREE.Vector3();

  constructor(params: TargetRingParams) {
    const geometry = new THREE.RingGeometry(0.62, 1, 48);
    this._material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this._mesh = new THREE.Mesh(geometry, this._material);
    this._mesh.visible = false;
    this._mesh.renderOrder = 10;
    params.scene.add(this._mesh);
  }

  public show(
    point: THREE.Vector3,
    normal: THREE.Vector3,
    ringRadius: number,
    color: number,
    intensity = 1,
  ): void {
    this._baseOpacity = 0.4 * intensity;
    this._material.color.setHex(color);
    this._targetPos.copy(point);
    this._targetNormal.copy(normal);
    if (this._targetNormal.lengthSq() < 1e-8) {
      this._targetNormal.set(0, 1, 0);
    } else {
      this._targetNormal.normalize();
    }
    this._targetScale = ringRadius;
    this._hasTarget = true;
    this._mesh.visible = true;
  }

  public update(timeSeconds: number, progress: number): void {
    if (!this._mesh.visible || !this._hasTarget) return;

    // Small lift above the terrain so the ring never z-fights the ground.
    this._lerpTarget
      .copy(this._targetPos)
      .addScaledVector(this._targetNormal, 1.25);
    this._mesh.position.lerp(this._lerpTarget, 0.3);
    this._targetQuat.setFromUnitVectors(Z_AXIS, this._targetNormal);
    this._mesh.quaternion.slerp(this._targetQuat, 0.35);
    this._mesh.scale.setScalar(this._targetScale);

    const fade = THREE.MathUtils.clamp(progress * 1.8 + 0.12, 0, 1);
    const pulse = 0.7 + 0.3 * Math.sin(timeSeconds * 8);
    const targetOpacity = this._baseOpacity * fade * pulse;
    this._material.opacity += (targetOpacity - this._material.opacity) * 0.35;
    this._mesh.visible = this._material.opacity > 0.015;
  }

  public hide(): void {
    this._mesh.visible = false;
    this._material.opacity = 0;
    this._hasTarget = false;
  }

  public dispose(): void {
    this._mesh.parent?.remove(this._mesh);
    this._mesh.geometry.dispose();
    this._material.dispose();
  }
}
