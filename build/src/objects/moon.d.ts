import * as THREE from 'three';
export declare class Moon {
    _params: {
        scene: THREE.Scene;
    };
    _moon: THREE.Mesh;
    _pivotPoint: THREE.Object3D;
    constructor(params: {
        scene: THREE.Scene;
    });
    _Init(): void;
    animate(): void;
}
