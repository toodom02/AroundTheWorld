import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';

import { CharacterController } from './character';
import { ThirdPersonCamera } from './camera';
import { Environment } from './environment';
import { Menu } from './menu';

export class World {
  private _menu: Menu;
  private _started = false;
  private _threejs: THREE.WebGLRenderer;
  private _camera: THREE.PerspectiveCamera;
  private _scene: THREE.Scene;
  private _world: CANNON.World;
  private _controls: CharacterController;
  private _thirdPersonCamera: ThirdPersonCamera;
  private _environ: Environment;
  private _cannonDebugRenderer?: ReturnType<typeof CannonDebugger>;
  private _groundMaterial: CANNON.Material;
  private _planetRadius = 100;
  private _previousRAF = 0;
  private _startTime = 0;
  private _debug = false;
  private _fireTexture: THREE.Texture;

  static async create(): Promise<World> {
    const world = new World();
    await world._init();
    return world;
  }

  private async _init(): Promise<void> {
    this._loadFireTexture();
    this._initRenderer();
    this._initCamera();
    this._initScene();
    this._initLighting();
    this._initPhysics();

    await this._loadPlayer();
    await this._loadEnvironment();

    this._thirdPersonCamera = new ThirdPersonCamera({
      camera: this._camera,
      target: this._controls,
    });

    this._initMenu();
    this._animateMenu();
  }

  private _loadFireTexture(): void {
    const loader = new THREE.TextureLoader();
    this._fireTexture = loader.load('./resources/fire.png');
  }

  private _initRenderer(): void {
    this._threejs = new THREE.WebGLRenderer({ antialias: true });
    this._threejs.shadowMap.enabled = true;
    this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
    this._threejs.setPixelRatio(window.devicePixelRatio);
    this._threejs.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this._threejs.domElement);
  }

  private _initCamera(): void {
    this._camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      750,
    );
    this._camera.position.set(0, 150, 300);
    this._camera.lookAt(0, 0, 0);

    window.addEventListener('resize', () => this._onWindowResize());
  }

  private _initScene(): void {
    this._scene = new THREE.Scene();
  }

  private _initLighting(): void {
    const dirLight = new THREE.DirectionalLight(0xffffff);
    dirLight.position.set(100, 100, 100);
    dirLight.castShadow = true;
    dirLight.shadow.bias = -0.001;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 500;
    dirLight.shadow.camera.left = 100;
    dirLight.shadow.camera.right = -100;
    dirLight.shadow.camera.top = 100;
    dirLight.shadow.camera.bottom = -100;

    this._scene.add(dirLight);

    const ambLight = new THREE.AmbientLight(0x202020, 20);
    this._scene.add(ambLight);
  }

  private _initPhysics(): void {
    this._world = new CANNON.World();
    this._world.gravity.set(0, -1, 0);

    this._groundMaterial = new CANNON.Material('groundMaterial');
    const contactMaterial = new CANNON.ContactMaterial(
      this._groundMaterial,
      this._groundMaterial,
      { friction: 0.4, restitution: 0.3 },
    );
    this._world.addContactMaterial(contactMaterial);

    this._world.addEventListener('postStep', () => {
      for (const body of this._world.bodies) {
        if (body.mass === 0) continue;
        const gravityForce = body.position.clone().negate().unit().scale(300 * body.mass);
        body.applyForce(gravityForce, body.position);
        body.force.y += body.mass; // negate world gravity
      }
    });

    if (this._debug) {
      this._cannonDebugRenderer = CannonDebugger(this._scene, this._world);
    }
  }

  private async _loadPlayer(): Promise<void> {
    this._controls = await CharacterController.create({
      camera: this._camera,
      scene: this._scene,
      world: this._world,
      groundMaterial: this._groundMaterial,
      initPosition: new THREE.Vector3(0, this._planetRadius, 0),
    });
  }

  private async _loadEnvironment(): Promise<void> {
    this._environ = await Environment.create({
      scene: this._scene,
      world: this._world,
      groundMaterial: this._groundMaterial,
      planetRadius: this._planetRadius,
      controller: this._controls,
      onGameOver: this._GameOver(),
    });
  }

  private _initMenu(): void {
    this._menu = new Menu({
      onStart: () => {
        this._Start();
        this._started = true;
        this._animate();
      },
      onRestart: () => {
        this._Start();
        this._started = true;
      },
    });

    this._menu.EnableStartMenu();
  }

  private _Start(): void {
    this._controls.ResetPlayer();
    this._startTime = performance.now();
    this._controls.Enable();
    this._thirdPersonCamera.startTransition();
    this._environ.startMeteors();
  }

  private _GameOver(): () => void {
    return () => {
      const score = Math.floor((performance.now() - this._startTime) * 0.001);
      this._controls.Disable();
      this._menu.ShowGameOver(score);
      this._environ.stopMeteors();
    }
  }

  private _onWindowResize(): void {
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMatrix();
    this._threejs.setSize(window.innerWidth, window.innerHeight);
  }

  private _animateMenu(): void {
    if (this._started) return;
    requestAnimationFrame(() => {
      this._animateMenu();
      this._environ.animate();
      this._threejs.render(this._scene, this._camera);
    });
  }

  private _animate(): void {
    if (!this._started) return;
    requestAnimationFrame(t => {
      if (!this._previousRAF) {
        this._previousRAF = t;
      }

      this._animate();
      this._update(t - this._previousRAF);
      this._previousRAF = t;

      this._environ.animate();
      this._environ.handlePhysicsObjects();

      if (this._debug) {
        this._cannonDebugRenderer?.update();
      }

      this._threejs.render(this._scene, this._camera);
    });
  }

  private _update(delta: number): void {
    const deltaSeconds = delta * 0.001;

    this._controls?.Update(deltaSeconds);
    this._thirdPersonCamera?.Update(deltaSeconds);

    this._world.step(1 / 60, deltaSeconds, 3);
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  await World.create();
});
