export declare class CharacterControllerInput {
    private _move;
    private _joystick;
    isHit: boolean;
    private _showJoystick;
    private _hideJoystick;
    Enable(): void;
    Disable(): void;
    private _onKeyDown;
    private _onKeyUp;
    get move(): {
        forward: number;
        backward: number;
        left: number;
        right: number;
        run: number;
        jump: boolean;
    };
}
