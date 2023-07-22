import * as THREE from 'three';
import { CharacterController } from './character';
export declare class ThirdPersonCamera {
    _camera: THREE.PerspectiveCamera;
    _target: CharacterController;
    _currentPosition: THREE.Vector3;
    _currentLookat: THREE.Vector3;
    constructor(params: {
        camera: THREE.PerspectiveCamera;
        target: CharacterController;
    });
    _CalculateIdealOffset(): THREE.Vector3;
    _CalculateIdealLookat(): THREE.Vector3;
    Update(timeElapsed: number): void;
}
