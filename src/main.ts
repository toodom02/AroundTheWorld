import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import type CannonDebuggerType from 'cannon-es-debugger';

import {GAME_CONFIG} from './config';
import {CharacterController} from './character';
import {ThirdPersonCamera} from './camera';
import {Environment} from './environment';
import {Menu} from './menu';
import {AudioManager} from './audio';

enum WorldState {
  INITIALIZING,
  IDLE,
  PLAYING,
  GAME_OVER,
}

export class World {
  private _menu: Menu;

  private _state = WorldState.INITIALIZING;
  private _threejs: THREE.WebGLRenderer;
  private _camera: THREE.PerspectiveCamera;
  private _scene: THREE.Scene;
  private _world: CANNON.World;
  private _controls: CharacterController;
  private _thirdPersonCamera: ThirdPersonCamera;
  private _environ: Environment;
  private _cannonDebugRenderer?: ReturnType<typeof CannonDebuggerType>;
  private _groundMaterial: CANNON.Material;
  private _dirLight: THREE.DirectionalLight;
  private _planetRadius = GAME_CONFIG.PHYSICS.PLANET_RADIUS;
  private _debug = false;
  private _dynamicBodies: CANNON.Body[] = [];
  private _audio = new AudioManager();

  private _rafId = 0;
  private _previousRAF = 0;

  private _qualityTier = 0;
  private _frameCount = 0;
  private _fpsWindowMs = 0;
  private _lowFpsChecks = 0;
  private _highFpsChecks = 0;

  static async create(): Promise<World> {
    const world = new World();
    await world._init();
    return world;
  }

  private async _init(): Promise<void> {
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

    document.addEventListener('visibilitychange', this._onVisibilityChange);
    window.addEventListener('resize', () => this._onWindowResize());

    this._startLoop();
  }

  private _initRenderer(): void {
    this._threejs = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this._threejs.shadowMap.enabled = true;

    const isMobile = /Android|webOS|iPhone|iPad/i.test(navigator.userAgent);
    this._threejs.shadowMap.type = isMobile
      ? THREE.PCFShadowMap
      : THREE.PCFSoftShadowMap;

    this._restoreQualityTier();
    this._applyPixelRatio();
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
  }

  private _initScene(): void {
    this._scene = new THREE.Scene();
  }

  private _initLighting(): void {
    this._dirLight = new THREE.DirectionalLight(0xffffff);
    this._dirLight.position.set(100, 100, 100);
    this._dirLight.castShadow = true;
    this._dirLight.shadow.bias = -0.001;
    this._dirLight.shadow.camera.near = 0.5;
    this._dirLight.shadow.camera.far = 500;
    this._dirLight.shadow.camera.left = 100;
    this._dirLight.shadow.camera.right = -100;
    this._dirLight.shadow.camera.top = 100;
    this._dirLight.shadow.camera.bottom = -100;
    this._applyShadowMapSize();

    this._scene.add(this._dirLight);

    const ambLight = new THREE.AmbientLight(0x202020, 20);
    this._scene.add(ambLight);
  }

  private _initPhysics(): void {
    this._world = new CANNON.World();
    // Small world gravity provides the tangential bias the ball needs to roll
    // along the planet surface; the main pull is the custom radial gravity
    // applied in postStep (_applyCustomGravity).
    this._world.gravity.set(0, -1, 0);

    this._groundMaterial = new CANNON.Material('groundMaterial');
    const contactMaterial = new CANNON.ContactMaterial(
      this._groundMaterial,
      this._groundMaterial,
      {friction: 0.4, restitution: 0.3},
    );
    this._world.addContactMaterial(contactMaterial);

    this._world.addEventListener('postStep', () => {
      this._applyCustomGravity();
    });

    if (this._debug) {
      void import('cannon-es-debugger').then(({default: CannonDebugger}) => {
        this._cannonDebugRenderer = CannonDebugger(this._scene, this._world);
      });
    }
  }

  private _applyCustomGravity(): void {
    for (const body of this._dynamicBodies) {
      const pos = body.position;
      const length = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
      if (length > 0) {
        // Apply radial gravity toward planet center
        const scale =
          (GAME_CONFIG.PHYSICS.GRAVITY_FORCE_SCALE * body.mass) / length;
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
      registerPhysicsBody: (body: CANNON.Body) =>
        this._registerDynamicBody(body),
      onGameOver: this._onGameOver.bind(this),
      audio: this._audio,
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
      registerPhysicsBody: (body: CANNON.Body) =>
        this._registerDynamicBody(body),
      unregisterPhysicsBody: (body: CANNON.Body) =>
        this._unregisterDynamicBody(body),
      audio: this._audio,
    });
  }

