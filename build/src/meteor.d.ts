import * as THREE from 'three';
import * as CANNON from 'cannon-es';
export declare class Meteor {
    _params: {
        scene: THREE.Scene;
        world: CANNON.World;
        playerBody: CANNON.Body;
    };
    radius: number;
    start: THREE.Vector3;
    target: THREE.Vector3;
    mesh: THREE.Mesh;
    body: CANNON.Body;
    crash: boolean;
    hitPlayer: boolean;
    constructor(params: {
        scene: THREE.Scene;
        world: CANNON.World;
        playerBody: CANNON.Body;
    });
    _Init(): void;
    get Position(): CANNON.Vec3;
    createThreeObject(): THREE.Mesh;
    createCannonObject(): CANNON.Body;
    delete(): void;
    update(): void;
}
