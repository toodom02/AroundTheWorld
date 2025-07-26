import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {Ball, Stars, Moon, Planet} from './objects';
import { Meteor } from './objects/meteor';
import { CharacterController } from './character';

export class Environment {
  _params: {
    scene: THREE.Scene;
    world: CANNON.World;
    groundMaterial: CANNON.Material;
    planetRadius: number;
    controller: CharacterController;
  };
  _atmosphereRadius: number;
  _ball: Ball;
  _stars: Stars;
  _moon: Moon;
  _planet: Planet;
  _maxMeteors: number;
  _activeMeteors: Map<string, Meteor>;
  _reservedMeteors: Map<string, Meteor>;
  environLoaded: boolean;
  constructor(params: {
    scene: THREE.Scene;
    world: CANNON.World;
    groundMaterial: CANNON.Material;
    planetRadius: number;
    controller: CharacterController;
  }) {
    this._params = params;
    this._Init();
  }

  _Init() {
    this.environLoaded = false;
    this._atmosphereRadius = 100;
    this._maxMeteors = 5;
    this._activeMeteors = new Map<string, Meteor>();
    this._reservedMeteors = new Map<string, Meteor>();
    this._createStars();
    this._createMoon();
    this._createPhysicsObject();
    this._createPlanet();
    this._initialiseMeteors();
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

  _initialiseMeteors() {
    for (let i = 0; i < this._maxMeteors; i++) {
      const key = (Math.random() + 1).toString(36).substring(7);
      this._reservedMeteors.set(
        key,
        new Meteor({
          key,
          scene: this._params.scene,
          world: this._params.world,
          controller: this._params.controller,
          atmosphereRadius: this._atmosphereRadius,
          planetRadius: this._params.planetRadius,
          groundMaterial: this._params.groundMaterial,
          activeMeteors: this._activeMeteors,
          reservedMeteors: this._reservedMeteors,
        })
      );    
    }
  }

  _createMeteor() {
    const [key, meteor] = this._reservedMeteors.entries().next().value ?? [];
    if (!key || !meteor) return;
    meteor.show();
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
