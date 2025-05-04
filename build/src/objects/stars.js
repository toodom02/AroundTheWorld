import * as THREE from 'three';
export class Stars {
    _params;
    _particlesMesh;
    constructor(params) {
        this._params = params;
        this._Init();
    }
    _Init() {
        // load textures
        const loader = new THREE.TextureLoader();
        const star = loader.load('./resources/star.svg');
        const particlesGeometry = new THREE.BufferGeometry();
        const particlescnt = 2500;
        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.5,
            map: star,
            transparent: true,
        });
        const posArray = new Float32Array(particlescnt * 3);
        for (let i = 0; i < particlescnt * 3; i += 3) {
            // generates values outside of planet
            posArray[i] = (Math.random() - 0.5) * 1000;
            if (Math.abs(posArray[i]) <
                this._params.planetRadius + this._params.atmosphereRadius) {
                posArray[i + 1] = (Math.random() - 0.5) * 1000;
                if (Math.abs(posArray[i + 1]) <
                    this._params.planetRadius + this._params.atmosphereRadius) {
                    posArray[i + 2] =
                        (Math.random() *
                            (1000 -
                                this._params.planetRadius -
                                this._params.atmosphereRadius) +
                            this._params.planetRadius +
                            this._params.atmosphereRadius) *
                            (Math.random() < 0.5 ? -1 : 1);
                }
                else {
                    posArray[i + 2] = (Math.random() - 0.5) * 1000;
                }
            }
            else {
                posArray[i + 1] = (Math.random() - 0.5) * 1000;
                posArray[i + 2] = (Math.random() - 0.5) * 1000;
            }
        }
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        this._particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
        this._params.scene.add(this._particlesMesh);
    }
    animate() {
        this._particlesMesh.rotation.x += 0.00001;
        this._particlesMesh.rotation.y += 0.00001;
        this._particlesMesh.rotation.z += 0.00001;
    }
}
//# sourceMappingURL=stars.js.map