import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CharacterController } from '../character';
interface MeteorParams {
    key: string;
    scene: THREE.Scene;
    world: CANNON.World;
    controller: CharacterController;
    atmosphereRadius: number;
    planetRadius: number;
    groundMaterial: CANNON.Material;
    activeMeteors: Map<string, Meteor>;
    reservedMeteors: Map<string, Meteor>;
    onGameOver: () => void;
    showCoin: (position: THREE.Vector3) => void;
}
export declare class Meteor {
    private _params;
    private _mesh;
    private _body;
    private _crash;
    private constructor();
    static create(params: MeteorParams): Promise<Meteor>;
    private _init;
    show(): void;
    delete(): void;
    updatePosition(): void;
}
export {};
