import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Ball {
  _params: {
    scene: THREE.Scene;
    world: CANNON.World;
    groundMaterial: CANNON.Material;
    initPosition: THREE.Vector3;
  };
  _ball: THREE.Mesh;
  _ballBody: CANNON.Body;
  constructor(params: {
    scene: THREE.Scene;
    world: CANNON.World;
    groundMaterial: CANNON.Material;
    initPosition: THREE.Vector3;
  }) {
    this._params = params;
    this._Init();
  }

  _Init() {
    const radius = 3;
    const texture = new THREE.TextureLoader().load(
      './resources/ball-texture.png',
    );
    const ballGeometry = new THREE.SphereGeometry(radius);
    const ballMaterial = new THREE.MeshPhongMaterial({map: texture});
    this._ball = new THREE.Mesh(ballGeometry, ballMaterial);
    this._ball.castShadow = true;
    this._ball.receiveShadow = true;
    this._ball.position.copy(this._params.initPosition);
    this._params.scene.add(this._ball);

    const ballPhysMaterial = new CANNON.Material('ballMaterial');

    this._ballBody = new CANNON.Body({
      mass: 0.5,
      shape: new CANNON.Sphere(radius),
      material: ballPhysMaterial,
      linearDamping: 0.5,
      angularDamping: 0.3,
    });
    this._ballBody.position = new CANNON.Vec3(
      this._ball.position.x,
      this._ball.position.y,
      this._ball.position.z,
    );

    const contactMaterial = new CANNON.ContactMaterial(
      ballPhysMaterial,
      this._params.groundMaterial,
      {
        friction: 0.4,
        restitution: 0.2,
      },
    );
    this._params.world.addContactMaterial(contactMaterial);

    this._params.world.addBody(this._ballBody);
  }

  updatePosition() {
    if (this._ball) {
      this._ball.position.set(
        this._ballBody.position.x,
        this._ballBody.position.y,
        this._ballBody.position.z,
      );
      this._ball.quaternion.set(
        this._ballBody.quaternion.x,
        this._ballBody.quaternion.y,
        this._ballBody.quaternion.z,
        this._ballBody.quaternion.w,
      );

      if (this._ballBody.position.length() > 250) {
        this._reset();
      }
    }
  }

  _reset() {
    this._ballBody.velocity.set(0, 0, 0);
    this._ballBody.position.set(
      this._params.initPosition.x,
      this._params.initPosition.y,
      this._params.initPosition.z,
    );
    this._ballBody.force.set(0, 0, 0);
    this._ballBody.inertia.set(0, 0, 0);
    this._ballBody.angularVelocity.set(0, 0, 0);
  }
}
