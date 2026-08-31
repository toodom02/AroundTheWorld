type Sound = {
  path: string;
  loop: boolean;
  element?: HTMLAudioElement;
};

export class AudioManager {
  private _sounds = new Map<string, Sound>();
  private _activeEffects = new Set<HTMLAudioElement>();
  private _muted = false;
  private _volume = 0.2;
  private _context?: AudioContext;

  public preloadSound(name: string, path: string, loop = false): void {
    if (this._sounds.has(name)) return;

    const sound: Sound = {
      path,
      loop,
      element: document.getElementById(`audio-${name}`) as HTMLAudioElement | undefined,
    };
    if (sound.element) {
      sound.element.preload = 'auto';
      sound.element.loop = loop;
      sound.element.volume = this._volume;
      sound.element.muted = this._muted;
    }
    if (loop) {
      sound.element ??= new Audio(path);
      sound.element.preload = 'auto';
      sound.element.loop = true;
      sound.element.volume = this._volume;
      sound.element.muted = this._muted;
    }
    this._sounds.set(name, sound);
  }

  public unlock(): void {
    if (!this._context) {
      this._context = new AudioContext();
    }
    void this._context.resume();
  }

  public play(name: string, volume = 1): void {
    const sound = this._sounds.get(name);
    if (!sound || sound.loop || this._muted) return;

    const template = sound.element ?? new Audio(sound.path);
    const element = template.cloneNode(true) as HTMLAudioElement;
    element.volume = this._scaledVolume(volume);
    element.preload = 'auto';
    this._activeEffects.add(element);
    element.addEventListener('ended', () => this._activeEffects.delete(element), { once: true });
    void element.play().catch(error => {
      this._activeEffects.delete(element);
      console.warn(`Unable to play sound "${name}".`, error);
    });
  }

  public playMusic(name: string, volume = 1): void {
    const sound = this._sounds.get(name);
    if (!sound?.element) return;

    const music = sound.element;
    music.volume = this._scaledVolume(volume);
    music.muted = this._muted;
    if (!this._muted) {
      void music.play().catch(error => {
        console.warn('Unable to play background music.', error);
      });
    }
  }

  public playFootstep(running: boolean): void {
    if (this._muted) return;

    this.unlock();
    const context = this._context!;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(running ? 145 : 115, now);
    oscillator.frequency.exponentialRampToValueAtTime(55, now + 0.08);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, this._scaledVolume(0.3)),
      now + 0.008,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.1);
  }

  public toggleMute(): boolean {
    this._muted = !this._muted;
    this._sounds.forEach(sound => {
      if (!sound.element) return;
      sound.element.muted = this._muted;
      if (!this._muted && sound.loop && sound.element.paused) {
        void sound.element.play().catch(error => {
          console.warn('Unable to resume background music.', error);
        });
      }
    });
    return this._muted;
  }

  public get muted(): boolean {
    return this._muted;
  }

  public setVolume(volume: number): void {
    this._volume = Math.min(1, Math.max(0, volume));
    this._sounds.forEach(sound => {
      if (sound.element) sound.element.volume = this._volume;
    });
  }

  public fadeOut(name: string, duration: number): void {
    const sound = this._sounds.get(name)?.element;
    if (!sound || sound.paused) return;

    const startVolume = sound.volume;
    const startTime = performance.now();
    const fade = (time: number) => {
      const progress = Math.min(1, (time - startTime) / duration);
      sound.volume = startVolume * (1 - progress);
      if (progress < 1) {
        requestAnimationFrame(fade);
      } else {
        sound.pause();
        sound.currentTime = 0;
        sound.volume = startVolume;
      }
    };
    requestAnimationFrame(fade);
  }

  private _scaledVolume(volume: number): number {
    return Math.min(1, Math.max(0, volume * this._volume));
  }

}
