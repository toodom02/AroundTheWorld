import * as THREE from 'three';
import * as CANNON from 'cannon-es';
type Animation = {
    readonly action: THREE.AnimationAction;
    readonly clip: THREE.AnimationClip;
};
type Animations = Record<string, Animation>;
export declare class CharacterControllerProxy {
    private _animations;
    constructor(_animations: Animations);
    get animations(): Animations;
}
interface CharacterControllerParams {
    camera: THREE.Camera;
    scene: THREE.Scene;
    world: CANNON.World;
    groundMaterial: CANNON.Material;
    initPosition: THREE.Vector3;
}
export declare class CharacterController {
    private _params;
    static create(params: CharacterControllerParams): Promise<CharacterController>;
    private _input;
    private _stateMachine;
    private _animations;
    private _mixer;
    private _target;
    private _playerBody;
    private _inputVelocity;
    private _localUp;
    private _localForward;
    private _localRight;
    private _correctedForward;
    private _quaternion;
    private _matrix;
    private _baseQuat;
    private _yawQuat;
    private _offset;
    private _playerPosition;
    private _bodyRadius;
    private _velocityFactor;
    private _canJump;
    private _jumpForceDuration;
    private _jumpForceMaxDuration;
    private _jumpForceStrength;
    isHit: boolean;
    private constructor();
    private _init;
    private _initPhysicsBody;
    private _loadCharacterModel;
    private _setupPlayerPhysics;
    private _setupStateMachine;
    private _loadAnimations;
    get Position(): THREE.Vector3;
    get Rotation(): THREE.Quaternion;
    get body(): CANNON.Body;
    ResetPlayer(): void;
    Enable(): void;
    Disable(): void;
    Update(timeInSeconds: number): void;
    private _updateOrientation;
    private _applyMovement;
    private _applyYaw;
    private _syncVisuals;
}
export declare class CharacterControllerInput {
    private _keys;
    isHit: boolean;
    Enable(): void;
    Disable(): void;
    private _onKeyDown;
    private _onKeyUp;
    get keys(): {
        forward: boolean;
        backward: boolean;
        left: boolean;
        right: boolean;
        space: boolean;
        shift: boolean;
    };
}
export {};
