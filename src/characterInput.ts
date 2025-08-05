import * as nipplejs from 'nipplejs';

export class CharacterControllerInput {
  private _keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    space: false,
    shift: false,
  };
  private _joystick: nipplejs.JoystickManager | null = null;

  isHit = false;

  private _showJoystick() {
    if (this._joystick) return;
    this._joystick = nipplejs.create({
      zone: document.getElementById('joystick')!,
    });
    this._joystick.on('move',  (_: nipplejs.EventData, output: nipplejs.JoystickOutputData) => {
      this._keys.forward = output.angle.degree >= 25 && output.angle.degree <= 155;
      this._keys.backward = output.angle.degree <= 335 && output.angle.degree >= 205;
      this._keys.left = output.angle.degree >= 115 && output.angle.degree <= 245;
      this._keys.right = output.angle.degree <= 65 || output.angle.degree >= 295;
      this._keys.shift = output.distance >= 50;
    });

    this._joystick.on('end',  () => {
      this._keys = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        space: false,
        shift: false,
      };
    })
  }

  private _hideJoystick() {
    if (this._joystick) {
      this._joystick.destroy();
      this._joystick = null;
    }
  }

  public Enable() {
    document.addEventListener('keydown', this._onKeyDown, false);
    document.addEventListener('keyup', this._onKeyUp, false);
    this._showJoystick();
  }

  public Disable() {
    this._hideJoystick();
    document.removeEventListener('keydown', this._onKeyDown, false);
    document.removeEventListener('keyup', this._onKeyUp, false);
    this._keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      space: false,
      shift: false,
    };
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