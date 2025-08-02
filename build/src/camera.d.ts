import * as THREE from 'three';
import { CharacterController } from './character';
interface ThirdPersonCameraParams {
    camera: THREE.PerspectiveCamera;
    target: CharacterController;
}
export declare class ThirdPersonCamera {
    private _camera;
    private _target;
    private _currentPosition;
    private _currentLookat;
    private _idealLookat;
    private _idealOffset;
    private _transitionTime;
    private _transitionDuration;
    private _transitioning;
    constructor(params: ThirdPersonCameraParams);
    startTransition(): void;
    private _CalculateIdealOffset;
    private _CalculateIdealLookat;
    Update(timeElapsed: number): void;
}
export {};
