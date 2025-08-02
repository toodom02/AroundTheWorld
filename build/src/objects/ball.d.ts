import * as THREE from 'three';
import * as CANNON from 'cannon-es';
interface BallParams {
    scene: THREE.Scene;
    world: CANNON.World;
    groundMaterial: CANNON.Material;
    initPosition: THREE.Vector3;
}
export declare class Ball {
    private _params;
    private _ball;
    private _ballBody;
    private constructor();
    /**
     * Asynchronously creates a Ball instance, returning it once fully loaded.
     */
    static create(params: BallParams): Promise<Ball>;
    private _init;
    updatePosition(): void;
    private _reset;
}
export {};
