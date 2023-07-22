import * as THREE from 'three';
import { Meteor } from './meteor';
declare class LinearSpline {
    _points: any[][];
    _lerp: (a: any, b: any, c: any) => number;
    constructor(lerp: (a: any, b: any, c: any) => number);
    AddPoint(t: number, d: any | THREE.Color): void;
    Get(t: number): any;
}
export type Particle = {
    position: THREE.Vector3;
    size: number;
    currentSize: number;
    colour: THREE.Color;
    alpha: 1.0;
    life: number;
    maxLife: number;
    rotation: number;
    velocity: THREE.Vector3;
};
export declare class ParticleSystem {
    _material: THREE.ShaderMaterial;
    totalLife: number;
    deleted: boolean;
    _particles: Particle[];
    _geometry: THREE.BufferGeometry;
    _points: THREE.Points;
    scene: THREE.Scene;
    meteor: Meteor;
    _alphaSpline: LinearSpline;
    _colourSpline: LinearSpline;
    _sizeSpline: LinearSpline;
    helperval: number;
    constructor(params: {
        scene: THREE.Scene;
        meteor: Meteor;
    });
    _AddParticles(timeElapsed: number): void;
    _UpdateGeometry(): void;
    _UpdateParticles(timeElapsed: number): void;
    Delete(): void;
    Step(timeElapsed: number): void;
}
export {};
