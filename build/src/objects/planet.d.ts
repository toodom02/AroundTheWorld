import * as THREE from 'three';
import * as CANNON from 'cannon-es';
export declare class Planet {
    _params: {
        scene: THREE.Scene;
        world: CANNON.World;
        groundMaterial: CANNON.Material;
        planetRadius: number;
        atmosphereRadius: number;
    };
    _planet: THREE.Mesh;
    _planetBody: CANNON.Body;
    constructor(params: {
        scene: THREE.Scene;
        world: CANNON.World;
        groundMaterial: CANNON.Material;
        planetRadius: number;
        atmosphereRadius: number;
    });
    _Init(): void;
    _LoadModels(): void;
}
