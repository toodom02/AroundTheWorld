import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Meteor {
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
  }) {
    this._params = params;
    this._Init();
  }

  _Init() {
    this.hitPlayer = false;
    this.crash = false;
    this.radius = Math.floor(Math.random() * 10 + 5);

    const x = Math.random() - 0.5;
    const y = Math.random() * 0.8 + 0.2;
    const z = Math.random() - 0.5;
    const pointx = (800 * x) / Math.sqrt(x * x + y * y + z * z);
    const pointy = (800 * y) / Math.sqrt(x * x + y * y + z * z);
    const pointz = (800 * z) / Math.sqrt(x * x + y * y + z * z);
    this.start = new THREE.Vector3(pointx, pointy, pointz);

    // get random point on island within circle of radius 75
    const r = 75 * Math.sqrt(Math.random());
    const theta = Math.random() * 2 * Math.PI;
    const x2 = +r * Math.cos(theta);
    const z2 = +r * Math.sin(theta);
    this.target = new THREE.Vector3(x2, this.radius, z2);

    this.mesh = this.createThreeObject();
    this.body = this.createCannonObject();

    this.body.addEventListener('collide', (event: any) => {
      const {contact} = event;
      this.crash = true;

      if (contact.bj.id === this._params.playerBody.id) {
        this.hitPlayer = true;
      }
    });
  }

  get Position() {
    return this.body.position;
  }

  createThreeObject(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(this.radius, 9, 6);
    const material = new THREE.MeshPhongMaterial({color: 0x3d3635});
    const sphere = new THREE.Mesh(geometry, material);
    sphere.castShadow = true;
    sphere.position.copy(this.start);
    sphere.lookAt(this.target);
    this._params.scene.add(sphere);
    return sphere;
  }

  createCannonObject(): CANNON.Body {
    const sphereShape = new CANNON.Sphere(this.radius);
    const sphere = new CANNON.Body({mass: 100, shape: sphereShape});
    sphere.position = new CANNON.Vec3(
      this.mesh.position.x,
      this.mesh.position.y,
      this.mesh.position.z
    );
    sphere.quaternion = new CANNON.Quaternion(
      this.mesh.quaternion.x,
      this.mesh.quaternion.y,
      this.mesh.quaternion.z,
      this.mesh.quaternion.w
    );
    this._params.world.addBody(sphere);
    return sphere;
  }

  delete() {
    this._params.world.removeBody(this.body);
    this._params.scene.remove(this.mesh);
  }

  update() {
    // remove if below world
    if (this.body.position.y < -250) {
      this.crash = true;
    }
    if (this.crash) {
      this.delete();
      return;
    }
    const _Q = this.mesh.quaternion.clone();
    const newVelocity = new THREE.Vector3(0, 0, 200);
    newVelocity.applyQuaternion(_Q);

    this.body.velocity = new CANNON.Vec3(
      newVelocity.x,
      newVelocity.y,
      newVelocity.z
    );
    this.mesh.position.copy(
      new THREE.Vector3(
        this.body.position.x,
        this.body.position.y,
        this.body.position.z
      )
    );
  }
}
