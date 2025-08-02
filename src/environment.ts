import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {Ball, Stars, Moon, Planet} from './objects';
import { Meteor } from './objects/meteor';
import { CharacterController } from './character';

interface EnvironmentParams {
  scene: THREE.Scene;
  world: CANNON.World;
  groundMaterial: CANNON.Material;
  planetRadius: number;
  controller: CharacterController;
  onGameOver: () => void;
}

export class Environment {
  _atmosphereRadius: number;
  _ball: Ball;
  _stars: Stars;
  _moon: Moon;
  _planet: Planet;
  _maxMeteors: number;
  _activeMeteors: Map<string, Meteor>;
  _reservedMeteors: Map<string, Meteor>;
  environLoaded: boolean;

  private constructor(private _params: EnvironmentParams) {}

  public static async create(params: EnvironmentParams): Promise<Environment> {
    const env = new Environment(params);
    await env._init();
    return env;
  }

  private async _init() {
    this._atmosphereRadius = 100;
    this._maxMeteors = 5;
    this._activeMeteors = new Map<string, Meteor>();
    this._reservedMeteors = new Map<string, Meteor>();
    await Promise.all([
      this._createStars(),
      this._createMoon(),
      this._createPhysicsObject(),
      this._createPlanet(),
      this._initialiseMeteors(),
    ]);
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

  private async _initialiseMeteors() {
    const meteorPromises = Array.from({ length: this._maxMeteors })
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
        });
        this._reservedMeteors.set(key, meteor);
      });
    await Promise.all(meteorPromises);
  }

  _createMeteor() {
    const [key, meteor] = this._reservedMeteors.entries().next().value ?? [];
    if (!key || !meteor) return;
    meteor.show();
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
