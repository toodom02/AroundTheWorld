import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {Ball, Stars, Moon, Planet} from './objects';

export class Environment {
  _params: {
    scene: THREE.Scene;
    world: CANNON.World;
    groundMaterial: CANNON.Material;
    planetRadius: number;
  };
  _atmosphereRadius: number;
  _ball: Ball;
  _stars: Stars;
  _moon: Moon;
  _planet: Planet;
  environLoaded: boolean;
  constructor(params: {
    scene: THREE.Scene;
    world: CANNON.World;
    groundMaterial: CANNON.Material;
    planetRadius: number;
  }) {
    this._params = params;
    this._Init();
  }

  _Init() {
    this.environLoaded = false;
    this._atmosphereRadius = 100;
    this._createStars();
    this._createMoon();
    this._createPhysicsObject();
    this._createPlanet();
    this.environLoaded = true;
  }

  _createPlanet() {
    this._planet = new Planet({
      scene: this._params.scene,
      world: this._params.world,
      groundMaterial: this._params.groundMaterial,
      planetRadius: this._params.planetRadius,
      atmosphereRadius: this._atmosphereRadius,
    });
  }

  _createPhysicsObject() {
    this._ball = new Ball({
      scene: this._params.scene,
      world: this._params.world,
      groundMaterial: this._params.groundMaterial,
      initPosition: new THREE.Vector3(5, this._params.planetRadius + 1, 15),
    });
  }

  _createMoon() {
    this._moon = new Moon({
      scene: this._params.scene,
    });
  }

  _createStars() {
    this._stars = new Stars({
      scene: this._params.scene,
      atmosphereRadius: this._atmosphereRadius,
      planetRadius: this._params.planetRadius,
    });
  }

  handlePhysicsObjects() {
    if (this._ball) {
      this._ball.updatePosition();
    }
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
