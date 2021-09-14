import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';

import { CharacterController } from './movement.js';
import { ThirdPersonCamera } from './camera.js';

class World {
    constructor() {
        this._Init();
    }

    _Init() {
        this.started = false;
        this._threejs = new THREE.WebGLRenderer();
        this._threejs.shadowMap.enabled = true;
        this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
        this._threejs.setPixelRatio(window.devicePixelRatio);
        this._threejs.setSize(window.innerWidth, window.innerHeight);

        document.body.appendChild(this._threejs.domElement);

        window.addEventListener('resize', () => {
            this._OnWindowResize();
          }, false);

        // load textures
        const loader = new THREE.TextureLoader();
        const star = loader.load('./resources/star.svg');

        const fov = 75;
        const aspect = window.innerWidth / window.innerHeight;
        const near = 0.1;
        const far = 1000;

        this._camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this._camera.position.set(0, -65, 300);
        this._camera.lookAt(0, 0, 0);

        this._scene = new THREE.Scene();

        let light = new THREE.DirectionalLight(0xffffff);
        light.position.set(100, 100, 100);
        light.target.position.set(0, 0, 0);
        light.castShadow = true;
        light.shadow.bias = -0.001;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        light.shadow.camera.near = 0.1;
        light.shadow.camera.far = 500.0;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 500.0;
        light.shadow.camera.left = 100;
        light.shadow.camera.right = -100;
        light.shadow.camera.top = 100;
        light.shadow.camera.bottom = -100;
        this._scene.add(light);

        light = new THREE.AmbientLight(0x202020);
        this._scene.add(light);

        // Planet
        this._planetRadius = 100;
        const planetGeometry = new THREE.SphereGeometry(this._planetRadius, 64, 32);
        const planetMaterial = new THREE.MeshPhongMaterial({ color:0x900C3F  });
        const planet = new THREE.Mesh(planetGeometry, planetMaterial);
        planet.castShadow = false;
        planet.receiveShadow = true;
        this._scene.add(planet);

        // star particles
        const particlesGeometry = new THREE.BufferGeometry;
        const particlescnt = 5000;
        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.5,
            map: star,
            transparent: true
        });
        const posArray = new Float32Array(particlescnt * 3);
        for (let i = 0; i < particlescnt * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 1000;
        }
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        this.particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
        this._scene.add(this.particlesMesh);

        this._mixers = [];
        this._previousRAF = null;

        this._LoadAnimatedModel();

        this._animateMenu();
        
    }


    _OnWindowResize() {
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();
        this._threejs.setSize(window.innerWidth, window.innerHeight);
      }

    _LoadAnimatedModel() {
        const params = {
            camera: this._camera,
            scene: this._scene,
            planetRadius: this._planetRadius,
        }
        this._controls = new CharacterController(params);

        this._thirdPersonCamera = new ThirdPersonCamera({
            camera: this._camera,
            target: this._controls,
        });
    }

    _animateMenu() {
        if (!this.started){
            requestAnimationFrame(() => {
                this._animateMenu();

                this.particlesMesh.rotation.x += 0.0001;
                this.particlesMesh.rotation.y += 0.0001;
                this.particlesMesh.rotation.z += 0.0001;
                this._threejs.render(this._scene, this._camera);
            });
        }
    }

    _animate() {
        requestAnimationFrame((t) => {
          if (this._previousRAF === null) {
            this._previousRAF = t;
          }
    
          this._animate();
    
          this._threejs.render(this._scene, this._camera);
          this._Step(t - this._previousRAF);
          this._previousRAF = t;
        });
    }
      
    
    _Step(timeElapsed) {
        const timeElapsedS = timeElapsed * 0.001;
        if (this._mixers) {
          this._mixers.map(m => m.update(timeElapsedS));
        }
    
        if (this._controls) {
          this._controls.Update(timeElapsedS);
        }

        this._thirdPersonCamera.Update(timeElapsedS);
    }

}

let _APP = null;
window.addEventListener('DOMContentLoaded', () => {
    _APP = new World();
    const startButton = document.getElementById("start-button");
    startButton.onclick = function () {
        _APP.started = true;
        _APP._animate();
        document.getElementById("menu").style.display="none";
    };
})
