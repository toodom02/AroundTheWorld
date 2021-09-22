import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import * as CANNON from 'https://cdn.skypack.dev/cannon-es@0.18.0';
// import { OrbitControls } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/OrbitControls';
import { CharacterController } from './character.js';
import { ThirdPersonCamera } from './camera.js';
import { Environment } from './environment.js';
class World {
    constructor() {
        this._Init();
    }
    _Init() {
        this._loaded = [];
        this._started = false;
        this._threejs = new THREE.WebGLRenderer({ antialias: true });
        this._threejs.shadowMap.enabled = true;
        this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
        this._threejs.setPixelRatio(window.devicePixelRatio);
        this._threejs.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this._threejs.domElement);
        window.addEventListener('resize', () => {
            this._OnWindowResize();
        }, false);
        const fov = 75;
        const aspect = window.innerWidth / window.innerHeight;
        const near = 0.1;
        const far = 1000;
        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this._camera.position.set(0, 150, 300);
        this._camera.lookAt(0, 0, 0);
        this._scene = new THREE.Scene();
        let light = new THREE.DirectionalLight(0xffffff);
        light.position.set(100, 100, 100);
        light.target.position.set(0, 0, 0);
        light.castShadow = true;
        light.shadow.bias = -0.001;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        light.shadow.camera.near = 0.1;
        light.shadow.camera.far = 500.0;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 500.0;
        light.shadow.camera.left = 100;
        light.shadow.camera.right = -100;
        light.shadow.camera.top = 100;
        light.shadow.camera.bottom = -100;
        this._scene.add(light);
        light = new THREE.AmbientLight(0x202020);
        this._scene.add(light);
        // initialise cannon world
        this._world = new CANNON.World();
        this.gravity = 100;
        this._world.gravity.set(0, -this.gravity, 0);
        this.groundMaterial = new CANNON.Material("groundMaterial");
        // create eveything in scene/world
        this._environ = new Environment({
            scene: this._scene,
            world: this._world,
            loaded: this._loaded,
            groundMaterial: this.groundMaterial,
        });
        this._mixers = [];
        this._previousRAF = null;
        this._LoadAnimatedModel();
        // const controls = new OrbitControls( this._camera, this._threejs.domElement );
        this._animateMenu();
    }
    _OnWindowResize() {
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();
        this._threejs.setSize(window.innerWidth, window.innerHeight);
    }
    _LoadAnimatedModel() {
        const params = {
            camera: this._camera,
            scene: this._scene,
            world: this._world,
            planetRadius: this._planetRadius,
            loaded: this._loaded,
            groundMaterial: this.groundMaterial,
        };
        this._controls = new CharacterController(params);
        this._thirdPersonCamera = new ThirdPersonCamera({
            camera: this._camera,
            target: this._controls,
        });
    }
    _animateMenu() {
        if (!this._started) {
            requestAnimationFrame(() => {
                this._animateMenu();
                this._environ.animate();
                this._threejs.render(this._scene, this._camera);
            });
            // enable start when assets loaded
            // remember to increment value when adding more assets
            if (this._loaded.length >= 3) {
                const startButton = document.getElementById("start-button");
                startButton.innerHTML = "Start";
                startButton.onclick = function () {
                    _APP._started = true;
                    _APP._animate();
                    const audioelem = document.getElementById('music');
                    audioelem.play();
                    audioelem.volume = 0.2;
                    document.getElementById("menu").style.display = "none";
                };
            }
        }
    }
    _updateGravity() {
        // change gravity around player (for globes)
        const grav = this._controls.Position;
        grav.multiplyScalar(-this.gravity / grav.length());
        this._world.gravity.set(grav.x, grav.y, grav.z);
    }
    _animate() {
        requestAnimationFrame((t) => {
            if (this._previousRAF === null) {
                this._previousRAF = t;
            }
            this._animate();
            this._environ.animate();
            this._environ._handlePhysicsObjects();
            // this._updateGravity();
            this._threejs.render(this._scene, this._camera);
            this._Step(t - this._previousRAF);
            this._previousRAF = t;
        });
    }
    _Step(timeElapsed) {
        const timeElapsedS = timeElapsed * 0.001;
        if (this._mixers) {
            this._mixers.map(m => m.update(timeElapsedS));
        }
        if (this._controls) {
            this._controls.Update(timeElapsedS);
        }
        this._world.step(1 / 60, timeElapsedS);
        this._thirdPersonCamera.Update(timeElapsedS);
    }
}
let _APP = null;
window.addEventListener('DOMContentLoaded', () => {
    _APP = new World();
});
