import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
//import { FBXLoader } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/loaders/FBXLoader';
import * as CANNON from 'https://cdn.skypack.dev/cannon-es@0.18.0';

import { CharacterController } from './movement.js';
import { ThirdPersonCamera } from './camera.js';


class World {
    constructor() {
        this._Init();
    }

    _Init() {
        this.started = false;
        this._threejs = new THREE.WebGLRenderer({antialias: true});
        this._threejs.shadowMap.enabled = true;
        this._threejs.shadowMap.type = THREE.PCFSoftShadowMap;
        this._threejs.setPixelRatio(window.devicePixelRatio);
        this._threejs.setSize(window.innerWidth, window.innerHeight);

        document.body.appendChild(this._threejs.domElement);

        window.addEventListener('resize', () => {
            this._OnWindowResize();
          }, false);

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

        // initialise cannon world
        this._world = new CANNON.World();
        this._world.gravity.set(0, -20, 0);

        // create eveything in scene/world
        this._createPlanet();
        this._createStars();

        this._mixers = [];
        this._previousRAF = null;
        this._LoadAnimatedModel();

        this._animateMenu();
    }

    _createPlanet() {
        this._planetRadius = 100;
        this._atmosphereRadius = 50;
        const planetGeometry = new THREE.SphereGeometry(this._planetRadius, 32, 16);
        const planetMaterial = new THREE.MeshPhongMaterial({ color:0x900C3F  });
        //const planet = new THREE.Mesh(planetGeometry, planetMaterial);
        this.planet = new THREE.Mesh(planetGeometry, planetMaterial);
        this.planet.castShadow = false;
        this.planet.receiveShadow = true;
        this._scene.add(this.planet);

        this.planetBody = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Sphere(this._planetRadius),
        });

        this._world.addBody(this.planetBody);

        const cubeSides = new THREE.Vector3(3, 3, 3)
        const cubeGeometry = new THREE.BoxBufferGeometry(cubeSides.x*2, cubeSides.y*2, cubeSides.z*2);
        const cubeMaterial = new THREE.MeshPhongMaterial({color:0x606060});
        this.cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        this.cube.castShadow = true;
        this.cube.receiveShadow = true;
        this.cube.position.set(5, this._planetRadius+10,0);
        this._scene.add(this.cube);
        
        this.cubeBody = new CANNON.Body({
            mass: 5,
            shape: new CANNON.Box(cubeSides),
        });

        this.cubeBody.position.copy(this.cube.position);

        this._world.addBody(this.cubeBody);

    }

    // _createPlanet() {
    //     this._planetRadius = 100;
    //     this._atmosphereRadius = 100;
    //     const loader = new FBXLoader();
    //     loader.setPath('./resources/models/');
    //     loader.load('planet.fbx', (fbx) => {
    //         fbx.traverse(c => {
    //             c.castShadow = true;
    //             c.receiveShadow = true;
    //         });
    //         fbx.position.set(0, 0, 0);
        
    //         this._target = fbx;
    //         this._scene.add(this._target);
    //     });
    // }

    _createStars() {
        // load textures
        const loader = new THREE.TextureLoader();
        const star = loader.load('./resources/star.svg');
        
        const particlesGeometry = new THREE.BufferGeometry;
        const particlescnt = 2500;
        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.5,
            map: star,
            transparent: true
        });
        const posArray = new Float32Array(particlescnt * 3);
        for (let i = 0; i < particlescnt * 3; i+=3) {
            // generates values outside of planet
            posArray[i] = (Math.random() - 0.5) * 500;
            if (Math.abs(posArray[i]) < this._planetRadius + this._atmosphereRadius) {
                posArray[i+1] = (Math.random() - 0.5) * 500;
                if (Math.abs(posArray[i+1]) < this._planetRadius + this._atmosphereRadius) {
                    posArray[i+2] = (Math.random() * (500 - this._planetRadius-this._atmosphereRadius) + this._planetRadius+this._atmosphereRadius) * (Math.random() < 0.5 ? -1 : 1);
                } else {
                    posArray[i+2] = (Math.random() - 0.5) * 500;
                }
            } else {
                posArray[i+1] = (Math.random() - 0.5) * 500;
                posArray[i+2] = (Math.random() - 0.5) * 500;
            }
        }
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        this.particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
        this._scene.add(this.particlesMesh);
    }

    _animateStars() {
        this.particlesMesh.rotation.x += 0.00001;
        this.particlesMesh.rotation.y += 0.00001;
        this.particlesMesh.rotation.z += 0.00001;
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
            world: this._world,
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
                this._animateStars();
                this._threejs.render(this._scene, this._camera);
            });
        }
    }

    _handlePhysics() {
        this.cube.position.copy(this.cubeBody.position);
        this.cube.quaternion.copy(this.cubeBody.quaternion);
    }

    _animate() {
        requestAnimationFrame((t) => {
            if (this._previousRAF === null) {
                this._previousRAF = t;
            }
        
            this._animate();

            this._animateStars();
            this._handlePhysics();

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

        this._world.step(1/60, timeElapsedS);

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
        const audioelem = document.getElementById('music')
        audioelem.play(); audioelem.volume = 0.2;
        document.getElementById("menu").style.display="none";
    };
})
