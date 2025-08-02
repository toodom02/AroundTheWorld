import * as THREE from 'three';

interface MoonParams {
  scene: THREE.Scene;
}

export class Moon {
  private _moon: THREE.Mesh;
  private _pivotPoint: THREE.Object3D;

  private constructor(private _params: MoonParams) {}

  static async create(params: MoonParams): Promise<Moon> {
    const moon = new Moon(params);
    moon._init();
    return moon;
  }

  private _init(): void {
    const moonGeometry = new THREE.SphereGeometry(50, 32, 16);
    const moonMaterial = new THREE.MeshPhongMaterial({ color: 0x900c3f });

    this._moon = new THREE.Mesh(moonGeometry, moonMaterial);
    this._moon.castShadow = true;
    this._moon.receiveShadow = true;
    this._moon.position.set(400, 100, -200);

    this._pivotPoint = new THREE.Object3D();
    this._params.scene.add(this._pivotPoint);
    this._pivotPoint.add(this._moon);
  }

  public animate(): void {
    this._pivotPoint.rotation.x += 0.00002;
    this._pivotPoint.rotation.y += 0.00005;
    this._pivotPoint.rotation.z += 0.00001;
  }
}
