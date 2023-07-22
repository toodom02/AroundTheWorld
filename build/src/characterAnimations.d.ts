import { CharacterControllerInput, CharacterControllerProxy } from './character';
declare class FiniteStateMachine {
    _states: {};
    _currentState: State | null;
    constructor();
    _AddState(name: string, type: typeof State): void;
    SetState(name: string): void;
    Update(input: CharacterControllerInput): void;
}
export declare class CharacterFSM extends FiniteStateMachine {
    _proxy: CharacterControllerProxy;
    constructor(proxy: CharacterControllerProxy);
    _Init(): void;
}
declare class State {
    _parent: CharacterFSM;
    constructor(parent: CharacterFSM);
    get Name(): string;
    Enter(prevState: State): void;
    Exit(): void;
    Update(input: CharacterControllerInput): void;
}
export {};
