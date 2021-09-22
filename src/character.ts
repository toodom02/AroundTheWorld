import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { FBXLoader } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/loaders/FBXLoader';
import * as CANNON from 'https://cdn.skypack.dev/cannon-es@0.18.0';

import { CharacterFSM } from './characterAnimations.js';

class CharacterControllerProxy {
    _animations: any;
    constructor(animations) {
      this._animations = animations;
    }
  
    get animations() {
      return this._animations;
    }
  };

export class CharacterController {
    _params: any;
    startingPos: THREE.Vector3;
    canJump: boolean;
    _animations: {};
    _input: CharacterControllerInput;
    _stateMachine: CharacterFSM;
    _target: any;
    bodyRadius: number;
    playerBody: CANNON.Body;
    _mixer: any;
    _manager: any;
    inputVelocity: THREE.Vector3;
    velocityFactor: number;
    jumpVelocity: number;
    constructor(params) {
        this._params = params;
        this._Init();
    }

    _Init() {
        this.startingPos = new THREE.Vector3(10, 1, 0);

        this.inputVelocity = new THREE.Vector3();
        this.velocityFactor = 0.2;
        this.jumpVelocity = 50;
        this.canJump = false;
        
        this._animations = {};
        this._input = new CharacterControllerInput();
        this._stateMachine = new CharacterFSM(new CharacterControllerProxy(this._animations));

        this._LoadModels();
    }

    _LoadModels() {
        const loader = new FBXLoader();
        loader.setPath('./resources/models/');
        loader.load('timmy.fbx', (fbx) => {
            fbx.scale.setScalar(0.1);
            fbx.traverse(c => {
                c.castShadow = true;
            });
            fbx.position.copy(this.startingPos);
        
            this._target = fbx;
            this._params.scene.add(this._target);

            // make physics sphere
            const slipperyMaterial = new CANNON.Material("slipperyMaterial");
            const slippery_ground_cm = new CANNON.ContactMaterial(this._params.groundMaterial, slipperyMaterial, {
                friction: 0,
                restitution: 0.3,
            });
            this._params.world.addContactMaterial(slippery_ground_cm);

            const halfExtents = new THREE.Vector3(2, 4, 2);
            this.bodyRadius = halfExtents.y;
            this.playerBody = new CANNON.Body({
                mass: 50,
                shape: new CANNON.Box(halfExtents),
                linearDamping: 0.9,
                material: slipperyMaterial,
            });
            this.playerBody.position.x = fbx.position.x;
            this.playerBody.position.y = fbx.position.y+this.bodyRadius;
            this.playerBody.position.z = fbx.position.z;
            this._params.world.addBody(this.playerBody);
            
            this.playerBody.allowSleep = false;
            this.playerBody.fixedRotation = true;
            this.playerBody.updateMassProperties();

            // manage animations
            this._mixer = new THREE.AnimationMixer(this._target);

            this._manager = new THREE.LoadingManager();
            this._manager.onLoad = () => {
                this._stateMachine.SetState('idle');
                this._params.loaded.push('anims');
            };

            const _OnLoad = (animName, anim) => {
                const clip = anim.animations[0];
                const action = this._mixer.clipAction(clip);

                this._animations[animName] = {
                    clip: clip,
                    action: action,
                };
            };

            const loader = new FBXLoader(this._manager);
            loader.setPath('./resources/animations/');
            loader.load('idle.fbx', (a) => { _OnLoad('idle', a);});
            loader.load('jump.fbx', (a) => { _OnLoad('jump', a);});
            loader.load('walk.fbx', (a) => { _OnLoad('walk', a);});
            loader.load('run.fbx', (a) => { _OnLoad('run', a);});
            loader.load('walkback.fbx', (a) => { _OnLoad('walkback', a);});
            loader.load('runback.fbx', (a) => { _OnLoad('runback', a);});

            const contactNormal = new CANNON.Vec3() // Normal in the contact, pointing *out* of whatever the player touched
            const upAxis = new CANNON.Vec3(0, 1, 0)
            this.playerBody.addEventListener('collide', (event) => {
                const { contact } = event
            
                // contact.bi and contact.bj are the colliding bodies, and contact.ni is the collision normal.
                // We do not yet know which one is which! Let's check.
                if (contact.bi.id === this.playerBody.id) {
                    // bi is the player body, flip the contact normal
                    contact.ni.negate(contactNormal)
                } else {
                    // bi is something else. Keep the normal as it is
                    contactNormal.copy(contact.ni)
                }
            
                // If contactNormal.dot(upAxis) is between 0 and 1, we know that the contact normal is somewhat in the up direction.
                if (contactNormal.dot(upAxis) > 0.5) {
                    // Use a "good" threshold value between 0 and 1 here!
                    this.canJump = true;
                }
            })
        });
    }

