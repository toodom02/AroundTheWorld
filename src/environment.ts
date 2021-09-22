import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { FBXLoader } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/loaders/FBXLoader';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/loaders/GLTFLoader';
import * as CANNON from 'https://cdn.skypack.dev/cannon-es@0.18.0';

import { threeToCannon, ShapeType  } from 'https://cdn.skypack.dev/three-to-cannon@v4.0.2';

export class Environment{
    _params: any;
    _planetRadius: number;
    _atmosphereRadius: number;
    cube: THREE.Mesh;
    cubeBody: CANNON.Body;
    moon: THREE.Mesh;
    pivotPoint: THREE.Object3D;
    particlesMesh: THREE.Points;
    constructor(params) {
        this._params = params;
        this._Init();
    }

    _Init() {
        this._createPlanet();
        this._createStars();
        this._createMoon();
    }

    _createPlanet() {
        this._planetRadius = 100;
        this._atmosphereRadius = 50;

        // Adjust constraint equation parameters for ground/ground contact
        const ground_ground_cm = new CANNON.ContactMaterial(this._params.groundMaterial, this._params.groundMaterial, {
            friction: 0.4,
            restitution: 0.3,
        });

        // Add contact material to the world
        this._params.world.addContactMaterial(ground_ground_cm);

        const loader = new GLTFLoader();
        loader.setPath('./resources/models/');
        loader.load('rock.glb', (gltf) => {
            gltf.scene.traverse(c => {
                c.receiveShadow = true;
            })
            this._params.scene.add(gltf.scene);

            const planetConvert = threeToCannon(gltf.scene, {type: ShapeType.HULL});
            const {shape} = planetConvert;
            const planetBody = new CANNON.Body({
                mass: 0,
                shape: shape,
                material: this._params.groundMaterial,
            });
            this._params.world.addBody(planetBody);
            this._params.loaded.push('planet');
        });

        const fbxloader = new FBXLoader();
        fbxloader.setPath('./resources/models/');
        fbxloader.load('tree.fbx', (fbx) => {
            fbx.scale.setScalar(0.05);
            fbx.traverse(c => {
                c.castShadow = true;
            })
            this._params.scene.add(fbx);
            fbx.position.set(0,0,0);

            const halfExtents = new THREE.Vector3(4, 16, 3);

            const treeBody = new CANNON.Body({
                mass: 0,
                shape: new CANNON.Box(halfExtents),
                material: this._params.groundMaterial,
            });
            treeBody.position.copy(fbx.position);
            treeBody.position.y += halfExtents.y;
            treeBody.position.x -= 1
            
            this._params.world.addBody(treeBody);
            this._params.loaded.push('tree');
        });


        const cubeSides = new THREE.Vector3(3, 3, 3)
        const cubeGeometry = new THREE.BoxBufferGeometry(cubeSides.x*2, cubeSides.y*2, cubeSides.z*2);
        const cubeMaterial = new THREE.MeshPhongMaterial({color:0x606060});
        this.cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
        this.cube.castShadow = true;
        this.cube.receiveShadow = true;
        this.cube.position.set(5, 50, 15);
        this._params.scene.add(this.cube);
        
        this.cubeBody = new CANNON.Body({
            mass: 2,
            shape: new CANNON.Box(cubeSides),
            material: this._params.groundMaterial,
        });

        this.cubeBody.position.copy(this.cube.position);

        this._params.world.addBody(this.cubeBody);
    }

    _createMoon() {
        const moonGeometry = new THREE.SphereGeometry(50, 32, 16);
        const moonMaterial = new THREE.MeshPhongMaterial({ color:0x900C3F  });
        this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
        this.moon.castShadow = true;
        this.moon.receiveShadow = true;
        this.moon.position.set(400,100,-200)

        this.pivotPoint = new THREE.Object3D();
        this._params.scene.add(this.pivotPoint);
        this.pivotPoint.add(this.moon);
    }

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
        this._params.scene.add(this.particlesMesh);
    }

    _handlePhysicsObjects() {
        this.cube.position.copy(this.cubeBody.position);
        this.cube.quaternion.copy(this.cubeBody.quaternion);
    }

    animate() {
        this.particlesMesh.rotation.x += 0.00001;
        this.particlesMesh.rotation.y += 0.00001;
        this.particlesMesh.rotation.z += 0.00001;

        this.pivotPoint.rotation.x += 0.00002;
        this.pivotPoint.rotation.y += 0.00005;
        this.pivotPoint.rotation.z += 0.00001;
    }

}