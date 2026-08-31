import * as THREE from 'three';
import { CharacterControllerProxy } from './character';
import { CharacterControllerInput } from './characterInput';

type StateConstructor = new (parent: CharacterFSM) => State;

export class CharacterFSM {
  private _states: Map<string, StateConstructor>;
  private _currentState: State | null;
  private _proxy: CharacterControllerProxy;
  
  constructor(proxy: CharacterControllerProxy) {
    this._states = new Map();
    this._currentState = null;
    this._proxy = proxy;
    this._Init();
  }

  private _AddState(name: string, type: StateConstructor) {
    this._states.set(name, type);
  }

  private _Init() {
    this._AddState('idle', IdleState);
    this._AddState('walk', WalkState);
    this._AddState('run', RunState);
    this._AddState('walkback', WalkBackState);
    this._AddState('runback', RunBackState);
    this._AddState('dying', DyingState);
  }

  SetState(name: string) {
    const prevState = this._currentState;

    if (prevState) {
      if (prevState.Name === name) {
        return;
      }
      prevState.Exit();
    }

    const StateConstructor = this._states.get(name);
    if (!StateConstructor) {
      console.error(`State "${name}" not found in state machine`);
      return;
    }

    const state = new StateConstructor(this);
    this._currentState = state;
    state.Enter(prevState);
  }

  Update(input: CharacterControllerInput) {
    if (input.isHit) {
      this.SetState('dying');
      return;
    }
    if (this._currentState) {
      this._currentState.Update(input);
    }
  }

  get proxy(): CharacterControllerProxy {
    return this._proxy;
  }
}

class State {
  protected _parent: CharacterFSM;
  
  constructor(parent: CharacterFSM) {
    this._parent = parent;
  }

  get Name() {
    return '';
  }
  
  Enter(prevState: State | null) {}
  Exit() {}
  Update(input: CharacterControllerInput) {}
}

class IdleState extends State {
  get Name() {
    return 'idle';
  }

  Enter(prevState: State | null) {
    const curAction = this._parent.proxy.animations['idle'].action;
    if (prevState) {
      const prevAction = this._parent.proxy.animations[prevState.Name].action;
      curAction.enabled = true;
      curAction.time = 0.0;
      curAction.setEffectiveTimeScale(1.0);
      curAction.setEffectiveWeight(1.0);
      curAction.crossFadeFrom(prevAction, 0.5, true);
    }
    curAction.play();
  }

  Update(input: CharacterControllerInput) {
    if (input.move.forward) {
      this._parent.SetState('walk');
    } else if (input.move.backward) {
      this._parent.SetState('walkback');
    }
  }
}

class WalkState extends State {
  get Name() {
    return 'walk';
  }

  Enter(prevState: State | null) {
    const curAction = this._parent.proxy.animations['walk'].action;
    if (prevState) {
      const prevAction = this._parent.proxy.animations[prevState.Name].action;
      curAction.enabled = true;
      if (prevState.Name === 'run') {
        // skip ahead in animation so legs are at same point
        const ratio =
          curAction.getClip().duration / prevAction.getClip().duration;
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

  Update(input: CharacterControllerInput) {
    if (input.move.forward) {
      if (input.move.run) {
        this._parent.SetState('run');
      }
      return;
    }

    this._parent.SetState('idle');
  }
}

class WalkBackState extends State {
  get Name() {
    return 'walkback';
  }

  Enter(prevState: State | null) {
    const curAction = this._parent.proxy.animations['walkback'].action;
    if (prevState) {
      const prevAction = this._parent.proxy.animations[prevState.Name].action;
      curAction.enabled = true;
      if (prevState.Name === 'runback') {
        // skip ahead in animation so legs are at same point
        const ratio =
          curAction.getClip().duration / prevAction.getClip().duration;
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

  Update(input: CharacterControllerInput) {
    if (input.move.backward) {
      if (input.move.run) {
        this._parent.SetState('runback');
      }
      return;
    }

    this._parent.SetState('idle');
  }
}

class RunState extends State {
  get Name() {
    return 'run';
  }

  Enter(prevState: State | null) {
    const curAction = this._parent.proxy.animations['run'].action;
    if (prevState) {
      const prevAction = this._parent.proxy.animations[prevState.Name].action;
      curAction.enabled = true;
      if (prevState.Name === 'walk') {
        // skip ahead in animation so legs are at same point
        const ratio =
          curAction.getClip().duration / prevAction.getClip().duration;
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

  Update(input: CharacterControllerInput) {
    if (input.move.forward) {
      if (!input.move.run) {
        this._parent.SetState('walk');
      }
      return;
    }

    this._parent.SetState('idle');
  }
}

class RunBackState extends State {
  get Name() {
    return 'runback';
  }

  Enter(prevState: State | null) {
    const curAction = this._parent.proxy.animations['runback'].action;
    if (prevState) {
      const prevAction = this._parent.proxy.animations[prevState.Name].action;
      curAction.enabled = true;
      if (prevState.Name === 'walkback') {
        // skip ahead in animation so legs are at same point
        const ratio =
          curAction.getClip().duration / prevAction.getClip().duration;
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

  Update(input: CharacterControllerInput) {
    if (input.move.backward) {
      if (!input.move.run) {
        this._parent.SetState('walkback');
      }
      return;
    }

    this._parent.SetState('idle');
  }
}

class DyingState extends State {
  get Name() {
    return 'dying';
  }

  Enter(prevState: State | null) {
    const curAction = this._parent.proxy.animations['dying'].action;
    curAction.reset();
    curAction.stop();
    if (prevState) {
      const prevAction = this._parent.proxy.animations[prevState.Name].action;
      curAction.enabled = true;
      curAction.time = 0.0;
      curAction.setEffectiveTimeScale(1.0);
      curAction.setEffectiveWeight(1.0);
      curAction.crossFadeFrom(prevAction, 0.1, true);
    }
    curAction.loop = THREE.LoopOnce;
    curAction.clampWhenFinished = true;
    curAction.play();
  }

  Update(input: CharacterControllerInput) {
  }
}
