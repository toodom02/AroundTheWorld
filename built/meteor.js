import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import * as CANNON from 'https://cdn.skypack.dev/cannon-es@0.18.0';
export class Meteor {
    constructor(params) {
        this._params = params;
        this._Init();
    }
    _Init() {
        this.hitPlayer = false;
        this.crash = false;
        this.radius = Math.floor(Math.random() * 10 + 10);
        const x = Math.random() - 0.5;
        const y = Math.random() * 0.8 + 0.2;
        const z = Math.random() - 0.5;
        const pointx = 800 * x / Math.sqrt(x * x + y * y + z * z);
        const pointy = 800 * y / Math.sqrt(x * x + y * y + z * z);
        const pointz = 800 * z / Math.sqrt(x * x + y * y + z * z);
        this.start = new THREE.Vector3(pointx, pointy, pointz);
        // get random point on island within circle of radius 75
        const r = 75 * Math.sqrt(Math.random());
        const theta = Math.random() * 2 * Math.PI;
        const x2 = +r * Math.cos(theta);
        const z2 = +r * Math.sin(theta);
        this.target = new THREE.Vector3(x2, this.radius, z2);
        this.mesh = this.createThreeObject();
        this.body = this.createCannonObject();
        this.body.addEventListener('collide', (event) => {
            const { contact } = event;
            this.crash = true;
            if (contact.bi.id === this._params.playerBody.id || contact.bj.id === this._params.playerBody.id) {
                this.hitPlayer = true;
            }
        });
    }
    createThreeObject() {
        const geometry = new THREE.SphereGeometry(this.radius, 9, 6);
        const material = new THREE.MeshPhongMaterial({ color: 0x3d3635 });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.castShadow = true;
        sphere.position.copy(this.start);
        sphere.lookAt(this.target);
        this._params.scene.add(sphere);
        return sphere;
    }
    createCannonObject() {
        const sphereShape = new CANNON.Sphere(this.radius);
        const sphere = new CANNON.Body({ mass: 100, shape: sphereShape });
        sphere.position.copy(this.mesh.position);
        sphere.quaternion.copy(this.mesh.quaternion);
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
        this.body.velocity.copy(newVelocity);
        this.mesh.position.copy(this.body.position);
    }
}
