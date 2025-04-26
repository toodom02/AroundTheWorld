import * as THREE from 'three';
import * as CANNON from 'cannon-es';
export declare class Ball {
    _params: {
        scene: THREE.Scene;
        world: CANNON.World;
        groundMaterial: CANNON.Material;
        initPosition: THREE.Vector3;
    };
    _ball: THREE.Mesh;
    _ballBody: CANNON.Body;
    constructor(params: {
        scene: THREE.Scene;
        world: CANNON.World;
        groundMaterial: CANNON.Material;
        initPosition: THREE.Vector3;
    });
    _Init(): void;
    updatePosition(): void;
    _reset(): void;
}
