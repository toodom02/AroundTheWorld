import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Ball, Stars, Moon, Planet, Meteor, Coin } from './objects';
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
    _activeCoins: Map<string, Coin>;
    _maxCoins: number;
    _reservedCoins: Map<string, Coin>;
    _maxMeteors: number;
    _activeMeteors: Map<string, Meteor>;
    _reservedMeteors: Map<string, Meteor>;
    _meteorIncreaseInterval: number;
    _meteorIncreaseTimer: number | null;
    _maxMeteorsLimit: number;
    _initialMeteors: number;
    private constructor();
    static create(params: EnvironmentParams): Promise<Environment>;
    private _init;
    score: number;
    private addScore;
    private _createPlanet;
    private _createPhysicsObject;
    startMeteors(): void;
    stopMeteors(): void;
    private _initialiseMeteors;
    private _createMeteor;
    private _showCoin;
    private _initialiseCoins;
    private _createMoon;
    private _createStars;
    handlePhysicsObjects(): void;
    animate(): void;
}
export {};
