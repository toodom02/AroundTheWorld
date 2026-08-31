import * as nipplejs from 'nipplejs';

export class CharacterControllerInput {
  private _move = { forward: 0, backward: 0, left: 0, right: 0, run: 0, jump: false };
  private _joystick: nipplejs.JoystickManager | null = null;
  private _onKeyDown: (e: KeyboardEvent) => void;
  private _onKeyUp: (e: KeyboardEvent) => void;

  isHit = false;

  constructor() {
    this._onKeyDown = this._handleKeyDown.bind(this);
    this._onKeyUp = this._handleKeyUp.bind(this);
  }

  private _showJoystick() {
    if (this._joystick) return;
    this._joystick = nipplejs.create({
      zone: document.getElementById('joystick')!,
    });
    this._joystick.on('move', (_: nipplejs.EventData, output: nipplejs.JoystickOutputData) => {
      const rad = output.angle.radian;
      const dist = output.distance / 50;
      this._move.forward = Math.max(0, Math.sin(rad));
      this._move.backward = Math.max(0, -Math.sin(rad));
      this._move.left = Math.max(0, -Math.cos(rad));
      this._move.right = Math.max(0, Math.cos(rad));
      this._move.run = dist > 0.7 ? 1 : 0;
    });

    this._joystick.on('end', () => {
      this._move = { forward: 0, backward: 0, left: 0, right: 0, run: 0, jump: false };
    });
  }

  private _hideJoystick() {
    if (this._joystick) {
      this._joystick.destroy();
      this._joystick = null;
    }
  }

  public Enable() {
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    this._showJoystick();
  }

  public Disable() {
    this._hideJoystick();
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    this._move = { forward: 0, backward: 0, left: 0, right: 0, run: 0, jump: false };
  }

  private _handleKeyDown(e: KeyboardEvent) {
    switch (e.code) {
      case 'KeyW': this._move.forward = 1; break;
      case 'KeyA': this._move.left = 1; break;
      case 'KeyS': this._move.backward = 1; break;
      case 'KeyD': this._move.right = 1; break;
      case 'Space': this._move.jump = true; break;
      case 'ShiftLeft':
      case 'ShiftRight': this._move.run = 1; break;
    }
  }

  private _handleKeyUp(e: KeyboardEvent) {
    switch (e.code) {
      case 'KeyW': this._move.forward = 0; break;
      case 'KeyA': this._move.left = 0; break;
      case 'KeyS': this._move.backward = 0; break;
      case 'KeyD': this._move.right = 0; break;
      case 'Space': this._move.jump = false; break;
      case 'ShiftLeft':
      case 'ShiftRight': this._move.run = 0; break;
    }
  }

  get move() {
    return this._move;
  }
}