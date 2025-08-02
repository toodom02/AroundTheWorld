import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
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
}

export class Meteor {
  private _mesh: THREE.Group;
  private _body: CANNON.Body;
  private _crash = false;

  private constructor(private _params: MeteorParams) {}

  static async create(params: MeteorParams): Promise<Meteor> {
    const meteor = new Meteor(params);
    await meteor._init();
    return meteor;
  }

  private async _init(): Promise<void> {
    const loader = new FBXLoader();
    loader.setPath('./resources/models/');

    const fbx: THREE.Group = await new Promise((resolve, reject) => {
      loader.load('meteor.fbx', resolve, undefined, reject);
    });

    fbx.traverse(c => {
      c.castShadow = true;
    });

    const radius = Math.floor(Math.random() * (20 - 5) + 5);
    const scale = (2 * radius) / 5.5;
    fbx.scale.set(scale, scale, scale); // original size is ~5.5
    fbx.updateMatrixWorld(true);

    this._mesh = fbx;

    const sphereShape = new CANNON.Sphere(radius);
    this._body = new CANNON.Body({
      mass: 1000,
      shape: sphereShape,
      material: this._params.groundMaterial,
    });

    this._body.angularVelocity.set(
      Math.random() * 5 - 1,
      Math.random() * 5 - 1,
      Math.random() * 5 - 1,
    );
  }

  public show(): void {
    this._params.reservedMeteors.delete(this._params.key);
    this._params.activeMeteors.set(this._params.key, this);

    this._crash = false;

    const minHeight = this._params.planetRadius + this._params.atmosphereRadius;
    const maxHeight = 500;
    const rand = () =>
      (Math.random() > 0.5 ? 1 : -1) *
      (Math.random() * (maxHeight - minHeight) + minHeight);

    this._body.position.set(rand(), rand(), rand());

    this._params.scene.add(this._mesh);
    this._params.world.addBody(this._body);

    this._body.addEventListener('collide', (event: any) => {
      const { contact } = event;
      this._crash = true;

      if (contact.bi.id === this._params.controller.body.id) {
        this._params.controller.isHit = true;
        this._params.onGameOver();
      }
    });
  }

  private delete(): void {
    this._params.world.removeBody(this._body);
    this._params.scene.remove(this._mesh);
    this._body.removeEventListener('collide', () => {});

    this._params.activeMeteors.delete(this._params.key);
    this._params.reservedMeteors.set(this._params.key, this);
  }

  public updatePosition(): void {
    if (!this._mesh || !this._body) return;

    this._mesh.position.set(
      this._body.position.x,
      this._body.position.y,
      this._body.position.z,
    );
    this._mesh.quaternion.set(
      this._body.quaternion.x,
      this._body.quaternion.y,
      this._body.quaternion.z,
      this._body.quaternion.w,
    );

    if (this._body.position.length() > 1000 || this._crash) {
      this.delete();
    }
  }
}
