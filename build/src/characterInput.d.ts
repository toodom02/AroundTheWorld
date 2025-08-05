export declare class CharacterControllerInput {
    private _keys;
    private _joystick;
    isHit: boolean;
    private _showJoystick;
    private _hideJoystick;
    Enable(): void;
    Disable(): void;
    private _onKeyDown;
    private _onKeyUp;
    get keys(): {
        forward: boolean;
        backward: boolean;
        left: boolean;
        right: boolean;
        space: boolean;
        shift: boolean;
    };
}
