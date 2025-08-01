export class Menu {
  _params: {
    onStart: () => void;
    onRestart: () => void;
  };
  _scoreElement: HTMLElement;
  _menuElement: HTMLElement;
  _gameOverElement: HTMLElement;
  _gameOverScore: HTMLElement;
  _musicElement: HTMLAudioElement;
  _startButton: HTMLElement;
  _restartButton: HTMLElement;
  showMenu: boolean;

  constructor(params: {
    onStart: () => void;
    onRestart: () => void;
  }) {
    this._params = params;
    this._Init();
  }

  _Init() {
    this._scoreElement = document.getElementById('score')!;
    this._menuElement = document.getElementById('menu')!;
    this._gameOverElement = document.getElementById('gameover')!;
    this._gameOverScore = document.getElementById('gameover-score')!;
    this._musicElement = document.getElementById('music') as HTMLAudioElement;
    this._startButton = document.getElementById('start-button')!;
    this._restartButton = document.getElementById('restart-button')!;
    this.showMenu = true;
  }

  EnableStartMenu() {
    this._startButton.innerHTML = 'Start';
    this._startButton.classList.add('loaded');
    this._startButton.onclick = () => {
      this._params.onStart();
      this._PlayMusic();
      this._menuElement.style.display = 'none';
    }
  }

  ShowGameOver(score: number) {
    this._gameOverElement.style.display = 'flex';
    this._gameOverScore.innerText = score.toString();
    this._restartButton.onclick = () => {
      this._params.onRestart();
      this._gameOverElement.style.display = 'none';
    }
  }

  _PlayMusic() {
    void this._musicElement.play();
    this._musicElement.volume = 0.2;
  }
}