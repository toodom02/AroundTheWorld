import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/loaders/GLTFLoader';
import * as CANNON from 'https://cdn.skypack.dev/cannon-es@0.18.0';
import { threeToCannon, ShapeType } from 'https://cdn.skypack.dev/three-to-cannon@v4.0.2';
export class Environment {
    constructor(params) {
        this._params = params;
        this._Init();
    }
    _Init() {
        this.environLoaded = false;
        this._planetRadius = 100;
        this._atmosphereRadius = 100;
        this._createStars();
        this._createMoon();
        this._createScene();
        this._createPhysicsObject();
    }
    _createScene() {
        const gltfloader = new GLTFLoader();
        gltfloader.setPath('./resources/models/scene/');
        gltfloader.load('island.glb', (gltf) => {
            gltf.scene.traverse(c => {
                c.receiveShadow = true;
                c.castShadow = true;
            });
            this._params.scene.add(gltf.scene);
            const cannonConvert = threeToCannon(gltf.scene, { type: ShapeType.HULL });
            const { shape } = cannonConvert;
            const body = new CANNON.Body({
                mass: 0,
                shape: shape,
                material: this._params.groundMaterial,
            });
            this._params.world.addBody(body);
        });
        gltfloader.load('rock-large.glb', (gltf) => {
            gltf.scene.traverse(c => {
                c.receiveShadow = true;
                c.castShadow = true;
            });
            gltf.scene.position.set(60, 0, -20);
            this._params.scene.add(gltf.scene);
            const cannonConvert = threeToCannon(gltf.scene, { type: ShapeType.HULL });
            const { shape } = cannonConvert;
            const body = new CANNON.Body({
                mass: 0,
                shape: shape,
                material: this._params.groundMaterial,
                position: gltf.scene.position,
            });
            // small correction to angle
            body.quaternion.setFromEuler(0, 11 * Math.PI / 6, 0);
            this._params.world.addBody(body);
        });
        gltfloader.load('rock-small.glb', (gltf) => {
            gltf.scene.traverse(c => {
                c.receiveShadow = true;
                c.castShadow = true;
            });
            gltf.scene.position.set(-33, 0, 55);
            this._params.scene.add(gltf.scene);
            const cannonConvert = threeToCannon(gltf.scene, { type: ShapeType.HULL });
            const body = new CANNON.Body({
                mass: 0,
                shape: cannonConvert.shape,
                material: this._params.groundMaterial,
                position: gltf.scene.position,
            });
            this._params.world.addBody(body);
            const rock2 = gltf.scene.clone();
            rock2.scale.setScalar(0.5);
            rock2.position.set(-6, 0, 70);
            rock2.rotation.set(0, Math.PI / 2, 0);
            this._params.scene.add(rock2);
            const body2 = new CANNON.Body({
                mass: 0,
                // converter not working for scaled object
                shape: new CANNON.Sphere(3),
                material: this._params.groundMaterial,
                position: rock2.position,
            });
            body2.position.x -= 0.5;
            body2.position.z += 1;
            body2.position.y += body2.shapes[0].radius;
            this._params.world.addBody(body2);
            const rock3 = gltf.scene.clone();
            rock3.scale.setScalar(0.7);
            rock3.position.set(-45, 0, 30);
            this._params.scene.add(rock3);
            const body3 = new CANNON.Body({
                mass: 0,
                // converter not working for scaled object
                shape: new CANNON.Sphere(4),
                material: this._params.groundMaterial,
                position: rock3.position,
            });
            body3.position.x -= 2;
            body3.position.y += body3.shapes[0].radius;
            this._params.world.addBody(body3);
        });
        gltfloader.load('spikey-tree.glb', (gltf) => {
            gltf.scene.traverse(c => {
                c.receiveShadow = true;
                c.castShadow = true;
            });
            gltf.scene.position.set(-20, 0, 60);
            this._params.scene.add(gltf.scene);
            const shape = new CANNON.Cylinder(7, 7, 45);
            const body = new CANNON.Body({
                mass: 0,
                shape: shape,
                material: this._params.groundMaterial,
            });
            body.position.copy(gltf.scene.position);
            body.position.y += shape.height / 2;
            this._params.world.addBody(body);
            const tree2 = gltf.scene.clone();
            tree2.position.set(-30, 0, 38);
            tree2.rotation.set(0, 2.7, 0);
            this._params.scene.add(tree2);
            const body2 = new CANNON.Body({
                mass: 0,
                shape: shape,
                material: this._params.groundMaterial,
            });
            body2.position.copy(tree2.position);
            body2.position.y += shape.height / 2;
            this._params.world.addBody(body2);
            const tree3 = gltf.scene.clone();
            tree3.position.set(-50, 0, 45);
            tree3.rotation.set(0, 1.1, 0);
            this._params.scene.add(tree3);
            const body3 = new CANNON.Body({
                mass: 0,
                shape: shape,
                material: this._params.groundMaterial,
            });
            body3.position.copy(tree3.position);
            body3.position.y += shape.height / 2;
            this._params.world.addBody(body3);
        });
        gltfloader.load('tree.glb', (gltf) => {
            gltf.scene.traverse(c => {
                c.receiveShadow = true;
                c.castShadow = true;
            });
            this._params.scene.add(gltf.scene);
            const body = new CANNON.Body({
                mass: 0,
                shape: new CANNON.Cylinder(7, 7, 40),
                material: this._params.groundMaterial,
            });
            body.position.copy(gltf.scene.position);
            body.position.y += body.shapes[0].height / 2;
            this._params.world.addBody(body);
        });
        gltfloader.load('log.glb', (gltf) => {
            gltf.scene.traverse(c => {
                c.receiveShadow = true;
                c.castShadow = true;
            });
            gltf.scene.position.set(-30, 0, -55);
            gltf.scene.rotation.set(0, 20, 0);
            this._params.scene.add(gltf.scene);
            const body = new CANNON.Body({
                mass: 0,
                shape: new CANNON.Cylinder(2, 2, 20),
                material: this._params.groundMaterial,
                position: gltf.scene.position,
            });
            body.position.y += body.shapes[0].radiusTop;
            body.quaternion.setFromEuler(Math.PI / 2, 0, 20 * Math.PI / 180);
            this._params.world.addBody(body);
        });
        this.environLoaded = true;
    }
    _createPhysicsObject() {
        const radius = 3;
        const texture = THREE.ImageUtils.loadTexture("./resources/ball-texture.png");
        texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
        const ballGeometry = new THREE.SphereGeometry(radius);
        const ballMaterial = new THREE.MeshPhongMaterial({ map: texture });
        this.ball = new THREE.Mesh(ballGeometry, ballMaterial);
        this.ball.castShadow = true;
        this.ball.receiveShadow = true;
        this.ball.position.set(5, 50, 15);
        this._params.scene.add(this.ball);
        this.ballBody = new CANNON.Body({
            mass: 2,
            shape: new CANNON.Sphere(radius),
            material: this._params.groundMaterial,
        });
        this.ballBody.position.copy(this.ball.position);
        this._params.world.addBody(this.ballBody);
    }
    _createMoon() {
        const moonGeometry = new THREE.SphereGeometry(50, 32, 16);
        const moonMaterial = new THREE.MeshPhongMaterial({ color: 0x900C3F });
        this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
        this.moon.castShadow = true;
        this.moon.receiveShadow = true;
        this.moon.position.set(400, 100, -200);
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
        for (let i = 0; i < particlescnt * 3; i += 3) {
            // generates values outside of planet
            posArray[i] = (Math.random() - 0.5) * 1000;
            if (Math.abs(posArray[i]) < this._planetRadius + this._atmosphereRadius) {
                posArray[i + 1] = (Math.random() - 0.5) * 1000;
                if (Math.abs(posArray[i + 1]) < this._planetRadius + this._atmosphereRadius) {
                    posArray[i + 2] = (Math.random() * (1000 - this._planetRadius - this._atmosphereRadius) + this._planetRadius + this._atmosphereRadius) * (Math.random() < 0.5 ? -1 : 1);
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
        this.particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
        this._params.scene.add(this.particlesMesh);
    }
    _handlePhysicsObjects() {
        if (this.ball) {
            this.ball.position.copy(this.ballBody.position);
            this.ball.quaternion.copy(this.ballBody.quaternion);
            if (this.ballBody.position.y < -250) {
                this.ballBody.velocity.set(0, 0, 0);
                this.ballBody.position.set(5, 50, 15);
            }
        }
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
