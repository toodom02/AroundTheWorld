class FiniteStateMachine {
    constructor() {
        this._states = {};
        this._currentState = null;
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
export class CharacterFSM extends FiniteStateMachine {
    constructor(proxy) {
        super();
        this._proxy = proxy;
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
    Enter() { }
    Exit() { }
    Update() { }
}
;
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
        }
        else if (input._keys.backward) {
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
            }
            else {
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
            }
            else {
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
            }
            else {
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
            }
            else {
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
