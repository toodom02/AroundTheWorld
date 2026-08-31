import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import * as CANNON from 'cannon-es';
import { GAME_CONFIG } from './config';
import { CharacterFSM } from './characterAnimations';
import { CharacterControllerInput } from './characterInput';

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

type CharacterControllerParams = {
  camera: THREE.Camera;
  scene: THREE.Scene;
  world: CANNON.World;
  groundMaterial: CANNON.Material;
  initPosition: THREE.Vector3;
  registerPhysicsBody?: (body: CANNON.Body) => void;
  onGameOver: () => void;
};

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

  private _bodyRadius = GAME_CONFIG.CHARACTER.BODY_RADIUS;
  private _velocityFactor = GAME_CONFIG.CHARACTER.VELOCITY_FACTOR;
  private _canJump = false;
  private _jumpForceDuration = 0;
  private _jumpForceMaxDuration = GAME_CONFIG.CHARACTER.JUMP_DURATION;
  private _jumpForceStrength = GAME_CONFIG.CHARACTER.JUMP_FORCE;

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

    const fbx = await this._loadFBXWithTimeout<THREE.Group>(loader, 'timmy.fbx', 30000);

    fbx.scale.setScalar(0.1);
    fbx.traverse(child => (child.castShadow = true));
    fbx.position.copy(this._params.initPosition);

    this._target = fbx;
    this._params.scene.add(fbx);

    this._setupPlayerPhysics();
    await this._setupStateMachine();
  }

  private _loadFBXWithTimeout<T>(
    loader: FBXLoader,
    path: string,
    timeout: number = 30000
  ): Promise<T> {
    return Promise.race([
      new Promise<T>((resolve, reject) => {
        loader.load(
          path,
          (model) => resolve(model as T),
          undefined,
          (error) => reject(new Error(`Failed to load ${path}: ${error}`))
        );
      }),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Loading ${path} timed out after ${timeout}ms`)),
          timeout
        )
      ),
    ]);
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

    if (this._params.registerPhysicsBody) {
      this._params.registerPhysicsBody(this._playerBody);
    }

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

    const promises = animationNames.map((name: string) =>
      new Promise<void>(async (resolve, reject) => {
        try {
          const anim = await this._loadFBXWithTimeout<THREE.Group>(loader, `${name}.fbx`, 30000);
          const clip = anim.animations[0];
          if (!clip) {
            reject(new Error(`No animation clip found in ${name}.fbx`));
            return;
          }
          this._animations[name] = {
            clip,
            action: this._mixer.clipAction(clip),
          };
          resolve();
        } catch (error) {
          reject(error);
        }
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

    if (this._playerBody.position.length() > GAME_CONFIG.OUT_OF_BOUNDS_DISTANCE) {
      this.isHit = true;
      this._params.onGameOver();
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
    const { forward, backward, run, jump } = this._input.move;
    const acc = run ? 3 : 1;

    if (jump && this._canJump) {
      this._jumpForceDuration = this._jumpForceMaxDuration;
      this._canJump = false;
      this._input.move.jump = false;
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

    const moveAmount = (forward - backward);
    if (Math.abs(moveAmount) > 0.01) {
      this._inputVelocity.addScaledVector(
        this._localForward,
        moveAmount * acc * this._velocityFactor * delta * 100
      );
    }

    this._playerBody.velocity.x *= GAME_CONFIG.PHYSICS.VELOCITY_DAMPING;
    this._playerBody.velocity.y *= GAME_CONFIG.PHYSICS.VELOCITY_DAMPING;
    this._playerBody.velocity.z *= GAME_CONFIG.PHYSICS.VELOCITY_DAMPING;

    this._playerBody.velocity.x += this._inputVelocity.x;
    this._playerBody.velocity.y += this._inputVelocity.y;
    this._playerBody.velocity.z += this._inputVelocity.z;
  }

  private _applyYaw(delta: number) {
    const { left, right } = this._input.move;
    let yaw = (left - right) * Math.PI * delta;

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
