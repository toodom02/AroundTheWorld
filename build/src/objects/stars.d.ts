import * as THREE from 'three';
interface StarsParams {
    scene: THREE.Scene;
    atmosphereRadius: number;
    planetRadius: number;
}
export declare class Stars {
    private _params;
    private _particlesMesh;
    private constructor();
    static create(params: StarsParams): Promise<Stars>;
    private _init;
    animate(): void;
}
export {};
