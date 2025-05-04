import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Ball, Stars, Moon, Planet } from './objects';
export declare class Environment {
    _params: {
        scene: THREE.Scene;
        world: CANNON.World;
        groundMaterial: CANNON.Material;
        planetRadius: number;
    };
    _atmosphereRadius: number;
    _ball: Ball;
    _stars: Stars;
    _moon: Moon;
    _planet: Planet;
    environLoaded: boolean;
    constructor(params: {
        scene: THREE.Scene;
        world: CANNON.World;
        groundMaterial: CANNON.Material;
        planetRadius: number;
    });
    _Init(): void;
    _createPlanet(): void;
    _createPhysicsObject(): void;
    _createMoon(): void;
    _createStars(): void;
    _handlePhysicsObjects(): void;
    animate(): void;
}
