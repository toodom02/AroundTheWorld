import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';

import {CharacterController} from './character';
import {ThirdPersonCamera} from './camera';
import {Environment} from './environment';
import { Menu } from './menu';

class World {
  _menu: Menu;
  _started: boolean;
  _threejs: THREE.WebGLRenderer;
  _camera: THREE.PerspectiveCamera;
  _scene: THREE.Scene;
  _world: CANNON.World;
  _environ: Environment;
  _previousRAF: number;
  _controls: CharacterController;
  _playerBody: CANNON.Body;
  _thirdPersonCamera: ThirdPersonCamera;
  _groundMaterial: CANNON.Material;
  _score: number;
  _startTime: number;
  _initialMenu: boolean;
  _fireTexture: THREE.Texture;
  _planetRadius: number;
  _debug: boolean;
  _cannonDebugRenderer?: ReturnType<typeof CannonDebugger>;
  constructor() {
    this._Init();
  }

  _Init() {
    this._debug = false;
    this._fireTexture = new THREE.TextureLoader().load('./resources/fire.png');

    this._menu = new Menu({
      onStart: () => {
        this._Start();
        this._started = true;
        this._animate(); // TODO: trigger animate on load
      },
      onRestart: () => {
        this._Start();
        this._started = true;
      }
    });
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

    const ambLight = new THREE.AmbientLight(0x202020, 20);
    this._scene.add(ambLight);

    // initialise cannon world
    this._world = new CANNON.World();

    this._cannonDebugRenderer = this._debug
      ? CannonDebugger(this._scene, this._world)
      : undefined;

    this._world.gravity.set(0, -1, 0);
    this._world.addEventListener('postStep', () => {
      this._world.bodies.forEach(body => {
        if (body.mass === 0) return;
        const gravityForce = new CANNON.Vec3().copy(body.position).negate();
        gravityForce.normalize();
        gravityForce.scale(300 * body.mass, gravityForce);
        body.applyForce(gravityForce, body.position);
        body.force.y += body.mass; //cancel out world gravity
      });
    });

    this._groundMaterial = new CANNON.Material('groundMaterial');

    // Adjust constraint equation parameters for ground/ground contact
    const ground_ground_cm = new CANNON.ContactMaterial(
      this._groundMaterial,
      this._groundMaterial,
      {
        friction: 0.4,
        restitution: 0.3,
      },
    );
    this._world.addContactMaterial(ground_ground_cm);

    this._planetRadius = 100;
    this._previousRAF = 0;
    this._LoadAnimatedModel();

    // create eveything in scene/world
    this._environ = new Environment({
      scene: this._scene,
      world: this._world,
      groundMaterial: this._groundMaterial,
      planetRadius: this._planetRadius,
      controller: this._controls,
    });

    this._thirdPersonCamera = new ThirdPersonCamera({
      camera: this._camera,
      target: this._controls,
    });

    // const controls = new OrbitControls( this._camera, this._threejs.domElement );

    this._animateMenu();
  }

  _Start() {
    this._controls.ResetPlayer();
    this._startTime = performance.now();
    this._controls.Enable();
  }

  _GameOver() {
    this._controls.Disable();
    this._menu.ShowGameOver(this._score);
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
      groundMaterial: this._groundMaterial,
      initPosition: new THREE.Vector3(0, this._planetRadius, 0),
    });
  }

  _animateMenu() {
    if (!this._started) {
      requestAnimationFrame(() => {
        this._animateMenu();
        this._environ.animate();
        this._threejs.render(this._scene, this._camera);
      });
      if (this._menu.showMenu) {
        // enable start when assets loaded
        if (this._environ.environLoaded && this._controls.characterLoaded) {
          this._menu.EnableStartMenu();
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

      if (this._controls._isHit) {
        this._GameOver();
      } else {
        this._score = Math.floor((t - this._startTime) * 0.001);
      }

      this._animate();

      this._environ.animate();
      this._environ.handlePhysicsObjects();

      if (this._debug) {
        this._cannonDebugRenderer?.update();
      }
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
