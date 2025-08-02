import * as THREE from 'three';
interface MoonParams {
    scene: THREE.Scene;
}
export declare class Moon {
    private _params;
    private _moon;
    private _pivotPoint;
    private constructor();
    static create(params: MoonParams): Promise<Moon>;
    private _init;
    animate(): void;
}
export {};
