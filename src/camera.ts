import * as THREE from 'three';
import {GAME_CONFIG} from './config';
import {CharacterController} from './character';

type ThirdPersonCameraParams = {
  camera: THREE.PerspectiveCamera;
  target: CharacterController;
};

export class ThirdPersonCamera {
  private _camera: THREE.PerspectiveCamera;
  private _target: CharacterController;
  private _currentPosition: THREE.Vector3;
  private _currentLookat: THREE.Vector3;
  private _idealLookat: THREE.Vector3;
  private _idealOffset: THREE.Vector3;
  private _cameraUp: THREE.Vector3;

  private _transitionTime = 0;
  private _transitionDuration = GAME_CONFIG.CAMERA.TRANSITION_DURATION;
  private _transitioning = false;

  private _shakeTrauma = 0;
  private _shakeTime = 0;

  constructor(params: ThirdPersonCameraParams) {
    this._camera = params.camera;
    this._target = params.target;

    this._currentPosition = new THREE.Vector3().copy(this._camera.position);
    this._currentLookat = new THREE.Vector3(0, 0, 0);
    this._idealLookat = new THREE.Vector3();
    this._idealOffset = new THREE.Vector3();
    this._cameraUp = new THREE.Vector3();
  }

  public startTransition(): void {
    this._transitionTime = 0;
    this._transitioning = true;
  }

  public shake(strength: number): void {
    this._shakeTrauma = Math.min(1, this._shakeTrauma + strength);
  }

  private _CalculateIdealOffset(): THREE.Vector3 {
    const {x, y, z} = GAME_CONFIG.CAMERA.OFFSET;
    this._idealOffset.set(x, y, z);
    this._idealOffset.applyQuaternion(this._target.Rotation);
    this._idealOffset.add(this._target.Position);
    return this._idealOffset;
  }

  private _CalculateIdealLookat(): THREE.Vector3 {
    const {x, y, z} = GAME_CONFIG.CAMERA.LOOKAT_OFFSET;
    this._idealLookat.set(x, y, z);
    this._idealLookat.applyQuaternion(this._target.Rotation);
    this._idealLookat.add(this._target.Position);
    return this._idealLookat;
  }

  Update(timeElapsed: number): void {
    const idealOffset = this._CalculateIdealOffset();
    const idealLookat = this._CalculateIdealLookat();

    let t = 1.0 - Math.pow(0.001, timeElapsed);

    if (this._transitioning) {
      this._transitionTime += timeElapsed;
      const progress = Math.min(
        this._transitionTime / this._transitionDuration,
        1.0,
      );
      t = progress;

      if (progress >= 1.0) {
        this._transitioning = false;
      }
    }

    this._currentPosition.lerp(idealOffset, t);
    this._currentLookat.lerp(idealLookat, t);

    this._cameraUp.copy(this._target.Position).normalize();
    this._camera.up.copy(this._cameraUp);

    this._camera.position.copy(this._currentPosition);
    this._camera.lookAt(this._currentLookat);

    this._shakeTrauma = Math.max(
      0,
      this._shakeTrauma - GAME_CONFIG.EFFECTS.SHAKE_DECAY_PER_SEC * timeElapsed,
    );
    this._shakeTime += timeElapsed;
    const shaking = this._shakeTrauma * this._shakeTrauma;
    if (shaking > 1e-4) {
      const amp = GAME_CONFIG.EFFECTS.SHAKE_MAX_OFFSET * shaking;
      const t = this._shakeTime;
      this._camera.position.x += amp * Math.sin(t * 83.1 + 12.7);
      this._camera.position.y += amp * Math.sin(t * 61.7 + 40.2);
      this._camera.position.z += amp * Math.sin(t * 97.3 + 62.9);
    }
  }
}
