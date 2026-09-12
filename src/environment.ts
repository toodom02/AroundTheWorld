import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader.js';
import {GAME_CONFIG} from './config';
import {Ball, Stars, Moon, Planet, Meteor, Coin, Heart} from './objects';
import {TargetRing} from './effects/targetRing';
import {ParticleEffects} from './effects/particles';
import {CharacterController} from './character';
import {AudioManager} from './audio';

type EnvironmentParams = {
  scene: THREE.Scene;
  world: CANNON.World;
  groundMaterial: CANNON.Material;
  planetRadius: number;
  controller: CharacterController;
  onGameOver: () => void;
  onUpdateScore: (score: number) => void;
  onScorePopup?: (position: THREE.Vector3, amount: number) => void;
  shakeCamera?: (strength: number) => void;
  registerPhysicsBody?: (body: CANNON.Body) => void;
  unregisterPhysicsBody?: (body: CANNON.Body) => void;
  audio: AudioManager;
};

export class Environment {
  private _atmosphereRadius: number;
  private _ball: Ball;
  private _stars: Stars;
  private _moon: Moon;
  private _planet: Planet;
  private _activeCoins: Map<string, Coin>;
  private _maxCoins = GAME_CONFIG.COINS.MAX_COINS;
  private _reservedCoins: Map<string, Coin>;
  private _activeHearts: Map<string, Heart>;
  private _maxHearts = GAME_CONFIG.HEARTS.MAX_HEARTS;
  private _reservedHearts: Map<string, Heart>;
  private _rings: TargetRing[] = [];
  private _effects: ParticleEffects;
  private _maxMeteors: number;
  private _activeMeteors: Map<string, Meteor>;
  private _reservedMeteors: Map<string, Meteor>;
  private _meteorIncreaseInterval = GAME_CONFIG.METEORS.INCREASE_INTERVAL;
  private _meteorIncreaseTimer: number | null = null;
  private _meteorsRunning = false;
  private _meteorSpawnCooldown = 0;
  private _maxMeteorsLimit = GAME_CONFIG.METEORS.MAX_COUNT;
  private _initialMeteors = GAME_CONFIG.METEORS.INITIAL_COUNT;

  private constructor(private _params: EnvironmentParams) {}

  public static async create(params: EnvironmentParams): Promise<Environment> {
    const env = new Environment(params);
    await env._init();
    return env;
  }

  private async _init() {
    this._atmosphereRadius = GAME_CONFIG.PHYSICS.ATMOSPHERE_RADIUS;
    this._maxMeteors = this._initialMeteors;
    this._activeMeteors = new Map<string, Meteor>();
    this._reservedMeteors = new Map<string, Meteor>();
    this._activeCoins = new Map<string, Coin>();
    this._reservedCoins = new Map<string, Coin>();
    this._activeHearts = new Map<string, Heart>();
    this._reservedHearts = new Map<string, Heart>();
    this._effects = new ParticleEffects({scene: this._params.scene});
    await Promise.all([
      this._createStars(),
      this._createMoon(),
      this._createPhysicsObject(),
      this._createPlanet(),
      this._initialiseMeteors(),
      this._initialiseCoins(),
      this._initialiseHearts(),
    ]);
  }

  public score = 0;

  private addScore(amount = 1, position?: THREE.Vector3) {
    this.score += amount;
    this._params.onUpdateScore(this.score);
    if (position) {
      this._params.onScorePopup?.(position, amount);
    }
  }

  private async _createPlanet() {
    this._planet = await Planet.create({
      scene: this._params.scene,
      world: this._params.world,
      groundMaterial: this._params.groundMaterial,
      planetRadius: this._params.planetRadius,
      atmosphereRadius: this._atmosphereRadius,
    });
  }

  private async _createPhysicsObject() {
    this._ball = await Ball.create({
      scene: this._params.scene,
      world: this._params.world,
      groundMaterial: this._params.groundMaterial,
      initPosition: new THREE.Vector3(5, this._params.planetRadius + 1, 15),
      registerPhysicsBody: this._params.registerPhysicsBody,
    });
  }

  public resetCoins() {
    this._activeCoins.forEach(coin => {
      coin.hideCoin();
    });
    this._activeHearts.forEach(heart => {
      heart.hide();
    });
    this.score = 0;
    this._params.onUpdateScore(this.score);
  }

  public resetEffects(): void {
    this._effects.reset();
  }

  public startMeteors() {
    this._maxMeteors = this._initialMeteors;
    this._meteorsRunning = true;
    this._activeMeteors.forEach(meteor => {
      meteor.delete();
    });

    this._startMeteorIncreaseTimer();
  }

  public pauseMeteors() {
    if (this._meteorIncreaseTimer !== null) {
      clearInterval(this._meteorIncreaseTimer);
      this._meteorIncreaseTimer = null;
    }
  }

  public resumeMeteors() {
    if (this._meteorsRunning) {
      this._startMeteorIncreaseTimer();
    }
  }

  public stopMeteors() {
    this._meteorsRunning = false;
    if (this._meteorIncreaseTimer !== null) {
      clearInterval(this._meteorIncreaseTimer);
      this._meteorIncreaseTimer = null;
    }
  }

