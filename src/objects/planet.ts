import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { ShapeType, threeToCannon } from 'three-to-cannon';

interface PlanetParams {
  scene: THREE.Scene;
  world: CANNON.World;
  groundMaterial: CANNON.Material;
  planetRadius: number;
  atmosphereRadius: number;
}

export class Planet {
  private _planet: THREE.Group;
  private _planetBody: CANNON.Body;

  private constructor(private _params: PlanetParams) {}

  public static async create(params: PlanetParams): Promise<Planet> {
    const planet = new Planet(params);
    await planet._init();
    return planet;
  }

  private async _init(): Promise<void> {
    const fbx = await this._loadFBXModel('planet.fbx');

    fbx.traverse(child => {
      child.castShadow = true;
      child.receiveShadow = true;
    });

    fbx.position.set(0, 0, 0);
    fbx.scale.set(50, 50, 50);
    fbx.updateMatrixWorld(true);
    this._params.scene.add(fbx);

    this._planet = fbx;

    const cannonShapeResult = threeToCannon(fbx, {
      type: ShapeType.MESH,
    });

    const shape = cannonShapeResult?.shape;
    if (!shape) {
      throw new Error('Failed to create cannon shape from planet model.');
    }

    this._planetBody = new CANNON.Body({
      mass: 0,
      shape,
      material: this._params.groundMaterial,
      position: new CANNON.Vec3(
        fbx.position.x,
        fbx.position.y,
        fbx.position.z,
      ),
    });

    this._params.world.addBody(this._planetBody);
  }

  private _loadFBXModel(path: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      const loader = new FBXLoader();
      loader.setPath('./resources/models/');
      loader.load(
        path,
        (model: THREE.Group) => resolve(model),
        undefined,
        (error: unknown) => reject(error),
      );
    });
  }
}
