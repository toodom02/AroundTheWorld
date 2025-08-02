import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import * as CANNON from 'cannon-es';
import { CharacterFSM } from './characterAnimations';

type Animation = {
  readonly action: THREE.AnimationAction;
  readonly clip: THREE.AnimationClip;
};

type Animations = Record<string, Animation>;

export class CharacterControllerProxy {
  constructor(private _animations: Animations) {}

  get animations() {
    return this._animations;
  }
}

interface CharacterControllerParams {
  camera: THREE.Camera;
  scene: THREE.Scene;
  world: CANNON.World;
  groundMaterial: CANNON.Material;
  initPosition: THREE.Vector3;
}

export class CharacterController {
  static async create(params: CharacterControllerParams): Promise<CharacterController> {
    const controller = new CharacterController(params);
    await controller._init();
    return controller;
  }

  private _input = new CharacterControllerInput();
  private _stateMachine = new CharacterFSM(new CharacterControllerProxy({}));
  private _animations: Animations = {};
  private _mixer: THREE.AnimationMixer;
  private _target: THREE.Group;
  private _playerBody: CANNON.Body;

  private _inputVelocity = new THREE.Vector3();
  private _localUp = new THREE.Vector3();
  private _localForward = new THREE.Vector3();
  private _localRight = new THREE.Vector3();
  private _correctedForward = new THREE.Vector3();
  private _quaternion = new THREE.Quaternion();
  private _matrix = new THREE.Matrix4();
  private _baseQuat = new THREE.Quaternion();
  private _yawQuat = new THREE.Quaternion();
  private _offset = new THREE.Vector3();
  private _playerPosition = new THREE.Vector3();

  private _bodyRadius = 8;
  private _velocityFactor = 1;
  private _canJump = false;
  private _jumpForceDuration = 0;
  private _jumpForceMaxDuration = 0.2;
  private _jumpForceStrength = 5000000;

  isHit = false;

  private constructor(private _params: CharacterControllerParams) {}

  private async _init(): Promise<void> {
    this._initPhysicsBody();
    await this._loadCharacterModel();
  }

  private _initPhysicsBody() {
    this._playerBody = new CANNON.Body({
      mass: 100,
      allowSleep: false,
      fixedRotation: true,
      material: this._params.groundMaterial,
    });
  }

  private async _loadCharacterModel(): Promise<void> {
    const loader = new FBXLoader();
    loader.setPath('./resources/models/');

    const fbx = await new Promise<THREE.Group>((resolve, reject) => {
      loader.load('timmy.fbx', resolve, undefined, reject);
    });

    fbx.scale.setScalar(0.1);
    fbx.traverse(child => (child.castShadow = true));
    fbx.position.copy(this._params.initPosition);

    this._target = fbx;
    this._params.scene.add(fbx);

    this._setupPlayerPhysics();
    await this._setupStateMachine();
  }

  private _setupPlayerPhysics() {
    const radius = 2;
    const offsets = [
      new CANNON.Vec3(0, -this._bodyRadius + radius, 0),
      new CANNON.Vec3(0, 0, 0),
      new CANNON.Vec3(0, this._bodyRadius - radius, 0),
    ];

    for (const offset of offsets) {
      this._playerBody.addShape(new CANNON.Sphere(radius), offset);
    }

    this._playerBody.position.set(
      this._target.position.x,
      this._target.position.y + this._bodyRadius,
      this._target.position.z,
    );
    this._params.world.addBody(this._playerBody);
    this._playerBody.updateMassProperties();

    const contactNormal = new CANNON.Vec3();
    const localUp = new CANNON.Vec3();

    this._playerBody.addEventListener('collide', (event: any) => {
      const { contact } = event;
      const normal = contact.bi.id === this._playerBody.id
        ? contact.ni.negate(contactNormal)
        : contactNormal.copy(contact.ni);

      localUp.copy(this._playerBody.position).normalize();
      if (contactNormal.dot(localUp) > 0.5) this._canJump = true;
    });
  }

  private async _setupStateMachine() {
    await this._loadAnimations();
    this._stateMachine = new CharacterFSM(new CharacterControllerProxy(this._animations));
    this._stateMachine.SetState('idle');
    this._mixer.update(0);
  }

  private async _loadAnimations(): Promise<void> {
    this._mixer = new THREE.AnimationMixer(this._target);
    const loader = new FBXLoader();
    loader.setPath('./resources/animations/');

    const animationNames = ['idle', 'walk', 'run', 'walkback', 'runback', 'dying'];

    const promises = animationNames.map(name =>
      new Promise<void>((resolve, reject) => {
        loader.load(
          `${name}.fbx`,
          anim => {
            const clip = anim.animations[0];
            this._animations[name] = {
              clip,
              action: this._mixer.clipAction(clip),
            };
            resolve();
          },
          undefined,
          reject,
        );
      }),
    );

    await Promise.all(promises);
  }

  get Position() {
    return this._target.position;
  }

  get Rotation() {
    return this._target?.quaternion ?? new THREE.Quaternion();
  }

