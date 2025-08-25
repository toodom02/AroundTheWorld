import * as THREE from 'three';
import { CharacterController } from '../character';
interface CoinParams {
    key: string;
    scene: THREE.Scene;
    controller: CharacterController;
    activeCoins: Map<string, Coin>;
    reservedCoins: Map<string, Coin>;
    addScore: (points: number) => void;
}
export declare class Coin {
    private _params;
    private _mesh;
    private _spinAxis;
    private _spinAngle;
    private _audio;
    private constructor();
    static create(params: CoinParams): Promise<Coin>;
    private _init;
    showCoin(position: THREE.Vector3): void;
    hideCoin(): void;
    animate(): void;
}
export {};
