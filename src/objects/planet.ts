import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader';
import {ShapeType, threeToCannon} from 'three-to-cannon';

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
    this._LoadModels();
  }

  _LoadModels() {
    const loader = new FBXLoader();
    loader.setPath('./resources/models/');
    loader.load('planet.fbx', fbx => {
      fbx.traverse(c => {
        c.castShadow = true;
        c.receiveShadow = true;
      });
      fbx.position.set(0, 0, 0);
      fbx.scale.set(50, 50, 50);
      fbx.updateMatrixWorld(true);
      this._params.scene.add(fbx);

      const cannonConvert = threeToCannon(fbx, {
        type: ShapeType.MESH,
      });
      const {shape} = cannonConvert ?? {};
      this._planetBody = new CANNON.Body({
        mass: 0,
        shape: shape,
        material: this._params.groundMaterial,
        position: new CANNON.Vec3(
          fbx.position.x,
          fbx.position.y,
          fbx.position.z,
        ),
      });
      this._params.world.addBody(this._planetBody);
    });
  }
}
