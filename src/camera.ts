import * as THREE from 'three';
import {CharacterController} from './character';

export class ThirdPersonCamera {
  _camera: THREE.PerspectiveCamera;
  _target: CharacterController;
  _currentPosition: THREE.Vector3;
  _currentLookat: THREE.Vector3;
  _idealLookat: THREE.Vector3;
  _idealOffset: THREE.Vector3;
  constructor(params: {
    camera: THREE.PerspectiveCamera;
    target: CharacterController;
  }) {
    this._camera = params.camera;
    this._target = params.target;

    this._currentPosition = new THREE.Vector3();
    this._currentLookat = new THREE.Vector3();
    this._idealLookat = new THREE.Vector3();
    this._idealOffset = new THREE.Vector3();
  }

  _CalculateIdealOffset() {
    this._idealOffset.set(-15, 20, -30);
    this._idealOffset.applyQuaternion(this._target.Rotation);
    this._idealOffset.add(
      new THREE.Vector3(
        this._target.Position.x,
        this._target.Position.y,
        this._target.Position.z,
      ),
    );
    return this._idealOffset;
  }

  _CalculateIdealLookat() {
    this._idealLookat.set(0, 10, 50);
    this._idealLookat.applyQuaternion(this._target.Rotation);
    this._idealLookat.add(
      new THREE.Vector3(
        this._target.Position.x,
        this._target.Position.y,
        this._target.Position.z,
      ),
    );
    return this._idealLookat;
  }

  Update(timeElapsed: number) {
    const idealOffset = this._CalculateIdealOffset();
    const idealLookat = this._CalculateIdealLookat();

    const t = 1.0 - Math.pow(0.001, timeElapsed);

    this._currentPosition.lerp(idealOffset, t);
    this._currentLookat.lerp(idealLookat, t);

    this._camera.up
      .set(
        this._target.Position.x,
        this._target.Position.y,
        this._target.Position.z,
      )
      .normalize();

    this._camera.position.copy(this._currentPosition);
    this._camera.lookAt(this._currentLookat);
  }
}
