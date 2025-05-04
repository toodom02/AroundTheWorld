import * as THREE from 'three';
export class Moon {
    _params;
    _moon;
    _pivotPoint;
    constructor(params) {
        this._params = params;
        this._Init();
    }
    _Init() {
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
    animate() {
        this._pivotPoint.rotation.x += 0.00002;
        this._pivotPoint.rotation.y += 0.00005;
        this._pivotPoint.rotation.z += 0.00001;
    }
}
//# sourceMappingURL=moon.js.map