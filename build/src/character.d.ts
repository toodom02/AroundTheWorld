import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CharacterFSM } from './characterAnimations';
type Animation = {
    readonly action: THREE.AnimationAction;
    readonly clip: THREE.AnimationClip;
};
type Animations = Record<string, Animation>;
export declare class CharacterControllerProxy {
    _animations: Animations;
    constructor(animations: {});
    get animations(): Animations;
}
export declare class CharacterController {
    _params: {
        camera: THREE.Camera;
        scene: THREE.Scene;
        world: CANNON.World;
        groundMaterial: CANNON.Material;
        initPosition: THREE.Vector3;
    };
    characterLoaded: boolean;
    _canJump: boolean;
    _animations: Animations;
    _input: CharacterControllerInput;
    _stateMachine: CharacterFSM;
    _target: THREE.Group;
    _bodyRadius: number;
    _playerBody: CANNON.Body;
    _mixer: THREE.AnimationMixer;
    _manager: THREE.LoadingManager;
    _inputVelocity: THREE.Vector3;
    _forwardVelocity: number;
    _velocityFactor: number;
    _jumpVelocity: number;
    _localUp: THREE.Vector3;
    _localForward: THREE.Vector3;
    _localRight: THREE.Vector3;
    _correctedForward: THREE.Vector3;
    _quaternion: THREE.Quaternion;
    _matrix: THREE.Matrix4;
    _baseQuat: THREE.Quaternion;
    _yawQuat: THREE.Quaternion;
    _offset: THREE.Vector3;
    _playerPosition: THREE.Vector3;
    constructor(params: {
        camera: THREE.Camera;
        scene: THREE.Scene;
        world: CANNON.World;
        groundMaterial: CANNON.Material;
        initPosition: THREE.Vector3;
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
export {};
