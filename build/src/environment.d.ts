import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Ball, Stars, Moon, Planet } from './objects';
import { Meteor } from './objects/meteor';
import { CharacterController } from './character';
interface EnvironmentParams {
    scene: THREE.Scene;
    world: CANNON.World;
    groundMaterial: CANNON.Material;
    planetRadius: number;
    controller: CharacterController;
    onGameOver: () => void;
}
export declare class Environment {
    private _params;
    _atmosphereRadius: number;
    _ball: Ball;
    _stars: Stars;
    _moon: Moon;
    _planet: Planet;
    _maxMeteors: number;
    _activeMeteors: Map<string, Meteor>;
    _reservedMeteors: Map<string, Meteor>;
    environLoaded: boolean;
    private constructor();
    static create(params: EnvironmentParams): Promise<Environment>;
    private _init;
    private _createPlanet;
    private _createPhysicsObject;
    private _initialiseMeteors;
    _createMeteor(): void;
    private _createMoon;
    private _createStars;
    handlePhysicsObjects(): void;
    animate(): void;
}
export {};
