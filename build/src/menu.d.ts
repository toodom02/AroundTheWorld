export declare class Menu {
    _params: {
        onStart: () => void;
        onRestart: () => void;
    };
    _scoreElement: HTMLElement;
    _menuElement: HTMLElement;
    _gameOverElement: HTMLElement;
    _gameOverScore: HTMLElement;
    _musicElement: HTMLAudioElement;
    _musicControl: HTMLElement;
    _startButton: HTMLElement;
    _restartButton: HTMLElement;
    _overlay: HTMLElement;
    constructor(params: {
        onStart: () => void;
        onRestart: () => void;
    });
    _Init(): void;
    EnableStartMenu(): void;
    ShowGameOver(score: number): void;
    _PlayMusic(): void;
}
