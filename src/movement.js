import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { FBXLoader } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/loaders/FBXLoader';
import * as CANNON from 'https://cdn.skypack.dev/cannon-es@0.18.0';

class CharacterControllerProxy {
    constructor(animations) {
      this._animations = animations;
    }
  
    get animations() {
      return this._animations;
    }
  };

export class CharacterController {
    constructor(params) {
        this._params = params;
        this._Init();
    }

    _Init() {
        this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
        this._acceleration = new THREE.Vector3(1, 0.25, 50.0);
        this._velocity = new THREE.Vector3(0, 0, 0);
        this._position = new THREE.Vector3();
        
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
            fbx.position.set(0, this._params.planetRadius, 0);
        
            this._target = fbx;
            this._params.scene.add(this._target);

            // make physics sphere
            this.offset = 5;
            this.playerBody = new CANNON.Body({
                mass: 50,
                shape: new CANNON.Sphere(3),
                linearDamping: 0.5,
            });
            this.playerBody.position.x = fbx.position.x;
            this.playerBody.position.y = fbx.position.y+3;
            this.playerBody.position.z = fbx.position.z;
            this._params.world.addBody(this.playerBody);

            // manage animations
            this._mixer = new THREE.AnimationMixer(this._target);

            this._manager = new THREE.LoadingManager();
            this._manager.onLoad = () => {
                this._stateMachine.SetState('idle');
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
            loader.load('walk.fbx', (a) => { _OnLoad('walk', a);});
            loader.load('run.fbx', (a) => { _OnLoad('run', a);});
            loader.load('walkback.fbx', (a) => { _OnLoad('walkback', a);});
            loader.load('runback.fbx', (a) => { _OnLoad('runback', a);});
        });
    }

    get Position() {
        return this._position;
    }

    get Rotation() {
        if (!this._target) return new THREE.Quaternion();
        return this._target.quaternion;
      }

    Update(timeInSeconds) {
        if (!this._target) {
          return;
        }
    
        this._stateMachine.Update(timeInSeconds, this._input);
    
        const velocity = this._velocity;
        const frameDecceleration = new THREE.Vector3(
            velocity.x * this._decceleration.x,
            0,
            velocity.z * this._decceleration.z
        );
        frameDecceleration.multiplyScalar(timeInSeconds);
        frameDecceleration.z = Math.sign(frameDecceleration.z) * Math.min(
            Math.abs(frameDecceleration.z), Math.abs(velocity.z));
    
        velocity.add(frameDecceleration);
    
        const controlObject = this._target;
        const _Q = new THREE.Quaternion();
        const _A = new THREE.Vector3();
        const _R = controlObject.quaternion.clone();
    
        const acc = this._acceleration.clone();
        if (this._input._keys.shift) {
          acc.multiplyScalar(2.0);
        }
    
        if (this._input._keys.forward) {
          velocity.z += acc.z * timeInSeconds;
        }
        if (this._input._keys.backward) {
          velocity.z -= acc.z * timeInSeconds;
        }
        if (this._input._keys.left) {
          _A.set(0, 1, 0);
          _Q.setFromAxisAngle(_A, 4.0 * Math.PI * timeInSeconds * this._acceleration.y);
          _R.multiply(_Q);
        }
        if (this._input._keys.right) {
          _A.set(0, 1, 0);
          _Q.setFromAxisAngle(_A, 4.0 * -Math.PI * timeInSeconds * this._acceleration.y);
          _R.multiply(_Q);
        }
    
        controlObject.quaternion.copy(_R);
    
        const oldPosition = new THREE.Vector3();
        oldPosition.copy(controlObject.position);
    
        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(controlObject.quaternion);
        forward.normalize();
    
        const sideways = new THREE.Vector3(1, 0, 0);
        sideways.applyQuaternion(controlObject.quaternion);
        sideways.normalize();
    
        sideways.multiplyScalar(velocity.x * timeInSeconds);
        forward.multiplyScalar(velocity.z * timeInSeconds);
    
        controlObject.position.add(forward);
        controlObject.position.add(sideways);

        controlObject.position.y = this.playerBody.position.y - 3;
        this._position.copy(controlObject.position);
        this.playerBody.position.x = this._position.x;
        this.playerBody.position.z = this._position.z;
        
    
        if (this._mixer) {
          this._mixer.update(timeInSeconds);
        }
      }

}

class CharacterControllerInput {
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

class FiniteStateMachine {
    constructor() {
        this._states = {};
        this._currentState = null
    }

    _AddState(name, type) {
        this._states[name] = type;
    }

    SetState(name) {
        const prevState = this._currentState;

        if (prevState) {
            if (prevState.Name == name) {
                return;
            } 
            prevState.Exit();
        }

        const state = new this._states[name](this);

        this._currentState = state;
        state.Enter(prevState);
    }

