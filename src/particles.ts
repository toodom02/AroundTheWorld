import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

const _VS = `
uniform float pointMultiplier;

attribute float size;
attribute float angle;
attribute vec4 colour;

varying vec4 vColour;
varying vec2 vAngle;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = size * pointMultiplier / gl_Position.w;

  vAngle = vec2(cos(angle), sin(angle));
  vColour = colour;
}`;

const _FS = `

uniform sampler2D diffuseTexture;

varying vec4 vColour;
varying vec2 vAngle;

void main() {
  vec2 coords = (gl_PointCoord - 0.5) * mat2(vAngle.x, vAngle.y, -vAngle.y, vAngle.x) + 0.5;
  gl_FragColor = texture2D(diffuseTexture, coords) * vColour;
}`;


class LinearSpline {
    _points: any[];
    _lerp: any;
    constructor(lerp) {
        this._points = [];
        this._lerp = lerp;
    }

    AddPoint(t, d) {
        this._points.push([t, d]);
    }

    Get(t) {
        let p1 = 0;

        for (let i = 0; i < this._points.length; i++) {
            if (this._points[i][0] >= t) {
                break;
            }
            p1 = i;
        }

        const p2 = Math.min(this._points.length - 1, p1 + 1);

        if (p1 == p2) {
            return this._points[p1][1];
        }

        return this._lerp(
            (t - this._points[p1][0]) / (
                this._points[p2][0] - this._points[p1][0]),
            this._points[p1][1], this._points[p2][1]);
    }
}


