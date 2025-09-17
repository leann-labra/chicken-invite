import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
//adding an animation

//----Setup scene, camera, renderer---///
const scene = new THREE.Scene();
scene.background = new THREE.Color("white");

//-----CAMERA----///
//use either PerspectiveCamera (3D) or OrthographicCamera (2D scenes)
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  1,
  1000
);
camera.position.set(0, 2, 5);
scene.add(camera);

//Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

//----RENDERING IMAGE--//
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // smooth shadows

//---ADDING LIGHT GLOBALLY--//
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
console.log("ambient light added", ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2); //stronger intensity
directionalLight.position.set(5, 10, 7.5); //above and in front of model
//adding shadows//
directionalLight.castShadow = true; // important!
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 1;
directionalLight.shadow.camera.far = 50;
//targetting chicken//
directionalLight.target.position.set(0, 0, 0); //pointing light directly at model center
scene.add(directionalLight);
scene.add(directionalLight.target);
console.log("Directional lights added", directionalLight);

//ADDING ORBITAL CONTROLS AND SUPPRESSING CODE BC GLB WAS MADE USING OLD EXTENSION//
// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

//Suppress Specular-Glossiness warning from non-PBR rendering
const oldWarn = console.warn;
console.warn = function (msg, ...args) {
  if (msg.includes("KHR_materials_pbrSpecularGlossiness")) return;
  oldWarn(msg, ...args);
};

//----NOW LOAD GLB FILE---//
// Load GLB file
const loader = new GLTFLoader();

//fixed root as default is /public
const url = "./models/Chicken.glb";

//adding mixer and clock here for Animation()
let mixer; // optional if using animations, calling mixer outside so animate can acess

//------LOAD MODEL-------//
loader.load(url, (gltf) => {
  const model = gltf.scene; //3D object
  console.log("GLB loaded successfully:", model);

  //adding chicken to scene
  scene.add(model);
  //checking to see if model is in position
  model.position.set(0, 0, 0);
  model.scale.set(1, 1, 1);
  console.log("model in position", model.position.set(0, 0, 0));

  //----TEXTURES ADDED MANUALLY----///
  const textureLoader = new THREE.TextureLoader();
  //color of chicken is included
  const diffuseMap = textureLoader.load("./models/gltf_embedded_0.png"); //diffuseMap is color base
  console.log(diffuseMap, "diffuseMap loaded");
  //roughness is to describe how smooth image is
  const roughnessMap = textureLoader.load("./models/gltf_embedded_2.png");
  //normal map
  const wingLightMap = textureLoader.load(
    "./models/gltf_embedded_3@channels=R.png"
  );

  model.traverse((child) => {
    if (child.isMesh) {
      // Always ensure the material is MeshStandardMaterial
      if (!(child.material instanceof THREE.MeshStandardMaterial)) {
        child.material = new THREE.MeshStandardMaterial();
      }

      // Add textures
      child.material.map = roughnessMap; // base color
      child.material.roughnessMap = roughnessMap; // roughness texture
      child.material.normalMap = wingLightMap; // normal map

      // Adjust parameters
      child.material.roughness = 1; // fallback numeric roughness
      child.material.normalScale = new THREE.Vector2(1, 1);

      // Shadows
      child.castShadow = true;
      child.receiveShadow = true;

      // Force material update
      child.material.needsUpdate = true;

      //checking to see if image is a UV mismatch
      console.log(child.material.map?.image);
      // Debugging
      console.log("Applied maps:", {
        map: child.material.map,
        roughnessMap: child.material.roughnessMap,
        normalMap: child.material.normalMap,
      });
    }
  });

  //----ADDING FLOOR TO SCENE---//
  const floorGeometry = new THREE.PlaneGeometry(20, 20);
  const floorMaterial = new THREE.MeshStandardMaterial({ color: "green" }); //like grass
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2; // horizontal
  floor.position.y = 0; // under the chicken
  floor.receiveShadow = true; // must receive shadows
  scene.add(floor);

  // restore console.warn
  console.warn = oldWarn;
  //--CENTERING MODEL--//
  // Center model at origin
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);

  //---SCALING MODEL---//
  const size = box.getSize(new THREE.Vector3()).length();
  const scaleFactor = 2 / size; // roughly 2 units tall
  model.scale.setScalar(scaleFactor);

  //---POSITIONING CAMERA AT MODEL--//
  camera.position.set(0, 1, 4); // closer to chicken
  camera.lookAt(model.position); // always look at model

  //--Animating the model--//
  if (gltf.animations && gltf.animations.length) {
    mixer = new THREE.AnimationMixer(model); //creating the mixer for model
    gltf.animations.forEach((clip) => {
      const action = mixer.clipAction(clip);
      action.play();
      action.loop = THREE.LoopRepeat;
    });
  }
});

//---ANIMATING GLB FILE---//
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  if (mixer) mixer.update(delta); // update animations each frame

  controls.update(); // update OrbitControls
  renderer.render(scene, camera);
}
animate();

// restore console.warn
console.warn = oldWarn;