    Update(timeElapsed, input) {
        if (this._currentState) {
            this._currentState.Update(timeElapsed, input);
        }
    }
}

class CharacterFSM extends FiniteStateMachine {
    constructor(proxy) {
        super();
        this._proxy = proxy
        this._Init();
    }

    _Init() {
        this._AddState('idle', IdleState);
        this._AddState('walk', WalkState);
        this._AddState('run', RunState);
        this._AddState('walkback', WalkBackState);
        this._AddState('runback', RunBackState);
    }
}

class State {
    constructor(parent) {
      this._parent = parent;
    }
  
    Enter() {}
    Exit() {}
    Update() {}
  };

class IdleState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'idle';
    }

    Enter(prevState) {
        const curAction = this._parent._proxy._animations['idle'].action;
        if (prevState) {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;
            curAction.enabled = true;
            curAction.time = 0.0;
            curAction.setEffectiveTimeScale(1.0);
            curAction.setEffectiveWeight(1.0);
            curAction.crossFadeFrom(prevAction, 0.5, true);
        }
        curAction.play();
    }

    Update(_, input) {
        if (input._keys.forward) {
            this._parent.SetState('walk');
        } else if (input._keys.backward) {
            this._parent.SetState('walkback');
        }
    }
}

class WalkState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'walk';
    }

    Enter(prevState) {
        const curAction = this._parent._proxy._animations['walk'].action;
        if (prevState) {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;
            curAction.enabled = true;
            if (prevState.Name == 'run') {
                // skip ahead in animation so legs are at same point
                const ratio = curAction.getClip().duration / prevAction.getClip().duration;
                curAction.time = prevAction.time * ratio;
            } else {
                curAction.time = 0.0;
                curAction.setEffectiveTimeScale(1.0);
                curAction.setEffectiveWeight(1.0);
            }
            curAction.crossFadeFrom(prevAction, 0.5, true);
        }
        curAction.play();
    }

    Exit() {
    }

    Update(_, input) {
        if (input._keys.forward) {
            if (input._keys.shift) {
                this._parent.SetState('run');
            }
            return;
        }

        this._parent.SetState('idle');
    }
}
class WalkBackState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'walkback';
    }

    Enter(prevState) {
        const curAction = this._parent._proxy._animations['walkback'].action;
        if (prevState) {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;
            curAction.enabled = true;
            if (prevState.Name == 'runback') {
                // skip ahead in animation so legs are at same point
                const ratio = curAction.getClip().duration / prevAction.getClip().duration;
                curAction.time = prevAction.time * ratio;
            } else {
                curAction.time = 0.0;
                curAction.setEffectiveTimeScale(1.0);
                curAction.setEffectiveWeight(1.0);
            }
            curAction.crossFadeFrom(prevAction, 0.5, true);
        }
        curAction.play();
    }

    Update(_, input) {
        if (input._keys.backward) {
            if (input._keys.shift) {
                this._parent.SetState('runback');
            }
            return;
        }

        this._parent.SetState('idle');
    }
}

class RunState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'run';
    }

    Enter(prevState) {
        const curAction = this._parent._proxy._animations['run'].action;
        if (prevState) {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;
            curAction.enabled = true;
            if (prevState.Name == 'walk') {
                // skip ahead in animation so legs are at same point
                const ratio = curAction.getClip().duration / prevAction.getClip().duration;
                curAction.time = prevAction.time * ratio;
            } else {
                curAction.time = 0.0;
                curAction.setEffectiveTimeScale(1.0);
                curAction.setEffectiveWeight(1.0);
            }
            curAction.crossFadeFrom(prevAction, 0.5, true);
        }
        curAction.play();
    }

    Update(_, input) {
        if (input._keys.forward) {
            if (!input._keys.shift) {
                this._parent.SetState('walk');
            }
            return;
        }

        this._parent.SetState('idle');
    }
}
class RunBackState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'runback';
    }

    Enter(prevState) {
        const curAction = this._parent._proxy._animations['runback'].action;
        if (prevState) {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;
            curAction.enabled = true;
            if (prevState.Name == 'walkback') {
                // skip ahead in animation so legs are at same point
                const ratio = curAction.getClip().duration / prevAction.getClip().duration;
                curAction.time = prevAction.time * ratio;
            } else {
                curAction.time = 0.0;
                curAction.setEffectiveTimeScale(1.0);
                curAction.setEffectiveWeight(1.0);
            }
            curAction.crossFadeFrom(prevAction, 0.5, true);
        }
        curAction.play();
    }

    Update(_, input) {
        if (input._keys.backward) {
            if (!input._keys.shift) {
                this._parent.SetState('walkback');
            }
            return;
        }

        this._parent.SetState('idle');
    }
}