  private _initMenu(): void {
    this._menu = new Menu({
      onStart: () => {
        this._Start();
        this._state = WorldState.PLAYING;
      },
      onRestart: () => {
        this._Start();
        this._state = WorldState.PLAYING;
      },
      audio: this._audio,
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

  private _applyPixelRatio(): void {
    const cap =
      GAME_CONFIG.RENDERING.QUALITY_TIERS.PIXEL_RATIOS[this._qualityTier];
    const ratio = Math.min(window.devicePixelRatio, cap);
    this._threejs.setPixelRatio(ratio);
  }

  private _applyQualityTier(tier: number): void {
    this._qualityTier = tier;
    this._applyShadowMapSize();
    this._applyPixelRatio();
    try {
      localStorage.setItem(
        GAME_CONFIG.RENDERING.QUALITY_STORAGE_KEY,
        String(tier),
      );
    } catch {
      // storage unavailable; keep quality in memory only
    }
  }

  private _applyShadowMapSize(): void {
    const shadowSize =
      GAME_CONFIG.RENDERING.QUALITY_TIERS.SHADOW_MAP_SIZES[this._qualityTier];
    this._dirLight.shadow.mapSize.set(shadowSize, shadowSize);
  }

  private _restoreQualityTier(): void {
    try {
      const stored = localStorage.getItem(
        GAME_CONFIG.RENDERING.QUALITY_STORAGE_KEY,
      );
      if (stored !== null) {
        const tier = parseInt(stored, 10);
        if (
          tier >= 0 &&
          tier < GAME_CONFIG.RENDERING.QUALITY_TIERS.PIXEL_RATIOS.length
        ) {
          this._qualityTier = tier;
        }
      }
    } catch {
      // storage unavailable
    }
  }

  private _adaptQuality(deltaSeconds: number): void {
    const quality = GAME_CONFIG.RENDERING.QUALITY_TIERS;
    this._frameCount++;
    this._fpsWindowMs += deltaSeconds * 1000;

    if (this._fpsWindowMs >= quality.TIER_MS) {
      const fps = (this._frameCount * 1000) / this._fpsWindowMs;

      if (
        fps < quality.MIN_FPS_LOW &&
        this._qualityTier < quality.PIXEL_RATIOS.length - 1
      ) {
        this._lowFpsChecks++;
        this._highFpsChecks = 0;
        if (this._lowFpsChecks >= 2) {
          this._applyQualityTier(this._qualityTier + 1);
          this._lowFpsChecks = 0;
        }
      } else if (fps >= quality.MIN_FPS_HIGH && this._qualityTier > 0) {
        this._highFpsChecks++;
        this._lowFpsChecks = 0;
        if (this._highFpsChecks >= 5) {
          this._applyQualityTier(this._qualityTier - 1);
          this._highFpsChecks = 0;
        }
      } else {
        this._lowFpsChecks = 0;
        this._highFpsChecks = 0;
      }

      this._frameCount = 0;
      this._fpsWindowMs = 0;
    }
  }

  private _onWindowResize(): void {
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMatrix();
    this._applyPixelRatio();
    this._threejs.setSize(window.innerWidth, window.innerHeight);
  }

  private _onVisibilityChange = (): void => {
    if (document.hidden) {
      cancelAnimationFrame(this._rafId);
      this._environ.pauseMeteors();
      this._previousRAF = 0;
    } else {
      this._environ.resumeMeteors();
      this._startLoop();
    }
  };

  private _startLoop(): void {
    cancelAnimationFrame(this._rafId);

    const loop = (t: number): void => {
      this._rafId = requestAnimationFrame(loop);

      const deltaMs = this._previousRAF ? t - this._previousRAF : 16;
      this._previousRAF = t;
      // Clamp to avoid physics blow-up after a hitch or background tab.
      const deltaSeconds = Math.min(deltaMs * 0.001, 0.1);

      this._adaptQuality(deltaSeconds);
      this._environ.animate();

      if (
        this._state === WorldState.PLAYING ||
        this._state === WorldState.GAME_OVER
      ) {
        this._update(deltaSeconds);
        this._environ.handlePhysicsObjects();
      }

      if (this._debug && this._cannonDebugRenderer) {
        this._cannonDebugRenderer.update();
      }

      this._threejs.render(this._scene, this._camera);
    };

    this._rafId = requestAnimationFrame(loop);
  }

  private _update(deltaSeconds: number): void {
    this._controls.Update(deltaSeconds);
    this._thirdPersonCamera.Update(deltaSeconds);

    this._world.step(1 / 60, deltaSeconds, 3);
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  await World.create();
});
