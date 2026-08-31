import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';

import { GAME_CONFIG } from './config';
import { CharacterController } from './character';
import { ThirdPersonCamera } from './camera';
import { Environment } from './environment';
import { Menu } from './menu';

enum WorldState {
  INITIALIZING,
  IDLE,
  PLAYING,
  GAME_OVER,
}

export class World {
  private _menu: Menu;
  private _started = false;

  private _state = WorldState.INITIALIZING;
  private _threejs: THREE.WebGLRenderer;
  private _camera: THREE.PerspectiveCamera;
  private _scene: THREE.Scene;
  private _world: CANNON.World;
  private _controls: CharacterController;
  private _thirdPersonCamera: ThirdPersonCamera;
  private _environ: Environment;
  private _cannonDebugRenderer?: ReturnType<typeof CannonDebugger>;
  private _groundMaterial: CANNON.Material;
  private _planetRadius = GAME_CONFIG.PHYSICS.PLANET_RADIUS;
  private _previousRAF = 0;
  private _debug = false;
  private _fireTexture: THREE.Texture;
  private _dynamicBodies: CANNON.Body[] = [];

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
    this._state = WorldState.IDLE;
    this._animateMenu();
  }

  private _loadFireTexture(): void {
    const loader = new THREE.TextureLoader();
    this._fireTexture = loader.load('./resources/fire.png');
  }

  private _initRenderer(): void {
    this._threejs = new THREE.WebGLRenderer({ antialias: true });
    this._threejs.shadowMap.enabled = true;
    
    const isMobile = /Android|webOS|iPhone|iPad/i.test(navigator.userAgent);
    this._threejs.shadowMap.type = isMobile ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    this._threejs.setPixelRatio(Math.min(window.devicePixelRatio, GAME_CONFIG.RENDERING.DEFAULT_PIXEL_RATIO_CAP));
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
    const shadowSize = GAME_CONFIG.RENDERING.SHADOW_MAP_SIZE;
    dirLight.shadow.mapSize.set(shadowSize, shadowSize);
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
      this._applyCustomGravity();
    });

    if (this._debug) {
      this._cannonDebugRenderer = CannonDebugger(this._scene, this._world);
    }
  }

  private _applyCustomGravity(): void {
    for (const body of this._dynamicBodies) {
      const pos = body.position;
      const length = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
      if (length > 0) {
        // Apply radial gravity toward planet center
        const scale = (GAME_CONFIG.PHYSICS.GRAVITY_FORCE_SCALE * body.mass) / length;
        body.force.x -= pos.x * scale;
        body.force.y -= pos.y * scale;
        body.force.z -= pos.z * scale;
      }
    }
  }

  private _registerDynamicBody(body: CANNON.Body): void {
    if (!this._dynamicBodies.includes(body)) {
      this._dynamicBodies.push(body);
    }
  }

  private _unregisterDynamicBody(body: CANNON.Body): void {
    const index = this._dynamicBodies.indexOf(body);
    if (index >= 0) {
      this._dynamicBodies.splice(index, 1);
    }
  }

  private async _loadPlayer(): Promise<void> {
    this._controls = await CharacterController.create({
      camera: this._camera,
      scene: this._scene,
      world: this._world,
      groundMaterial: this._groundMaterial,
      initPosition: new THREE.Vector3(0, this._planetRadius, 0),
      registerPhysicsBody: (body: CANNON.Body) => this._registerDynamicBody(body),
      onGameOver: this._onGameOver.bind(this),
    });
  }

  private async _loadEnvironment(): Promise<void> {
    this._environ = await Environment.create({
      scene: this._scene,
      world: this._world,
      groundMaterial: this._groundMaterial,
      planetRadius: this._planetRadius,
      controller: this._controls,
      onGameOver: this._onGameOver.bind(this),
      onUpdateScore: (score: number) => this._menu.UpdateScore(score),
      registerPhysicsBody: (body: CANNON.Body) => this._registerDynamicBody(body),
      unregisterPhysicsBody: (body: CANNON.Body) => this._unregisterDynamicBody(body),
    });
  }

  private _initMenu(): void {
    this._menu = new Menu({
      onStart: () => {
        this._Start();
        this._started = true;
        this._state = WorldState.PLAYING;
        this._animate();
      },
      onRestart: () => {
        this._Start();
        this._started = true;
        this._state = WorldState.PLAYING;
      },
    });

    this._menu.EnableStartMenu();
  }

  private _Start(): void {
    this._controls.ResetPlayer();
    this._controls.Enable();
    this._thirdPersonCamera.startTransition();
    this._environ.startMeteors();
    this._environ.resetCoins();
  }



  private _onGameOver(): void {
    if (this._state === WorldState.GAME_OVER) return;
    
    this._state = WorldState.GAME_OVER;
    this._controls.Disable();
    this._menu.ShowGameOver(this._environ.score);
    this._environ.stopMeteors();
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
