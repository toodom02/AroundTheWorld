import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CharacterFSM } from './characterAnimations';
export declare class CharacterControllerProxy {
    _animations: any;
    constructor(animations: {});
    get animations(): any;
}
export declare class CharacterController {
    _params: {
        camera: THREE.Camera;
        scene: THREE.Scene;
        world: CANNON.World;
        planetRadius: number;
        groundMaterial: CANNON.Material;
    };
    startingPos: THREE.Vector3;
    canJump: boolean;
    _animations: any;
    _input: CharacterControllerInput;
    _stateMachine: CharacterFSM;
    _target: THREE.Group;
    bodyRadius: number;
    playerBody: CANNON.Body;
    _mixer: THREE.AnimationMixer;
    _manager: THREE.LoadingManager;
    inputVelocity: THREE.Vector3;
    velocityFactor: number;
    jumpVelocity: number;
    characterLoaded: boolean;
    slipperyMaterial: CANNON.Material;
    constructor(params: {
        camera: THREE.Camera;
        scene: THREE.Scene;
        world: CANNON.World;
        planetRadius: number;
        groundMaterial: CANNON.Material;
    });
    _Init(): void;
    _LoadModels(): void;
    get Position(): CANNON.Vec3;
    get Rotation(): THREE.Quaternion;
    ResetPlayer(): void;
    Enable(): void;
    Disable(): void;
    Update(timeInSeconds: number): void;
}
export declare class CharacterControllerInput {
    _keys: {
        forward: boolean;
        backward: boolean;
        left: boolean;
        right: boolean;
        space: boolean;
        shift: boolean;
    };
    canJump: boolean;
    Enable(): void;
    Disable(): void;
    _onKeyDown(e: KeyboardEvent): void;
    _onKeyUp(e: KeyboardEvent): void;
}
