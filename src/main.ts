import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import * as CANNON from 'https://cdn.skypack.dev/cannon-es@0.18.0';
// import cannonDebugger from 'https://cdn.skypack.dev/cannon-es-debugger@0.1.4';
// import { OrbitControls } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/OrbitControls';

import { CharacterController } from './character.js';
import { ThirdPersonCamera } from './camera.js';
import { Environment } from './environment.js';
import { Meteor } from './meteor.js';


class World {
    _loaded: any[];
    _started: boolean;
    _threejs: THREE.WebGLRenderer;
    _camera: THREE.PerspectiveCamera;
    _scene: THREE.Scene;
    _world: CANNON.World;
    gravity: number;
    _environ: Environment;
    _mixers: any[];
    _previousRAF: any;
    _planetRadius: number;
    _controls: CharacterController;
    _thirdPersonCamera: ThirdPersonCamera;
    groundMaterial: CANNON.Material;
    meteors: Meteor[];
    _score: number;
    _scorediv: HTMLElement;
    _initialMenu: boolean;
    constructor() {
        this._Init();
    }

    _Init() {
        this._initialMenu = true;
        this._scorediv = document.getElementById('score');
        this._started = false;
        this._threejs = new THREE.WebGLRenderer();
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
        const far = 750;

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
        // this.cannonDebugRenderer = new cannonDebugger(this._scene, this._world.bodies);

        this.groundMaterial = new CANNON.Material("groundMaterial");

        // Adjust constraint equation parameters for ground/ground contact
        const ground_ground_cm = new CANNON.ContactMaterial(this.groundMaterial, this.groundMaterial, {
            friction: 0.4,
            restitution: 0.3,
        });
        this._world.addContactMaterial(ground_ground_cm);

        // create eveything in scene/world
        this._environ = new Environment({
            scene: this._scene,
            world: this._world,
            groundMaterial: this.groundMaterial,
        });

        this._mixers = [];
        this._previousRAF = null;
        this._LoadAnimatedModel();

        this._Start();
        // const controls = new OrbitControls( this._camera, this._threejs.domElement );

        this._animateMenu();
    }

    _Start() {
        this._score = 0;
        this._scorediv.innerText = this._score.toString();
        this.meteors = [];
        this._thirdPersonCamera = new ThirdPersonCamera({
            camera: this._camera,
            target: this._controls,
        });
        this._controls.Enable();
    }

    _OnWindowResize() {
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();
        this._threejs.setSize(window.innerWidth, window.innerHeight);
    }

    _LoadAnimatedModel() {
        this._controls = new CharacterController({
            camera: this._camera,
            scene: this._scene,
            world: this._world,
            planetRadius: this._planetRadius,
            groundMaterial: this.groundMaterial,
        });
    }

    _updateMeteors() {
        for (let i = 0; i < this.meteors.length; i++) {
            this.meteors[i].update();

            // if meteor hit player
            if (this.meteors[i].hitPlayer) {
                this._GameOver();
                return;
            }

            // remove meteor once hit
            if (this.meteors[i].crash) {
                this.meteors.splice(i, 1);
                this._score += 1;
                this._scorediv.innerText = this._score.toString();
            }            
        }

        if (this.meteors.length < Math.min(5, this._score+1)) {
            this.meteors.push(
                new Meteor({
                    scene: this._scene,
                    world: this._world,
                    playerBody: this._controls.playerBody,
            }));
        } else if (this._score > 25 && this.meteors.length < this._score / 5) {
            this.meteors.push(
                new Meteor({
                    scene: this._scene,
                    world: this._world,
                    playerBody: this._controls.playerBody,
            }));
        }
    }

    _GameOver() {
        this._started = false;
        // delete all meteors
        for (const m of this.meteors) m.delete();
        this.meteors = [];

        this._thirdPersonCamera = null;
        this._controls.Disable();
        this._controls.ResetPlayer();

        this._camera.position.set(0, 150, 300);
        this._camera.lookAt(0, 0, 0);
        document.getElementById("scorediv").style.display="none";
        document.getElementById("gameover").style.display="flex";
        document.getElementById("gameover-score").innerText = this._score.toString();

        const restartButton = document.getElementById("restart-button");
        restartButton.onclick = function () {
            _APP._started = true;
            _APP._animate();
            document.getElementById("gameover").style.display="none";
            document.getElementById("scorediv").style.display="flex";
            _APP._Start();
        }
        
        this._animateMenu();
    }

    _animateMenu() {
        if (!this._started){
            requestAnimationFrame(() => {
                this._animateMenu();
                this._environ.animate();
                this._threejs.render(this._scene, this._camera);
            });
            if (this._initialMenu) {
                // enable start when assets loaded
                if (this._environ.environLoaded && this._controls.characterLoaded) {
                    const startButton = document.getElementById("start-button");
                    startButton.innerHTML = "Start";
                    startButton.onclick = function () {
                        _APP._started = true;
                        _APP._animate();
                        _APP._initialMenu = false;
                        const audioelem = <HTMLAudioElement> document.getElementById('music')
                        audioelem.play(); audioelem.volume = 0.2;
                        document.getElementById("menu").style.display="none";
                        document.getElementById("scorediv").style.display="flex";
                    };
                }
            }
        }
    }

    _animate() {
        if (!this._started) return;
        requestAnimationFrame((t) => {
            if (this._previousRAF === null) {
                this._previousRAF = t;
            }
        
            this._animate();

            this._environ.animate();
            this._environ._handlePhysicsObjects();

            this._updateMeteors();

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

        if (this._thirdPersonCamera) {
            this._thirdPersonCamera.Update(timeElapsedS);
        }

        this._world.step(1/60, timeElapsedS);
    }

}

let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
    _APP = new World();
})
