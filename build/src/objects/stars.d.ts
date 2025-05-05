import * as THREE from 'three';
export declare class Stars {
    _params: {
        scene: THREE.Scene;
        atmosphereRadius: number;
        planetRadius: number;
    };
    _particlesMesh: THREE.Points;
    constructor(params: {
        scene: THREE.Scene;
        atmosphereRadius: number;
        planetRadius: number;
    });
    _Init(): void;
    animate(): void;
}
