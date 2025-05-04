import * as THREE from 'three';
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader';
import * as CANNON from 'cannon-es';
import {CharacterFSM} from './characterAnimations';

type Animation = {
  readonly action: THREE.AnimationAction;
  readonly clip: THREE.AnimationClip;
};

type Animations = Record<string, Animation>;

export class CharacterControllerProxy {
  _animations: Animations;
  constructor(animations: {}) {
    this._animations = animations;
  }

  get animations() {
    return this._animations;
  }
}

export class CharacterController {
  _params: {
    camera: THREE.Camera;
    scene: THREE.Scene;
    world: CANNON.World;
    groundMaterial: CANNON.Material;
    initPosition: THREE.Vector3;
  };
  _canJump: boolean;
  _animations: Animations;
  _input: CharacterControllerInput;
  _stateMachine: CharacterFSM;
  _target: THREE.Group;
  _bodyRadius: number;
  _playerBody: CANNON.Body;
  _mixer: THREE.AnimationMixer;
  _manager: THREE.LoadingManager;
  _inputVelocity: THREE.Vector3;
  _forwardVelocity: number;
  _velocityFactor: number;
  _jumpVelocity: number;
  characterLoaded: boolean;
  _slipperyMaterial: CANNON.Material;
  constructor(params: {
    camera: THREE.Camera;
    scene: THREE.Scene;
    world: CANNON.World;
    groundMaterial: CANNON.Material;
    initPosition: THREE.Vector3;
  }) {
    this._params = params;
    this._Init();
  }

  _Init() {
    this.characterLoaded = false;

    this._inputVelocity = new THREE.Vector3();
    this._velocityFactor = 1;
    this._jumpVelocity = 100;
    this._canJump = false;

    this._animations = {};
    this._input = new CharacterControllerInput();
    this._stateMachine = new CharacterFSM(
      new CharacterControllerProxy(this._animations),
    );

    this._LoadModels();
  }

  _LoadModels() {
    const loader = new FBXLoader();
    loader.setPath('./resources/models/');
    loader.load('timmy.fbx', fbx => {
      fbx.scale.setScalar(0.1);
      fbx.traverse(c => {
        c.castShadow = true;
      });
      fbx.position.copy(this._params.initPosition);

      this._target = fbx;
      this._params.scene.add(this._target);

      const slipperyMaterial = new CANNON.Material('slipperyMaterial');
      const slippery_ground_cm = new CANNON.ContactMaterial(
        this._params.groundMaterial,
        slipperyMaterial,
        {
          friction: 0,
          restitution: 0.1,
        },
      );
      this._params.world.addContactMaterial(slippery_ground_cm);

      // make physics shape
      const halfExtents = new CANNON.Vec3(2, 8, 2);
      this._bodyRadius = halfExtents.y;
      this._playerBody = new CANNON.Body({
        mass: 1,
        shape: new CANNON.Box(halfExtents),
        allowSleep: false,
        fixedRotation: true,
        material: slipperyMaterial,
      });
      this._playerBody.position.x = fbx.position.x;
      this._playerBody.position.y = fbx.position.y + this._bodyRadius;
      this._playerBody.position.z = fbx.position.z;
      this._params.world.addBody(this._playerBody);

      this._playerBody.updateMassProperties();

      // manage animations
      this._mixer = new THREE.AnimationMixer(this._target);

      this._manager = new THREE.LoadingManager();
      this._manager.onLoad = () => {
        this._stateMachine.SetState('idle');
        this.characterLoaded = true;
      };

      const _OnLoad = (animName: string, anim: THREE.Group) => {
        const clip = anim.animations[0];
        const action = this._mixer.clipAction(clip);

        this._animations[animName] = {
          clip: clip,
          action: action,
        };
      };

      const loader = new FBXLoader(this._manager);
      loader.setPath('./resources/animations/');
      loader.load('idle.fbx', a => {
        _OnLoad('idle', a);
      });
      loader.load('walk.fbx', a => {
        _OnLoad('walk', a);
      });
      loader.load('run.fbx', a => {
        _OnLoad('run', a);
      });
      loader.load('walkback.fbx', a => {
        _OnLoad('walkback', a);
      });
      loader.load('runback.fbx', a => {
        _OnLoad('runback', a);
      });

      const contactNormal = new CANNON.Vec3(); // Normal in the contact, pointing *out* of whatever the player touched
      const localUp = new CANNON.Vec3();
      this._playerBody.addEventListener(
        'collide',
        (event: {contact: CANNON.ContactEquation}) => {
          const {contact} = event;

          // contact.bi and contact.bj are the colliding bodies, and contact.ni is the collision normal.
          // We do not yet know which one is which! Let's check.
          if (contact.bi.id === this._playerBody.id) {
            // bi is the player body, flip the contact normal
            contact.ni.negate(contactNormal);
          } else {
            // bi is something else. Keep the normal as it is
            contactNormal.copy(contact.ni);
          }

          localUp.copy(this._playerBody.position).normalize();
          if (contactNormal.dot(localUp) > 0.5) {
            // Use a "good" threshold value between 0 and 1 here!
            this._canJump = true;
          }
        },
      );
    });
  }

  get Position() {
    return this._playerBody.position;
  }

  get Rotation() {
    if (!this._target) return new THREE.Quaternion();
    return this._target.quaternion;
  }

  ResetPlayer() {
    this._target.position.copy(this._params.initPosition);
    this._playerBody.position.x = this._target.position.x;
    this._playerBody.position.y = this._target.position.y + this._bodyRadius;
    this._playerBody.position.z = this._target.position.z;
    this._playerBody.velocity.set(0, 0, 0);
    this._target.rotation.set(0, 0, 0);
  }

