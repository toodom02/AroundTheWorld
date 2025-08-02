import * as THREE from 'three';
import * as CANNON from 'cannon-es';
interface PlanetParams {
    scene: THREE.Scene;
    world: CANNON.World;
    groundMaterial: CANNON.Material;
    planetRadius: number;
    atmosphereRadius: number;
}
export declare class Planet {
    private _params;
    private _planet;
    private _planetBody;
    private constructor();
    static create(params: PlanetParams): Promise<Planet>;
    private _init;
    private _loadFBXModel;
}
export {};
