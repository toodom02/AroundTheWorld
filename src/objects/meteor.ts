import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { CharacterController } from '../character';

export class Meteor {
  _params: {
    key: string;
    scene: THREE.Scene;
    world: CANNON.World;
    controller: CharacterController;
    atmosphereRadius: number;
    planetRadius: number;
    groundMaterial: CANNON.Material;
    activeMeteors: Map<string, Meteor>;
    reservedMeteors: Map<string, Meteor>;
  };
  radius: number;
  _start: THREE.Vector3;
  crash: boolean;
  _mesh: THREE.Group;
  _body: CANNON.Body;
  constructor(params: {
    key: string;
    scene: THREE.Scene;
    world: CANNON.World;
    controller: CharacterController;
    atmosphereRadius: number;
    planetRadius: number;
    groundMaterial: CANNON.Material;
    activeMeteors: Map<string, Meteor>;
    reservedMeteors: Map<string, Meteor>;
  }) {
    this._params = params;
    this._Init();
  }

  _Init() {
    this._LoadModels();
  }

  _LoadModels() {
    const loader = new FBXLoader();
    loader.setPath('./resources/models/');
    loader.load('meteor.fbx', fbx => {
      this._mesh = fbx;

      this._mesh.traverse(c => {
        c.castShadow = true;
      });

      this.radius = Math.floor(Math.random() * (20 - 5) + 5);
      const scale = 2 * this.radius / 5.5
      this._mesh.scale.set(scale, scale, scale); // original size is ~5.5
      this._mesh.updateMatrixWorld(true);

      const sphereShape = new CANNON.Sphere(this.radius);
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
    });
  }

  get Position() {
    return this._body.position;
  }

  show() {
    this._params.reservedMeteors.delete(this._params.key);
    this._params.activeMeteors.set(this._params.key, this);

    this.crash = false;

    const minHeight = this._params.planetRadius + this._params.atmosphereRadius;
    const maxHeight = 500;
    const rand = () => (Math.random() > 0.5 ? 1 : -1) * (Math.random() * (maxHeight - minHeight) + minHeight);

    if (this._mesh && this._body) {
      this._body.position.set(rand(), rand(), rand());
      this._params.scene.add(this._mesh);
      this._params.world.addBody(this._body);
      this._body.addEventListener('collide', (event: any) => {
        const {contact} = event;
        this.crash = true;

        if (contact.bi.id === this._params.controller._playerBody.id) {
          this._params.controller._isHit = true;
        }
      });
    }
  }

  delete() {
    this._params.world.removeBody(this._body);
    this._params.scene.remove(this._mesh);
    this._body.removeEventListener('collide', () => {});

    this._params.activeMeteors.delete(this._params.key);
    this._params.reservedMeteors.set(this._params.key, this);
  }

  updatePosition() {
    if (this._mesh && this._body) {
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

      if (this._body.position.length() > 1000) {
        this.delete();
      }

      if (this.crash) {
        this.delete();
        return;
      }
    }
  }
}