import * as THREE from 'three';
import {GAME_CONFIG} from '../config';

type ScorePopupNode = {
  element: HTMLDivElement;
  world: THREE.Vector3;
  life: number;
  active: boolean;
};

export class ScorePopups {
  private _camera: THREE.PerspectiveCamera;
  private _container: HTMLElement;
  private _pool: ScorePopupNode[] = [];
  private _cursor = 0;
  private _projected = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera) {
    this._camera = camera;
    this._container =
      document.getElementById('score-popups') ?? this._createContainer();

    const count = GAME_CONFIG.EFFECTS.POPUP_POOL_SIZE;
    for (let i = 0; i < count; i++) {
      const element = document.createElement('div');
      element.className = 'score-popup';
      element.style.display = 'none';
      this._container.appendChild(element);
      this._pool.push({
        element,
        world: new THREE.Vector3(),
        life: 0,
        active: false,
      });
    }
  }

  private _createContainer(): HTMLElement {
    const element = document.createElement('div');
    element.id = 'score-popups';
    document.body.appendChild(element);
    return element;
  }

  public spawn(world: THREE.Vector3, text: string, color = '#ffd74a'): void {
    const node = this._pool[this._cursor++ % this._pool.length];
    node.element.textContent = text;
    node.element.style.color = color;
    node.element.style.textShadow = `0 0 0.5em ${color}`;
    node.element.style.opacity = '1';
    node.element.style.transform = 'translate(-50%, -50%)';
    node.element.style.display = 'block';
    node.world.copy(world);
    node.life = 0;
    node.active = true;
  }

  public update(deltaSeconds: number): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const lifetime = GAME_CONFIG.EFFECTS.POPUP_LIFETIME;
    const rise = GAME_CONFIG.EFFECTS.POPUP_RISE_PX;

    for (const node of this._pool) {
      if (!node.active) continue;

      node.life += deltaSeconds;
      const progress = node.life / lifetime;
      if (progress >= 1) {
        node.active = false;
        node.element.style.display = 'none';
        continue;
      }

      this._projected.copy(node.world).project(this._camera);
      const behindCamera = this._projected.z > 1;
      if (behindCamera) {
        node.element.style.display = 'none';
        continue;
      }

      node.element.style.display = 'block';
      const x = (this._projected.x * 0.5 + 0.5) * width;
      const y = (-this._projected.y * 0.5 + 0.5) * height;
      node.element.style.opacity = String(1 - progress);
      node.element.style.transform =
        'translate(-50%, -50%) ' +
        `translate(${x.toFixed(1)}px, ${(y - progress * rise).toFixed(1)}px)`;
    }
  }

  public clear(): void {
    this._cursor = 0;
    for (const node of this._pool) {
      node.life = 0;
      node.active = false;
      node.element.style.display = 'none';
    }
  }
}
