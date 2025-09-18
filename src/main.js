import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// ---------- Scene, Camera, Renderer ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color("white");

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 1, 4);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ---------- OrbitControls ----------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// ---------- Lights ----------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
directionalLight.castShadow = true;
scene.add(directionalLight);

const pointLight = new THREE.PointLight(0xff0000, 1, 100);
pointLight.position.set(50, 50, 50);
scene.add(pointLight);

// ---------- Floor ----------
const floorGeometry = new THREE.PlaneGeometry(20, 20);
const floorMaterial = new THREE.MeshStandardMaterial({ color: "green" });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
floor.receiveShadow = true;
scene.add(floor);

// ---------- GLB Loader ----------
const loader = new GLTFLoader();
let mixer; // For animations
const base = import.meta.env.BASE_URL; // Vite base URL
const url = `${base}models/Chicken.glb`; // model path in public/models/

// Textures
const textureLoader = new THREE.TextureLoader();
const diffuseMap = textureLoader.load(`${base}models/gltf_embedded_0.png`);
const roughnessMap = textureLoader.load(`${base}models/gltf_embedded_2.png`);
const normalMap = textureLoader.load(
  `${base}models/gltf_embedded_3@channels=R.png`
);

loader.load(
  url,
  (gltf) => {
    const model = gltf.scene;
    scene.add(model);

    // Center and scale model
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    const size = box.getSize(new THREE.Vector3()).length();
    const scaleFactor = 2 / size;
    model.scale.setScalar(scaleFactor);

    // Apply textures & shadows
    model.traverse((child) => {
      if (child.isMesh) {
        if (!(child.material instanceof THREE.MeshStandardMaterial)) {
          child.material = new THREE.MeshStandardMaterial();
        }
        child.material.map = diffuseMap;
        child.material.roughnessMap = roughnessMap;
        child.material.roughness = 1;
        child.material.normalMap = normalMap;
        child.material.normalScale = new THREE.Vector2(1, 1);

        child.material.needsUpdate = true;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Setup animation mixer
    if (gltf.animations && gltf.animations.length) {
      mixer = new THREE.AnimationMixer(model);
      gltf.animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        action.play();
        action.loop = THREE.LoopRepeat;
      });
    }

    // Ensure camera looks at model
    camera.lookAt(model.position);
  },
  undefined,
  (error) => console.error("Error loading GLB:", error)
);

// ---------- Animation Loop ----------
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  if (mixer) mixer.update(clock.getDelta());
  controls.update();
  renderer.render(scene, camera);
}
animate();

// ---------- Handle Resize ----------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