  get body(): CANNON.Body {
    return this._playerBody;
  }

  public ResetPlayer() {
    this._target.position.copy(this._params.initPosition);
    this._playerBody.position.set(
      this._target.position.x,
      this._target.position.y + this._bodyRadius,
      this._target.position.z,
    );
    this._playerBody.velocity.set(0, 0, 0);
    this._playerBody.angularVelocity.set(0, 0, 0);
    this._playerBody.force.set(0, 0, 0);
    this._target.rotation.set(0, 0, 0);
    this._stateMachine.SetState('idle');
    this.isHit = false;
  }

  public Enable() {
    this._input.Enable();
  }

  public Disable() {
    this._input.Disable();
  }

  public Update(timeInSeconds: number) {
    if (!this._target) return;

    this._inputVelocity.set(0, 0, 0);
    this._input.isHit = this.isHit;
    this._stateMachine.Update(this._input);

    this._updateOrientation();
    this._applyMovement(timeInSeconds);
    this._applyYaw(timeInSeconds);
    this._syncVisuals();

    if (this._playerBody.position.length() > 250) {
      this.ResetPlayer();
    }

    this._mixer.update(timeInSeconds);
  }

  private _updateOrientation() {
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
  }

  private _applyMovement(delta: number) {
    const { forward, backward, space, shift } = this._input.keys;
    const acc = shift ? 3 : 1;

    if (space && this._canJump) {
      this._jumpForceDuration = this._jumpForceMaxDuration;
      this._canJump = false;
      this._input.keys.space = false;
    }

    if (this._jumpForceDuration > 0) {
      const forceAmount = this._jumpForceStrength * delta;
      const jumpForce = new CANNON.Vec3(
        this._localUp.x * forceAmount,
        this._localUp.y * forceAmount,
        this._localUp.z * forceAmount,
      );
      this._playerBody.applyForce(jumpForce, this._playerBody.position);
      this._jumpForceDuration -= delta;
    }

    if (forward) {
      this._inputVelocity.addScaledVector(this._localForward, acc * this._velocityFactor * delta * 100);
    }

    if (backward) {
      this._inputVelocity.addScaledVector(this._localForward, -acc * this._velocityFactor * delta * 100);
    }

    this._playerBody.velocity.x *= 0.8;
    this._playerBody.velocity.y *= 0.8;
    this._playerBody.velocity.z *= 0.8;

    this._playerBody.velocity.x += this._inputVelocity.x;
    this._playerBody.velocity.y += this._inputVelocity.y;
    this._playerBody.velocity.z += this._inputVelocity.z;
  }

  private _applyYaw(delta: number) {
    const { left, right } = this._input.keys;
    let yaw = 0;
    if (left) yaw = 4 * Math.PI * delta * 0.25;
    if (right) yaw = -4 * Math.PI * delta * 0.25;

    this._localRight.crossVectors(this._localUp, this._localForward).normalize();
    this._correctedForward.crossVectors(this._localRight, this._localUp).normalize();

    this._matrix.makeBasis(this._localRight, this._localUp, this._correctedForward);
    this._baseQuat.setFromRotationMatrix(this._matrix);
    this._yawQuat.setFromAxisAngle(this._localUp, yaw).normalize();

    const resultQuat = this._baseQuat.premultiply(this._yawQuat);
    this._playerBody.quaternion.set(
      resultQuat.x,
      resultQuat.y,
      resultQuat.z,
      resultQuat.w,
    );
    this._target.quaternion.copy(resultQuat);
  }

  private _syncVisuals() {
    this._offset.copy(this._localUp).multiplyScalar(-this._bodyRadius);
    this._playerPosition
      .set(
        this._playerBody.position.x,
        this._playerBody.position.y,
        this._playerBody.position.z,
      )
      .add(this._offset);
    this._target.position.copy(this._playerPosition);
  }
}

export class CharacterControllerInput {
  private _keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    space: false,
    shift: false,
  };

  isHit = false;

  Enable() {
    document.addEventListener('keydown', this._onKeyDown, false);
    document.addEventListener('keyup', this._onKeyUp, false);
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
    document.removeEventListener('keydown', this._onKeyDown, false);
    document.removeEventListener('keyup', this._onKeyUp, false);
  }

  private _onKeyDown = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW': this._keys.forward = true; break;
      case 'KeyA': this._keys.left = true; break;
      case 'KeyS': this._keys.backward = true; break;
      case 'KeyD': this._keys.right = true; break;
      case 'Space': this._keys.space = true; break;
      case 'ShiftLeft':
      case 'ShiftRight': this._keys.shift = true; break;
    }
  };

  private _onKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW': this._keys.forward = false; break;
      case 'KeyA': this._keys.left = false; break;
      case 'KeyS': this._keys.backward = false; break;
      case 'KeyD': this._keys.right = false; break;
      case 'Space': this._keys.space = false; break;
      case 'ShiftLeft':
      case 'ShiftRight': this._keys.shift = false; break;
    }
  };

  get keys() {
    return this._keys;
  }
}