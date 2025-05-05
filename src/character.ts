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
  characterLoaded: boolean;
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
  _localUp: THREE.Vector3;
  _localForward: THREE.Vector3;
  _localRight: THREE.Vector3;
  _correctedForward: THREE.Vector3;
  _quaternion: THREE.Quaternion;
  _matrix: THREE.Matrix4;
  _baseQuat: THREE.Quaternion;
  _yawQuat: THREE.Quaternion;
  _offset: THREE.Vector3;
  _playerPosition: THREE.Vector3;

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
    this._localUp = new THREE.Vector3();
    this._localForward = new THREE.Vector3();
    this._localRight = new THREE.Vector3();
    this._correctedForward = new THREE.Vector3();
    this._quaternion = new THREE.Quaternion();
    this._matrix = new THREE.Matrix4();
    this._baseQuat = new THREE.Quaternion();
    this._yawQuat = new THREE.Quaternion();
    this._offset = new THREE.Vector3();
    this._playerPosition = new THREE.Vector3();
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

      // make physics shape
      const halfHeight = 8;
      const radius = 2;
      this._bodyRadius = halfHeight;

      this._playerBody = new CANNON.Body({
        mass: 1,
        allowSleep: false,
        fixedRotation: true,
        material: this._params.groundMaterial,
      });

      // estimate shape by spheres (to support collision with trimesh)
      const offsets = [
        new CANNON.Vec3(0, -halfHeight + radius, 0),
        new CANNON.Vec3(0, 0, 0),
        new CANNON.Vec3(0, halfHeight - radius, 0),
      ];

      for (const offset of offsets) {
        const sphereShape = new CANNON.Sphere(radius);
        this._playerBody.addShape(sphereShape, offset);
      }

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

    // Local "up" is from globe center
    this._localUp
      .set(
        this._playerBody.position.x,
        this._playerBody.position.y,
        this._playerBody.position.z,
      )
      .normalize();

    // Get current orientation
    this._quaternion.set(
      this._playerBody.quaternion.x,
      this._playerBody.quaternion.y,
      this._playerBody.quaternion.z,
      this._playerBody.quaternion.w,
    );

    // Project forward direction to tangent plane
    this._localForward
      .set(0, 0, 1)
      .applyQuaternion(this._quaternion)
      .projectOnPlane(this._localUp)
      .normalize();

    let acc = 1;
    if (this._input._keys.shift) {
      acc = 3;
    }

    if (this._input._keys.space && this._canJump) {
      this._inputVelocity.addScaledVector(this._localUp, this._jumpVelocity);
      this._canJump = false;
      this._input._keys.space = false;
    }

    if (this._input._keys.forward) {
      this._inputVelocity.addScaledVector(
        this._localForward,
        acc * this._velocityFactor * timeInSeconds * 100,
      );
    }

    if (this._input._keys.backward) {
      this._inputVelocity.addScaledVector(
        this._localForward,
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

    this._playerBody.velocity.x *= 0.8;
    this._playerBody.velocity.y *= 0.8;
    this._playerBody.velocity.z *= 0.8;

    this._playerBody.velocity.x += this._inputVelocity.x;
    this._playerBody.velocity.y += this._inputVelocity.y;
    this._playerBody.velocity.z += this._inputVelocity.z;

    // Rebuild orientation to align with globe and apply yaw
    this._localRight
      .crossVectors(this._localUp, this._localForward)
      .normalize();
    this._correctedForward
      .crossVectors(this._localRight, this._localUp)
      .normalize();

    this._matrix.makeBasis(
      this._localRight,
      this._localUp,
      this._correctedForward,
    );

    this._baseQuat.setFromRotationMatrix(this._matrix);
    this._yawQuat.setFromAxisAngle(this._localUp, yaw).normalize();
    const resultingQuat = this._baseQuat.premultiply(this._yawQuat);

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

    this._offset.copy(this._localUp).multiplyScalar(-this._bodyRadius);
    this._playerPosition
      .set(
        this._playerBody.position.x,
        this._playerBody.position.y,
        this._playerBody.position.z,
      )
      .add(this._offset);
    this._target.position.copy(this._playerPosition);

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