    get Position() {
        return this.playerBody.position;
    }

    get Rotation() {
        if (!this._target) return new THREE.Quaternion();
        return this._target.quaternion;
      }

    Update(timeInSeconds) {
        if (!this._target) {
          return;
        }

        this.inputVelocity.set(0, 0, 0);
        this._input.canJump = this.canJump;
        this._stateMachine.Update(timeInSeconds, this._input);
    
        const velocity = this.playerBody.velocity;

        const _Q = new THREE.Quaternion();
        const _A = new THREE.Vector3(0, 1, 0);
        const _R = this._target.quaternion.clone();
    
        let acc = 1;
        if (this._input._keys.shift) {
          acc = 3;
        }
        if (this._input._keys.forward) {
            //  velocity.z += acc.z * timeInSeconds;
            this.inputVelocity.z = acc * this.velocityFactor * timeInSeconds*100;
        }
        if (this._input._keys.backward) {
            // velocity.z -= acc.z * timeInSeconds;
            this.inputVelocity.z = -acc * this.velocityFactor * timeInSeconds*100;
        }
        if (this._input._keys.left) {
          _Q.setFromAxisAngle(_A, 4.0 * Math.PI * timeInSeconds * 0.25);
          _R.multiply(_Q);
        }
        if (this._input._keys.right) {
          _Q.setFromAxisAngle(_A, 4.0 * -Math.PI * timeInSeconds * 0.25);
          _R.multiply(_Q);
        }

        if (this.canJump && this._input._keys.space) {
            velocity.y = this.jumpVelocity;
            this._input._keys.space = false;
            this.canJump = false;
        }
    
        this._target.quaternion.copy(_R);

        this.inputVelocity.applyQuaternion(_R);
        velocity.x += this.inputVelocity.x;
        velocity.z += this.inputVelocity.z;

        this._target.position.x = this.playerBody.position.x;
        this._target.position.y = this.playerBody.position.y-this.bodyRadius;
        this._target.position.z = this.playerBody.position.z;

        // reset pos if player falls
        if (this.playerBody.position.y < -300) {
            this.playerBody.position.copy(this.startingPos);
            this._target.position.copy(this.startingPos);
            velocity.set(0,0,0);
        }
    
        if (this._mixer) {
          this._mixer.update(timeInSeconds);
        }
    }

}

class CharacterControllerInput {
    _keys: { forward: boolean; backward: boolean; left: boolean; right: boolean; space: boolean; shift: boolean; };
    canJump: boolean;
    constructor() {
        this._Init();
    }

    _Init() {
        this._keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            space: false,
            shift: false,
        };
        this.canJump = false;
        document.addEventListener('keydown', (e) => this._onKeyDown(e), false);
        document.addEventListener('keyup', (e) => this._onKeyUp(e), false);
    }

    _onKeyDown(e) {
        switch (e.keyCode) {
            // w
            case 87:
                this._keys.forward = true;
                break;
            // a
            case 65:
                this._keys.left = true;
                break;
            // s
            case 83:
                this._keys.backward = true;
                break;
            // d
            case 68:
                this._keys.right = true;
                break;
            // space
            case 32:
                this._keys.space = true;
                break;
            // shift
            case 16:
                this._keys.shift = true;
                break;
        }
    }
    _onKeyUp(e) {
        switch (e.keyCode) {
            // w
            case 87:
                this._keys.forward = false;
                break;
            // a
            case 65:
                this._keys.left = false;
                break;
            // s
            case 83:
                this._keys.backward = false;
                break;
            // d
            case 68:
                this._keys.right = false;
                break;
            // space
            case 32:
                this._keys.space = false;
                break;
            // shift
            case 16:
                this._keys.shift = false;
                break;
        }
    }
}