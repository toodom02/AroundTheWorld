import { AudioManager } from './audio';

type MenuParams = {
  onStart: () => void;
  onRestart: () => void;
  audio: AudioManager;
};

export class Menu {
  private _params: MenuParams;
  private _scoreContainer: HTMLElement;
  private _scoreElement: HTMLElement;
  private _menuElement: HTMLElement;
  private _gameOverElement: HTMLElement;
  private _gameOverScore: HTMLElement;
  private _musicControl: HTMLElement;
  private _startButton: HTMLElement;
  private _restartButton: HTMLElement;
  private _overlay: HTMLElement;


  constructor(params: MenuParams) {
    this._params = params;
    this._Init();
  }

  private _Init() {
    this._scoreContainer = document.getElementById('scorediv')!;
    this._scoreElement = document.getElementById('score')!;
    this._menuElement = document.getElementById('menu')!;
    this._gameOverElement = document.getElementById('gameover')!;
    this._gameOverScore = document.getElementById('gameover-score')!;
    this._musicControl = document.getElementById('music-control')!;
    this._params.audio.preloadSound('music', './resources/background.mp3', true);
    this._params.audio.preloadSound('coin', './resources/coin.mp3');
    this._musicControl.classList.toggle('mute', this._params.audio.muted);
    this._startButton = document.getElementById('start-button')!;
    this._restartButton = document.getElementById('restart-button')!;
    this._overlay = document.getElementById('loading-overlay')!;

    this._musicControl.onclick = () => {
      const muted = this._params.audio.toggleMute();
      this._musicControl.classList.toggle('mute', muted);
      this._musicControl.setAttribute('aria-label', muted ? 'Unmute music' : 'Mute music');
      this._musicControl.setAttribute('title', muted ? 'Unmute music' : 'Mute music');
    }
  }

  EnableStartMenu() {
    this._overlay.classList.add('fade-out');
    this._startButton.innerHTML = 'Start';
    this._startButton.classList.add('loaded');
    this._startButton.onclick = () => {
      this._params.audio.unlock();
      this._params.audio.playMusic('music');
      this._params.onStart();
      this._menuElement.style.display = 'none';
      this._scoreContainer.style.display = 'flex';
    }
  }

  ShowGameOver(score: number) {
    this._params.audio.fadeOut('music', 500);
    this._scoreContainer.style.display = 'none';
    this._gameOverElement.style.display = 'flex';
    this._gameOverScore.innerText = score.toString();
    this._restartButton.onclick = () => {
      this._params.audio.unlock();
      this._params.audio.playMusic('music');
      this._params.onRestart();
      this._gameOverElement.style.display = 'none';
      this._scoreContainer.style.display = 'flex';
    }
  }

  UpdateScore(score: number) {
    if (this._scoreElement) {
      this._scoreElement.innerText = score.toString();
    }
  }

}