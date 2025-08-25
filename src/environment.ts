import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {Ball, Stars, Moon, Planet, Meteor, Coin} from './objects';
import { CharacterController } from './character';

interface EnvironmentParams {
  scene: THREE.Scene;
  world: CANNON.World;
  groundMaterial: CANNON.Material;
  planetRadius: number;
  controller: CharacterController;
  onGameOver: () => void;
  onUpdateScore: (score: number) => void;
}

export class Environment {
  _atmosphereRadius: number;
  _ball: Ball;
  _stars: Stars;
  _moon: Moon;
  _planet: Planet;
  _activeCoins: Map<string, Coin>;
  _maxCoins = 20;
  _reservedCoins: Map<string, Coin>;
  _maxMeteors: number;
  _activeMeteors: Map<string, Meteor>;
  _reservedMeteors: Map<string, Meteor>;
  _meteorIncreaseInterval = 7500;
  _meteorIncreaseTimer: number | null = null;
  _maxMeteorsLimit = 25;
  _initialMeteors = 5;

  private constructor(private _params: EnvironmentParams) {}

  public static async create(params: EnvironmentParams): Promise<Environment> {
    const env = new Environment(params);
    await env._init();
    return env;
  }

  private async _init() {
    this._atmosphereRadius = 100;
    this._maxMeteors = this._initialMeteors;
    this._activeMeteors = new Map<string, Meteor>();
    this._reservedMeteors = new Map<string, Meteor>();
    this._activeCoins = new Map<string, Coin>();
    this._reservedCoins = new Map<string, Coin>();
    await Promise.all([
      this._createStars(),
      this._createMoon(),
      this._createPhysicsObject(),
      this._createPlanet(),
      this._initialiseMeteors(),
      this._initialiseCoins(),
    ]);
  }

  public score = 0;

  private addScore(amount: number = 1) {
    this.score += amount;
    this._params.onUpdateScore(this.score);
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
    });
  }

  public resetCoins() {
    this._activeCoins.forEach((coin, _) => {
      coin.hideCoin();
    });
    this.score = 0;
    this._params.onUpdateScore(this.score);
  }

  public startMeteors() {
    this._maxMeteors = this._initialMeteors;
    this._activeMeteors.forEach((meteor, _) => {
      meteor.delete();
    });

    this._meteorIncreaseTimer = window.setInterval(() => {
      if (this._maxMeteors < this._maxMeteorsLimit) {
        this._maxMeteors++;
      }
    }, this._meteorIncreaseInterval);
  }

  public stopMeteors() {
    if (this._meteorIncreaseTimer) {
      clearInterval(this._meteorIncreaseTimer);
      this._meteorIncreaseTimer = null;
    }
  }

  private async _initialiseMeteors() {
    const meteorPromises = Array.from({ length: this._maxMeteorsLimit })
      .map(async () => {
        const key = (Math.random() + 1).toString(36).substring(7);
        const meteor = await Meteor.create({
          key,
          scene: this._params.scene,
          world: this._params.world,
          controller: this._params.controller,
          onGameOver: this._params.onGameOver,
          atmosphereRadius: this._atmosphereRadius,
          planetRadius: this._params.planetRadius,
          groundMaterial: this._params.groundMaterial,
          activeMeteors: this._activeMeteors,
          reservedMeteors: this._reservedMeteors,
          showCoin: this._showCoin.bind(this),
        });
        this._reservedMeteors.set(key, meteor);
      });
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

  private async _initialiseCoins() {
    const coinPromises = Array.from({ length: this._maxCoins })
      .map(async () => {
        const key = (Math.random() + 1).toString(36).substring(7);
        const coin = await Coin.create({
          key,
          scene: this._params.scene,
          controller: this._params.controller,
          activeCoins: this._activeCoins,
          reservedCoins: this._reservedCoins,
          addScore: this.addScore.bind(this),
        });
        this._reservedCoins.set(key, coin);
      });
    await Promise.all(coinPromises);
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

  handlePhysicsObjects() {
    if (this._ball) {
      this._ball.updatePosition();
    }

    if (this._activeMeteors.size < this._maxMeteors) {
      this._createMeteor();
    }

    this._activeMeteors.forEach(meteor => {
      meteor.updatePosition();
    });

    this._activeCoins.forEach(coin => coin.animate());
  }

  animate() {
    if (this._stars) {
      this._stars.animate();
    }

    if (this._moon) {
      this._moon.animate();
    }
  }
}
