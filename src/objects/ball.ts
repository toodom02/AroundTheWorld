import * as THREE from 'three';
import * as CANNON from 'cannon-es';

interface BallParams {
  scene: THREE.Scene;
  world: CANNON.World;
  groundMaterial: CANNON.Material;
  initPosition: THREE.Vector3;
}

export class Ball {
  private _ball: THREE.Mesh;
  private _ballBody: CANNON.Body;

  private constructor(private _params: BallParams) {}

  /**
   * Asynchronously creates a Ball instance, returning it once fully loaded.
   */
  static async create(params: BallParams): Promise<Ball> {
    const ball = new Ball(params);
    await ball._init();
    return ball;
  }

  private async _init(): Promise<void> {
    const radius = 3;

    const texture = await new THREE.TextureLoader().loadAsync('./resources/ball-texture.png');

    const geometry = new THREE.SphereGeometry(radius);
    const material = new THREE.MeshPhongMaterial({ map: texture });
    this._ball = new THREE.Mesh(geometry, material);
    this._ball.castShadow = true;
    this._ball.receiveShadow = true;
    this._ball.position.copy(this._params.initPosition);
    this._params.scene.add(this._ball);

    this._ballBody = new CANNON.Body({
      mass: 0.5,
      shape: new CANNON.Sphere(radius),
      material: this._params.groundMaterial,
      linearDamping: 0.5,
      angularDamping: 0.3,
    });
    this._ballBody.position = new CANNON.Vec3(
      this._ball.position.x,
      this._ball.position.y,
      this._ball.position.z,
    );
    this._params.world.addBody(this._ballBody);
  }

  public updatePosition(): void {
    if (!this._ball || !this._ballBody) return;

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

  private _reset(): void {
    if (!this._ballBody) return;

    const { x, y, z } = this._params.initPosition;

    this._ballBody.velocity.set(0, 0, 0);
    this._ballBody.position.set(x, y, z);
    this._ballBody.force.set(0, 0, 0);
    this._ballBody.inertia.set(0, 0, 0);
    this._ballBody.angularVelocity.set(0, 0, 0);
  }
}
