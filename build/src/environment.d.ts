import * as THREE from 'three';
import * as CANNON from 'cannon-es';
export declare class Environment {
    _params: {
        scene: THREE.Scene;
        world: CANNON.World;
        groundMaterial: CANNON.Material;
    };
    _planetRadius: number;
    _atmosphereRadius: number;
    ball: THREE.Mesh;
    ballBody: CANNON.Body;
    moon: THREE.Mesh;
    pivotPoint: THREE.Object3D;
    particlesMesh: THREE.Points;
    environLoaded: boolean;
    constructor(params: {
        scene: THREE.Scene;
        world: CANNON.World;
        groundMaterial: CANNON.Material;
    });
    _Init(): void;
    _createScene(): void;
    _createPhysicsObject(): void;
    _createMoon(): void;
    _createStars(): void;
    _handlePhysicsObjects(): void;
    animate(): void;
}
