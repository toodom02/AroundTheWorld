import * as THREE from 'three';
import { Ball, Stars, Moon, Planet } from './objects';
export class Environment {
    _params;
    _atmosphereRadius;
    _ball;
    _stars;
    _moon;
    _planet;
    environLoaded;
    constructor(params) {
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
    _handlePhysicsObjects() {
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
//# sourceMappingURL=environment.js.map