  private _startMeteorIncreaseTimer() {
    if (this._meteorIncreaseTimer !== null) return;

    this._meteorIncreaseTimer = window.setInterval(() => {
      if (this._maxMeteors < this._maxMeteorsLimit) {
        this._maxMeteors++;
      }
    }, this._meteorIncreaseInterval);
  }

  private async _initialiseMeteors() {
    const template = await this._loadFBXModel(
      'meteor.fbx',
      './resources/models/',
    );
    const meteorPromises = Array.from({length: this._maxMeteorsLimit}).map(
      async () => {
        const key = (Math.random() + 1).toString(36).substring(7);
        const ring = new TargetRing({scene: this._params.scene});
        this._rings.push(ring);
        const meteor = await Meteor.create({
          key,
          model: template,
          scene: this._params.scene,
          world: this._params.world,
          controller: this._params.controller,
          atmosphereRadius: this._atmosphereRadius,
          planetRadius: this._params.planetRadius,
          groundMaterial: this._params.groundMaterial,
          activeMeteors: this._activeMeteors,
          reservedMeteors: this._reservedMeteors,
          showCoin: this._showCoin.bind(this),
          showHeart: this._showHeart.bind(this),
          ring,
          effects: this._effects,
          onImpact: this._params.shakeCamera,
          registerPhysicsBody: this._params.registerPhysicsBody,
          unregisterPhysicsBody: this._params.unregisterPhysicsBody,
        });
        this._reservedMeteors.set(key, meteor);
      },
    );
    await Promise.all(meteorPromises);
  }

  private _createMeteor() {
    const [key, meteor] = this._reservedMeteors.entries().next().value ?? [];
    if (!key || !meteor) return;
    meteor.show();
  }

  private _showCoin(position: THREE.Vector3) {
    const [key, coin] = this._reservedCoins.entries().next().value ?? [];
    if (!key || !coin) return;
    coin.showCoin(position);
  }

  private _showHeart(position: THREE.Vector3) {
    const [key, heart] = this._reservedHearts.entries().next().value ?? [];
    if (!key || !heart) return;
    heart.show(position);
  }

  private _onHeartCollected(position: THREE.Vector3) {
    if (this._params.controller.restoreHeart()) return;
    this.addScore(5, position);
  }

  private async _initialiseCoins() {
    const template = await this._loadFBXModel(
      'coin.fbx',
      './resources/models/',
    );
    const coinPromises = Array.from({length: this._maxCoins}).map(async () => {
      const key = (Math.random() + 1).toString(36).substring(7);
      const coin = await Coin.create({
        key,
        model: template,
        scene: this._params.scene,
        controller: this._params.controller,
        activeCoins: this._activeCoins,
        reservedCoins: this._reservedCoins,
        addScore: this.addScore.bind(this),
        audio: this._params.audio,
      });
      this._reservedCoins.set(key, coin);
    });
    await Promise.all(coinPromises);
  }

  private async _initialiseHearts() {
    const heartPromises = Array.from({length: this._maxHearts}).map(() => {
      const key = (Math.random() + 1).toString(36).substring(7);
      const heart = Heart.create({
        key,
        scene: this._params.scene,
        controller: this._params.controller,
        activeHearts: this._activeHearts,
        reservedHearts: this._reservedHearts,
        onCollect: (position: THREE.Vector3) =>
          this._onHeartCollected(position),
        audio: this._params.audio,
      });
      this._reservedHearts.set(key, heart);
      return Promise.resolve();
    });
    await Promise.all(heartPromises);
  }

  private _loadFBXModel(path: string, directory: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      const loader = new FBXLoader();
      loader.setPath(directory);
      loader.load(
        path,
        model => resolve(model),
        undefined,
        error => reject(error),
      );
    });
  }

  private async _createMoon() {
    this._moon = await Moon.create({
      scene: this._params.scene,
    });
  }

  private async _createStars() {
    this._stars = await Stars.create({
      scene: this._params.scene,
      atmosphereRadius: this._atmosphereRadius,
      planetRadius: this._params.planetRadius,
    });
  }

  handlePhysicsObjects(deltaSeconds: number) {
    if (this._ball) {
      this._ball.updatePosition();
    }

    if (this._activeMeteors.size < this._maxMeteors) {
      // Meteors now reach the ground quickly, so throttle spawns to avoid a
      // constant barrage.
      this._meteorSpawnCooldown -= deltaSeconds * 1000;
      if (this._meteorSpawnCooldown <= 0) {
        this._createMeteor();
        this._meteorSpawnCooldown =
          GAME_CONFIG.METEORS.SPAWN_INTERVAL * (0.7 + Math.random() * 0.6);
      }
    }

    this._activeMeteors.forEach(meteor => {
      meteor.updatePosition(deltaSeconds);
    });

    this._activeCoins.forEach(coin => coin.animate(deltaSeconds));
    this._activeHearts.forEach(heart => heart.animate(deltaSeconds));

    this._effects.update(deltaSeconds);
  }

  animate(deltaSeconds: number) {
    if (this._stars) {
      this._stars.animate(deltaSeconds);
    }

    if (this._moon) {
      this._moon.animate(deltaSeconds);
    }
  }
}
