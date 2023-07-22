import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import * as CANNON from 'cannon-es';

import {threeToCannon, ShapeType, ShapeResult} from 'three-to-cannon';

export class Environment {
  _params: {
    scene: THREE.Scene;
    world: CANNON.World;
    groundMaterial: CANNON.Material;
  };
  _planetRadius: number;
  _atmosphereRadius: number;
  ball: THREE.Mesh;
  ballBody: CANNON.Body;
  moon: THREE.Mesh;
  pivotPoint: THREE.Object3D;
  particlesMesh: THREE.Points;
  environLoaded: boolean;
  constructor(params: {
    scene: THREE.Scene;
    world: CANNON.World;
    groundMaterial: CANNON.Material;
  }) {
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

    gltfloader.load('island.glb', gltf => {
      gltf.scene.traverse(c => {
        c.receiveShadow = true;
        c.castShadow = true;
      });
      this._params.scene.add(gltf.scene);

      const cannonConvert = threeToCannon(<any>gltf.scene, {
        type: ShapeType.HULL,
      });
      const {shape} = cannonConvert as ShapeResult;
      const body = new CANNON.Body({
        mass: 0,
        shape: shape,
        material: this._params.groundMaterial,
      });
      this._params.world.addBody(body);
    });

    gltfloader.load('rock-large.glb', gltf => {
      gltf.scene.traverse(c => {
        c.receiveShadow = true;
        c.castShadow = true;
      });
      gltf.scene.position.set(60, 0, -20);
      this._params.scene.add(gltf.scene);

      const cannonConvert = threeToCannon(<any>gltf.scene, {
        type: ShapeType.HULL,
      });
      const {shape} = cannonConvert as ShapeResult;
      const body = new CANNON.Body({
        mass: 0,
        shape: shape,
        material: this._params.groundMaterial,
        position: new CANNON.Vec3(
          gltf.scene.position.x,
          gltf.scene.position.y,
          gltf.scene.position.z
        ),
      });
      // small correction to angle
      body.quaternion.setFromEuler(0, (11 * Math.PI) / 6, 0);
      this._params.world.addBody(body);
    });

    gltfloader.load('rock-small.glb', gltf => {
      gltf.scene.traverse(c => {
        c.receiveShadow = true;
        c.castShadow = true;
      });
      gltf.scene.position.set(-33, 0, 55);
      this._params.scene.add(gltf.scene);

      const cannonConvert = threeToCannon(<any>gltf.scene, {
        type: ShapeType.HULL,
      });
      const {shape} = cannonConvert as ShapeResult;
      const body = new CANNON.Body({
        mass: 0,
        shape: shape,
        material: this._params.groundMaterial,
        position: new CANNON.Vec3(
          gltf.scene.position.x,
          gltf.scene.position.y,
          gltf.scene.position.z
        ),
      });
      this._params.world.addBody(body);

      const rock2 = gltf.scene.clone();
      rock2.scale.setScalar(0.5);
      rock2.position.set(-6, 0, 70);
      rock2.rotation.set(0, Math.PI / 2, 0);
      this._params.scene.add(rock2);
      const rock2Radius = 3;
      const body2 = new CANNON.Body({
        mass: 0,
        // converter not working for scaled object
        shape: new CANNON.Sphere(rock2Radius),
        material: this._params.groundMaterial,
        position: new CANNON.Vec3(
          rock2.position.x,
          rock2.position.y,
          rock2.position.z
        ),
      });
      body2.position.x -= 0.5;
      body2.position.z += 1;
      body2.position.y += rock2Radius;
      this._params.world.addBody(body2);

      const rock3 = gltf.scene.clone();
      rock3.scale.setScalar(0.7);
      rock3.position.set(-45, 0, 30);
      this._params.scene.add(rock3);

      const body3Radius = 4;
      const body3 = new CANNON.Body({
        mass: 0,
        // converter not working for scaled object
        shape: new CANNON.Sphere(body3Radius),
        material: this._params.groundMaterial,
        position: new CANNON.Vec3(
          rock3.position.x,
          rock3.position.y,
          rock3.position.z
        ),
      });
      body3.position.x -= 2;
      body3.position.y += body3Radius;
      this._params.world.addBody(body3);
    });

    gltfloader.load('spikey-tree.glb', gltf => {
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
      body.position = new CANNON.Vec3(
        gltf.scene.position.x,
        gltf.scene.position.y,
        gltf.scene.position.z
      );
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
      body2.position = new CANNON.Vec3(
        tree2.position.x,
        tree2.position.y,
        tree2.position.z
      );
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
      body3.position = new CANNON.Vec3(
        tree3.position.x,
        tree3.position.y,
        tree3.position.z
      );
      body3.position.y += shape.height / 2;
      this._params.world.addBody(body3);
    });
    gltfloader.load('tree.glb', gltf => {
      gltf.scene.traverse(c => {
        c.receiveShadow = true;
        c.castShadow = true;
      });
      this._params.scene.add(gltf.scene);

      const bodyHeight = 40;
      const body = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Cylinder(7, 7, bodyHeight),
        material: this._params.groundMaterial,
      });
      body.position = new CANNON.Vec3(
        gltf.scene.position.x,
        gltf.scene.position.y,
        gltf.scene.position.z
      );
      body.position.y += bodyHeight / 2;
      this._params.world.addBody(body);
    });
    gltfloader.load('log.glb', gltf => {
      gltf.scene.traverse(c => {
        c.receiveShadow = true;
        c.castShadow = true;
      });
      gltf.scene.position.set(-30, 0, -55);
      gltf.scene.rotation.set(0, 20, 0);
      this._params.scene.add(gltf.scene);

      const bodyRadius = 2;
      const body = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Cylinder(bodyRadius, bodyRadius, 20),
        material: this._params.groundMaterial,
        position: new CANNON.Vec3(
          gltf.scene.position.x,
          gltf.scene.position.y,
          gltf.scene.position.z
        ),
      });
      body.position.y += bodyRadius;
      body.quaternion.setFromEuler(Math.PI / 2, 0, (20 * Math.PI) / 180);
      this._params.world.addBody(body);
    });
    this.environLoaded = true;
  }

  _createPhysicsObject() {
    const radius = 3;
    const texture = new THREE.TextureLoader().load(
      './resources/ball-texture.png'
    );
    const ballGeometry = new THREE.SphereGeometry(radius);
    const ballMaterial = new THREE.MeshPhongMaterial({map: texture});
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
    this.ballBody.position = new CANNON.Vec3(
      this.ball.position.x,
      this.ball.position.y,
      this.ball.position.z
    );

    this._params.world.addBody(this.ballBody);
  }

  _createMoon() {
    const moonGeometry = new THREE.SphereGeometry(50, 32, 16);
    const moonMaterial = new THREE.MeshPhongMaterial({color: 0x900c3f});
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
      if (Math.abs(posArray[i]) < this._planetRadius + this._atmosphereRadius) {
        posArray[i + 1] = (Math.random() - 0.5) * 1000;
        if (
          Math.abs(posArray[i + 1]) <
          this._planetRadius + this._atmosphereRadius
        ) {
          posArray[i + 2] =
            (Math.random() *
              (1000 - this._planetRadius - this._atmosphereRadius) +
              this._planetRadius +
              this._atmosphereRadius) *
            (Math.random() < 0.5 ? -1 : 1);
        } else {
          posArray[i + 2] = (Math.random() - 0.5) * 1000;
        }
      } else {
        posArray[i + 1] = (Math.random() - 0.5) * 1000;
        posArray[i + 2] = (Math.random() - 0.5) * 1000;
      }
    }
    particlesGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(posArray, 3)
    );
    this.particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    this._params.scene.add(this.particlesMesh);
  }

  _handlePhysicsObjects() {
    if (this.ball) {
      this.ball.position.copy(
        new THREE.Vector3(
          this.ballBody.position.x,
          this.ballBody.position.y,
          this.ballBody.position.z
        )
      );
      this.ball.quaternion.copy(
        new THREE.Quaternion(
          this.ballBody.quaternion.x,
          this.ballBody.quaternion.y,
          this.ballBody.quaternion.z,
          this.ballBody.quaternion.w
        )
      );

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