  Enable() {
    this._input.Enable();
  }

  Disable() {
    this._input.Disable();
  }

  Update(timeInSeconds: number) {
    if (!this._target) return;

    this._inputVelocity.set(0, 0, 0);
    this._input.canJump = this._canJump;
    this._stateMachine.Update(this._input);

    const velocity = this._playerBody.velocity;

    const position = new THREE.Vector3(
      this._playerBody.position.x,
      this._playerBody.position.y,
      this._playerBody.position.z,
    );

    // Local "up" is from globe center
    const localUp = position.clone().normalize();

    // Get current orientation
    const quaternion = new THREE.Quaternion(
      this._playerBody.quaternion.x,
      this._playerBody.quaternion.y,
      this._playerBody.quaternion.z,
      this._playerBody.quaternion.w,
    );

    const rawForward = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion);

    // Project forward direction to tangent plane
    const localForward = rawForward.clone().projectOnPlane(localUp).normalize();

    let acc = 1;
    if (this._input._keys.shift) {
      acc = 3;
    }

    if (this._input._keys.space && this._canJump) {
      this._inputVelocity.addScaledVector(localUp, this._jumpVelocity);
      this._canJump = false;
      this._input._keys.space = false;
    }

    if (this._input._keys.forward) {
      this._inputVelocity.addScaledVector(
        localForward,
        acc * this._velocityFactor * timeInSeconds * 100,
      );
    }

    if (this._input._keys.backward) {
      this._inputVelocity.addScaledVector(
        localForward,
        -acc * this._velocityFactor * timeInSeconds * 100,
      );
    }

    let yaw = 0;
    if (this._input._keys.left) {
      yaw = 4.0 * Math.PI * timeInSeconds * 0.25;
    }

    if (this._input._keys.right) {
      yaw = -4.0 * Math.PI * timeInSeconds * 0.25;
    }

    velocity.x *= 0.8;
    velocity.y *= 0.8;
    velocity.z *= 0.8;

    velocity.x += this._inputVelocity.x;
    velocity.y += this._inputVelocity.y;
    velocity.z += this._inputVelocity.z;

    // Rebuild orientation to align with globe and apply yaw
    const localRight = new THREE.Vector3()
      .crossVectors(localUp, localForward)
      .normalize();
    const correctedForward = new THREE.Vector3()
      .crossVectors(localRight, localUp)
      .normalize();

    const mat = new THREE.Matrix4().makeBasis(
      localRight,
      localUp,
      correctedForward,
    );

    const baseQuat = new THREE.Quaternion().setFromRotationMatrix(mat);
    const yawQuat = new THREE.Quaternion()
      .setFromAxisAngle(localUp, yaw)
      .normalize();
    const resultingQuat = baseQuat.premultiply(yawQuat);

    this._playerBody.quaternion.set(
      resultingQuat.x,
      resultingQuat.y,
      resultingQuat.z,
      resultingQuat.w,
    );
    this._target.quaternion.set(
      this._playerBody.quaternion.x,
      this._playerBody.quaternion.y,
      this._playerBody.quaternion.z,
      this._playerBody.quaternion.w,
    );

    const offset = localUp.clone().multiplyScalar(-this._bodyRadius);
    const playerPosition = new THREE.Vector3(
      this._playerBody.position.x,
      this._playerBody.position.y,
      this._playerBody.position.z,
    ).add(offset);
    this._target.position.copy(playerPosition);

    if (this._playerBody.position.length() > 250) {
      this.ResetPlayer();
    }

    if (this._mixer) {
      this._mixer.update(timeInSeconds);
    }
  }
}

export class CharacterControllerInput {
  _keys: {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    space: boolean;
    shift: boolean;
  };
  canJump: boolean;

  Enable() {
    this._keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      space: false,
      shift: false,
    };
    this.canJump = false;
    document.addEventListener('keydown', e => this._onKeyDown(e), false);
    document.addEventListener('keyup', e => this._onKeyUp(e), false);
  }

  Disable() {
    this._keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      space: false,
      shift: false,
    };
    this.canJump = false;
    document.removeEventListener('keydown', e => this._onKeyDown(e), false);
    document.removeEventListener('keyup', e => this._onKeyUp(e), false);
  }

  _onKeyDown(e: KeyboardEvent) {
    switch (e.code) {
      // w
      case 'KeyW':
        this._keys.forward = true;
        break;
      // a
      case 'KeyA':
        this._keys.left = true;
        break;
      // s
      case 'KeyS':
        this._keys.backward = true;
        break;
      // d
      case 'KeyD':
        this._keys.right = true;
        break;
      // space
      case 'Space':
        this._keys.space = true;
        break;
      // shift
      case 'ShiftLeft':
      case 'ShiftRight':
        this._keys.shift = true;
        break;
    }
  }
  _onKeyUp(e: KeyboardEvent) {
    switch (e.code) {
      // w
      case 'KeyW':
        this._keys.forward = false;
        break;
      // a
      case 'KeyA':
        this._keys.left = false;
        break;
      // s
      case 'KeyS':
        this._keys.backward = false;
        break;
      // d
      case 'KeyD':
        this._keys.right = false;
        break;
      // space
      case 'Space':
        this._keys.space = false;
        break;
      // shift
      case 'ShiftLeft':
      case 'ShiftRight':
        this._keys.shift = false;
        break;
    }
  }
}
