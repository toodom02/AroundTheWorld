import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { CharacterController } from '../character';
import { AudioManager } from '../audio';

type CoinParams = {
  key: string;
  scene: THREE.Scene;
  controller: CharacterController;
  activeCoins: Map<string, Coin>;
  reservedCoins: Map<string, Coin>;
  addScore: (points: number) => void;
  audio: AudioManager;
};

export class Coin {
  private _mesh: THREE.Group;
  private _spinAxis = new THREE.Vector3(1, 0, 0);
  private _spinAngle = Math.PI / 180;

  private constructor(private _params: CoinParams) {}

  static async create(params: CoinParams): Promise<Coin> {
    const coin = new Coin(params);
    await coin._init();
    return coin;
  }

  private async _init(): Promise<void> {
    const loader = new FBXLoader();
    loader.setPath('./resources/models/');

    const fbx: THREE.Group = await new Promise((resolve, reject) => {
      loader.load('coin.fbx', resolve, undefined, reject);
    });

    fbx.traverse(c => {
      c.castShadow = true;
      if ((c as THREE.Mesh).isMesh) {
        const mesh = c as THREE.Mesh;
        if (mesh.material && (mesh.material as THREE.MeshPhongMaterial).isMeshPhongMaterial) {
          const material = mesh.material as THREE.MeshPhongMaterial;
          material.emissiveIntensity = 1;
        }
      }
    });
    fbx.scale.set(0.1, 0.1, 0.1);
    fbx.updateMatrixWorld(true);

    this._mesh = fbx;
  }

  public showCoin(position: THREE.Vector3): void {
    this._params.reservedCoins.delete(this._params.key);

    const up = position.clone().normalize();
    const elevatedPosition = position.clone().add(up.clone().multiplyScalar(10));
    this._mesh.position.copy(elevatedPosition);


    const targetQuat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(1, 0, 0),
      up
    );
    this._mesh.quaternion.copy(targetQuat);

    this._params.scene.add(this._mesh);
    this._params.activeCoins.set(this._params.key, this);
  }

  public hideCoin() {
    this._params.activeCoins.delete(this._params.key);
    this._params.scene.remove(this._mesh);
    this._params.reservedCoins.set(this._params.key, this);
  }

  public animate() {
    this._mesh.rotateOnAxis(this._spinAxis, this._spinAngle);

    const playerPos = this._params.controller.body.position;
    const coinPos = this._mesh.position;
    const dx = coinPos.x - playerPos.x;
    const dy = coinPos.y - playerPos.y;
    const dz = coinPos.z - playerPos.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const threshold = 8 * 8;
    if (distSq < threshold) {
      this._params.audio.play('coin', 0.5);
      this.hideCoin();
      this._params.addScore(1);
    }
  }
}