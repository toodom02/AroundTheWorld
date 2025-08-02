import * as THREE from 'three';
import {CharacterController} from './character';

interface ThirdPersonCameraParams {
  camera: THREE.PerspectiveCamera;
  target: CharacterController;
}

export class ThirdPersonCamera {
  private _camera: THREE.PerspectiveCamera;
  private _target: CharacterController;
  private _currentPosition: THREE.Vector3;
  private _currentLookat: THREE.Vector3;
  private _idealLookat: THREE.Vector3;
  private _idealOffset: THREE.Vector3;

  private _transitionTime = 0;
  private _transitionDuration = 4;
  private _transitioning = false;

  constructor(params: ThirdPersonCameraParams) {
    this._camera = params.camera;
    this._target = params.target;

    this._currentPosition = new THREE.Vector3().copy(this._camera.position);
    this._currentLookat = new THREE.Vector3(0, 0, 0);
    this._idealLookat = new THREE.Vector3();
    this._idealOffset = new THREE.Vector3();
  }

  public startTransition(): void {
    this._transitionTime = 0;
    this._transitioning = true;
  }

  private _CalculateIdealOffset(): THREE.Vector3 {
    this._idealOffset.set(-15, 28, -30);
    this._idealOffset.applyQuaternion(this._target.Rotation);
    this._idealOffset.add(this._target.Position);
    return this._idealOffset;
  }

  private _CalculateIdealLookat(): THREE.Vector3 {
    this._idealLookat.set(0, 18, 50);
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
      const progress = Math.min(this._transitionTime / this._transitionDuration, 1.0);
      t = progress;

      if (progress >= 1.0) {
        this._transitioning = false;
      }
    }

    this._currentPosition.lerp(idealOffset, t);
    this._currentLookat.lerp(idealLookat, t);

    this._camera.up.copy(this._target.Position)
      .normalize();

    this._camera.position.copy(this._currentPosition);
    this._camera.lookAt(this._currentLookat);
  }
}
