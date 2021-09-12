import * as THREE from 'https://cdn.skypack.dev/three';
import { OrbitControls } from 'https://cdn.skypack.dev/three/examples/jsm/controls/OrbitControls';

// load textures
const loader = new THREE.TextureLoader();
const star = loader.load('static/star.svg');


// create scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
camera.position.setZ(50);


// add light
const pointLight = new THREE.PointLight(0xffffff);
pointLight.position.set(100, 100, 100);


// Planet
const planetGeometry = new THREE.SphereGeometry(15, 32, 16);
const planetMaterial = new THREE.MeshPhongMaterial({ color:0x900C3F  });
const planet = new THREE.Mesh(planetGeometry, planetMaterial);


// star particles
const particlesGeometry = new THREE.BufferGeometry;
const particlescnt = 2500;
const particlesMaterial = new THREE.PointsMaterial({
    size: 0.5,
    map: star,
    transparent: true
});
const posArray = new Float32Array(particlescnt * 3);
for (let i = 0; i < particlescnt * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * (500) ;
}
particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);


// add all objects
scene.add(pointLight, planet, particlesMesh);

const controls = new OrbitControls(camera, renderer.domElement);

// for debugging
const ambientLight = new THREE.AmbientLight(0xffffff);
const lightHelper = new THREE.PointLightHelper(pointLight);
const gridHelper = new THREE.GridHelper(200, 50);
//scene.add(ambientLight, lightHelper, gridHelper);


function animate() {
    requestAnimationFrame(animate);

    planet.rotation.y += 0.001;

    particlesMesh.rotation.x += 0.0001;
    particlesMesh.rotation.y += 0.0001;
    particlesMesh.rotation.z += 0.0001;

    controls.update();
    renderer.render(scene, camera);
}

animate();