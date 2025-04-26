import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Planet {
  _params: {
    scene: THREE.Scene;
    world: CANNON.World;
    groundMaterial: CANNON.Material;
    planetRadius: number;
    atmosphereRadius: number;
  };
  _planet: THREE.Mesh;
  _planetBody: CANNON.Body;
  constructor(params: {
    scene: THREE.Scene;
    world: CANNON.World;
    groundMaterial: CANNON.Material;
    planetRadius: number;
    atmosphereRadius: number;
  }) {
    this._params = params;
    this._Init();
  }

  _Init() {
    const planetGeometry = new THREE.SphereGeometry(
      this._params.planetRadius,
      64,
      64,
    );
    const planetMaterial = new THREE.MeshPhongMaterial({color: 0x636b2f});
    this._planet = new THREE.Mesh(planetGeometry, planetMaterial);
    this._planet.castShadow = true;
    this._planet.receiveShadow = true;
    this._planet.position.set(0, 0, 0);
    this._params.scene.add(this._planet);

    this._planetBody = new CANNON.Body({
      shape: new CANNON.Sphere(this._params.planetRadius),
      material: this._params.groundMaterial,
      type: 2,
    });
    this._planetBody.position = new CANNON.Vec3(
      this._planet.position.x,
      this._planet.position.y,
      this._planet.position.z,
    );

    this._params.world.addBody(this._planetBody);
  }
}