export class ParticleSystem {
    _material: THREE.ShaderMaterial;
    totalLife: number;
    deleted: boolean;
    _particles: any[];
    _geometry: THREE.BufferGeometry;
    _points: THREE.Points;
    scene: THREE.Scene;
    meteor: any;
    _alphaSpline: LinearSpline;
    _colourSpline: LinearSpline;
    _sizeSpline: LinearSpline;
    helperval: number;
    constructor(params) {
        const uniforms = {
            diffuseTexture: {
                value: new THREE.TextureLoader().load('./resources/fire.png')
            },
            pointMultiplier: {
                value: window.innerHeight / (2.0 * Math.tan(0.5 * 60.0 * Math.PI / 180.0))
            }
        };

        this._material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: _VS,
            fragmentShader: _FS,
            blending: THREE.AdditiveBlending,
            depthTest: true,
            depthWrite: false,
            transparent: true,
            vertexColors: true
        });

        this.totalLife = 2;
        this.deleted = false;

        this._particles = [];

        this._geometry = new THREE.BufferGeometry();
        this._geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
        this._geometry.setAttribute('size', new THREE.Float32BufferAttribute([], 1));
        this._geometry.setAttribute('colour', new THREE.Float32BufferAttribute([], 4));
        this._geometry.setAttribute('angle', new THREE.Float32BufferAttribute([], 1));

        this._points = new THREE.Points(this._geometry, this._material);

        this.scene = params.scene;
        this.scene.add(this._points);

        this.meteor = params.meteor;

        this._alphaSpline = new LinearSpline((t, a, b) => {
            return a + t * (b - a);
        });
        this._alphaSpline.AddPoint(0.0, 0.0);
        this._alphaSpline.AddPoint(0.1, 1.0);
        this._alphaSpline.AddPoint(0.6, 1.0);
        this._alphaSpline.AddPoint(1.0, 0.0);

        this._colourSpline = new LinearSpline((t, a, b) => {
            const c = a.clone();
            return c.lerp(b, t);
        });
        this._colourSpline.AddPoint(0.0, new THREE.Color(0xFFFF80));
        this._colourSpline.AddPoint(1.0, new THREE.Color(0xFF8080));

        this._sizeSpline = new LinearSpline((t, a, b) => {
            return a + t * (b - a);
        });
        this._sizeSpline.AddPoint(0.0, 1.0);
        this._sizeSpline.AddPoint(0.5, 5.0);
        this._sizeSpline.AddPoint(1.0, 1.0);
    
        this._UpdateGeometry();
        this._AddParticles(0);
    }

    _AddParticles(timeElapsed) {
        if (!this.helperval) {
            this.helperval = 0.0;
        }
        this.helperval += timeElapsed;
        const n = Math.floor(this.helperval * 75.0);
        this.helperval -= n / 75.0;

        for (let i = 0; i < n; i++) {
            const life = (Math.random() * 0.75 + 0.25) * 10.0;
            this._particles.push({
                position: new THREE.Vector3(
                    (Math.random() * 20 - 1) * 1.0,
                    (Math.random() * 20 - 1) * 1.0,
                    (Math.random() * 20 - 1) * 1.0
                ),
                size: (Math.random() * 0.5 + 0.5) * 4.0,
                colour: new THREE.Color(),
                alpha: 1.0,
                life: life,
                maxLife: life,
                rotation: Math.random() * 2.0 * Math.PI,
                velocity: new THREE.Vector3(0, 3, 0),
            });
        }
    }

    _UpdateGeometry() {
        const positions = [];
        const sizes = [];
        const colours = [];
        const angles = [];

        const meteorPos = this.meteor.Position;
        const rad = this.meteor.radius;

        for (let p of this._particles) {
            positions.push(meteorPos.x + p.position.x - rad, meteorPos.y + p.position.y - rad, meteorPos.z + p.position.z - rad);
            colours.push(p.colour.r, p.colour.g, p.colour.b, p.alpha);
            sizes.push(p.currentSize);
            angles.push(p.rotation);
        }

        this._geometry.setAttribute(
            'position', new THREE.Float32BufferAttribute(positions, 3));
        this._geometry.setAttribute(
            'size', new THREE.Float32BufferAttribute(sizes, 1));
        this._geometry.setAttribute(
            'colour', new THREE.Float32BufferAttribute(colours, 4));
        this._geometry.setAttribute(
            'angle', new THREE.Float32BufferAttribute(angles, 1));
    
        this._geometry.attributes.position.needsUpdate = true;
        this._geometry.attributes.size.needsUpdate = true;
        this._geometry.attributes.colour.needsUpdate = true;
        this._geometry.attributes.angle.needsUpdate = true;
    }

    _UpdateParticles(timeElapsed) {
        for (let p of this._particles) {
            p.life -= timeElapsed;
        }

        this._particles = this._particles.filter(p => {
            return p.life > 0.0;
        });

        for (let p of this._particles) {
            const t = 1.0 - p.life / p.maxLife;

            p.rotation += timeElapsed * 0.5;
            p.alpha = this._alphaSpline.Get(t);
            p.currentSize = p.size * this._sizeSpline.Get(t);
            p.colour.copy(this._colourSpline.Get(t));

            p.position.add(p.velocity.clone().multiplyScalar(timeElapsed));

            const drag = p.velocity.clone();
            drag.multiplyScalar(timeElapsed * 0.1);
            drag.x = Math.sign(p.velocity.x) * Math.min(Math.abs(drag.x), Math.abs(p.velocity.x));
            drag.y = Math.sign(p.velocity.y) * Math.min(Math.abs(drag.y), Math.abs(p.velocity.y));
            drag.z = Math.sign(p.velocity.z) * Math.min(Math.abs(drag.z), Math.abs(p.velocity.z));
            p.velocity.sub(drag);
        }

    }

    Delete() {
        this.scene.remove(this._points);
        this.deleted = true;
    }

    Step(timeElapsed) {
        if (this.totalLife > 0) {
            this._AddParticles(timeElapsed);
        } else if (this._particles.length === 0) {
            this.Delete();
        }
        this._UpdateParticles(timeElapsed);
        this._UpdateGeometry();
        this.totalLife -= timeElapsed;
    }
}