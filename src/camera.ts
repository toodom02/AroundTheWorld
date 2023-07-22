import * as THREE from 'three';
import {CharacterController} from './character';

export class ThirdPersonCamera {
  _camera: THREE.PerspectiveCamera;
  _target: CharacterController;
  _currentPosition: THREE.Vector3;
  _currentLookat: THREE.Vector3;
  constructor(params: {
    camera: THREE.PerspectiveCamera;
    target: CharacterController;
  }) {
    this._camera = params.camera;
    this._target = params.target;

    this._currentPosition = new THREE.Vector3();
    this._currentLookat = new THREE.Vector3();
  }

  _CalculateIdealOffset() {
    const idealOffset = new THREE.Vector3(-15, 20, -30);
    idealOffset.applyQuaternion(this._target.Rotation);
    idealOffset.add(
      new THREE.Vector3(
        this._target.Position.x,
        this._target.Position.y,
        this._target.Position.z
      )
    );
    return idealOffset;
  }

  _CalculateIdealLookat() {
    const idealLookat = new THREE.Vector3(0, 10, 50);
    idealLookat.applyQuaternion(this._target.Rotation);
    idealLookat.add(
      new THREE.Vector3(
        this._target.Position.x,
        this._target.Position.y,
        this._target.Position.z
      )
    );
    return idealLookat;
  }

  Update(timeElapsed: number) {
    const idealOffset = this._CalculateIdealOffset();
    const idealLookat = this._CalculateIdealLookat();

    const t = 1.0 - Math.pow(0.001, timeElapsed);

    this._currentPosition.lerp(idealOffset, t);
    this._currentLookat.lerp(idealLookat, t);

    this._camera.position.copy(this._currentPosition);
    this._camera.lookAt(this._currentLookat);
  }
}
