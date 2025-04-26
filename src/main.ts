import * as THREE from 'three';
import * as CANNON from 'cannon-es';

import {CharacterController} from './character';
import {ThirdPersonCamera} from './camera';
import {Environment} from './environment';

class World {
  _started: boolean;
  _threejs: THREE.WebGLRenderer;
  _camera: THREE.PerspectiveCamera;
  _scene: THREE.Scene;
  _world: CANNON.World;
  gravity: number;
  _environ: Environment;
  _previousRAF: number;
  _controls: CharacterController;
  _thirdPersonCamera: ThirdPersonCamera;
  groundMaterial: CANNON.Material;
  _score: number;
  _scorediv: HTMLElement;
  _initialMenu: boolean;
  fireTexture: THREE.Texture;
  constructor() {
    this._Init();
  }

  _Init() {
    this.fireTexture = new THREE.TextureLoader().load('./resources/fire.png');

    this._initialMenu = true;
    this._scorediv = document.getElementById('score')!;
    this._started = false;
    this._threejs = new THREE.WebGLRenderer();
    this._threejs.shadowMap.enabled = true;
    this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
    this._threejs.setPixelRatio(window.devicePixelRatio);
    this._threejs.setSize(window.innerWidth, window.innerHeight);

    document.body.appendChild(this._threejs.domElement);

    window.addEventListener(
      'resize',
      () => {
        this._OnWindowResize();
      },
      false,
    );

    const fov = 75;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.1;
    const far = 750;

    this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this._camera.position.set(0, 150, 300);
    this._camera.lookAt(0, 0, 0);

    this._scene = new THREE.Scene();

    const dirLight = new THREE.DirectionalLight(0xffffff);
    dirLight.position.set(100, 100, 100);
    dirLight.target.position.set(0, 0, 0);
    dirLight.castShadow = true;
    dirLight.shadow.bias = -0.001;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 500.0;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 500.0;
    dirLight.shadow.camera.left = 100;
    dirLight.shadow.camera.right = -100;
    dirLight.shadow.camera.top = 100;
    dirLight.shadow.camera.bottom = -100;
    this._scene.add(dirLight);

    const ambLight = new THREE.AmbientLight(0x202020, 2);
    this._scene.add(ambLight);

    // initialise cannon world
    this._world = new CANNON.World();
    this.gravity = 100;
    this._world.gravity.set(0, -100, 0);
    // this.cannonDebugRenderer = new cannonDebugger(this._scene, this._world.bodies);

    this.groundMaterial = new CANNON.Material('groundMaterial');

    // Adjust constraint equation parameters for ground/ground contact
    const ground_ground_cm = new CANNON.ContactMaterial(
      this.groundMaterial,
      this.groundMaterial,
      {
        friction: 0.4,
        restitution: 0.3,
      },
    );
    this._world.addContactMaterial(ground_ground_cm);

    // create eveything in scene/world
    this._environ = new Environment({
      scene: this._scene,
      world: this._world,
      groundMaterial: this.groundMaterial,
    });

    this._previousRAF = 0;
    this._LoadAnimatedModel();

    this._thirdPersonCamera = new ThirdPersonCamera({
      camera: this._camera,
      target: this._controls,
    });

    this._Start();
    // const controls = new OrbitControls( this._camera, this._threejs.domElement );

    this._animateMenu();
  }

  _Start() {
    this._score = 0;
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
      groundMaterial: this.groundMaterial,
    });
  }

  _animateMenu() {
    if (!this._started) {
      requestAnimationFrame(() => {
        this._animateMenu();
        this._environ.animate();
        this._threejs.render(this._scene, this._camera);
      });
      if (this._initialMenu) {
        // enable start when assets loaded
        if (this._environ.environLoaded && this._controls.characterLoaded) {
          const startButton = document.getElementById('start-button')!;
          startButton.innerHTML = 'Start';
          startButton.classList.add('loaded');
          startButton.onclick = () => {
            if (!_APP) return;
            _APP._started = true;
            _APP._animate();
            _APP._initialMenu = false;
            const audioelem = <HTMLAudioElement>(
              document.getElementById('music')
            );
            void audioelem.play();
            audioelem.volume = 0.2;
            document.getElementById('menu')!.style.display = 'none';
            // document.getElementById('scorediv')!.style.display = 'flex';
          };
        }
      }
    }
  }

  _animate() {
    if (!this._started) return;
    requestAnimationFrame(t => {
      if (this._previousRAF === null) {
        this._previousRAF = t;
      }

      this._animate();

      this._environ.animate();
      this._environ._handlePhysicsObjects();

      this._threejs.render(this._scene, this._camera);
      this._Step(t - this._previousRAF);
      this._previousRAF = t;
    });
  }

  _Step(timeElapsed: number) {
    const timeElapsedS = timeElapsed * 0.001;

    if (this._controls) {
      this._controls.Update(timeElapsedS);
    }

    if (this._thirdPersonCamera) {
      this._thirdPersonCamera.Update(timeElapsedS);
    }

    this._world.step(1 / 60, timeElapsedS);
  }
}

let _APP: World | null = null;

window.addEventListener('DOMContentLoaded', () => {
  _APP = new World();
});
