import * as THREE from 'three';
import { OrbitControls } from './vendor/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { DRACOLoader } from './vendor/loaders/DRACOLoader.js';
import { RoomEnvironment } from './vendor/environments/RoomEnvironment.js';
import { loadThreeStateDraft } from './three-state-draft.js?v=26';

const stage = document.querySelector('#viewer-stage');
const canvas = document.querySelector('#model-canvas');
const loading = document.querySelector('#loading-state');
const error = document.querySelector('#error-state');
const errorMessage = document.querySelector('#error-message');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const baseFov = 34;
const inspectLiving = document.body.dataset.asset === 'living';
const threeStateDraft = document.body.dataset.draftThreeState === 'true';
const assetId = inspectLiving ? 'living-illustrative-exterior' : 'source-skeleton-unsegmented';

const scene = new THREE.Scene();
scene.background = new THREE.Color('#202522');
scene.add(new THREE.HemisphereLight(0xe9e6dc, 0x363a35, 1.35));

const key = new THREE.DirectionalLight(0xfff3dd, 2.5);
key.position.set(-7, 9, 10);
scene.add(key);
const fill = new THREE.DirectionalLight(0xd4d8d4, 0.85);
fill.position.set(8, 3, -6);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xf0e4ca, 1.15);
rim.position.set(2, -8, 4);
scene.add(rim);

const camera = new THREE.PerspectiveCamera(baseFov, 1, 0.01, 1000);
let renderer = null;
let rendererError = null;
let environmentTarget = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.94;
  if (inspectLiving) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    environmentTarget = pmrem.fromScene(room, 0.04);
    scene.environment = environmentTarget.texture;
    scene.environmentIntensity = 0.65;
    room.dispose();
    pmrem.dispose();
    renderer.toneMappingExposure = 1.05;
  }
} catch (exception) {
  rendererError = exception;
  canvas.hidden = true;
  loading.hidden = true;
  error.hidden = false;
  errorMessage.textContent = 'WebGL is unavailable in this browser or device. Try a browser with hardware acceleration enabled.';
}

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = !reducedMotion;
controls.dampingFactor = 0.075;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.minPolarAngle = 0.03;
controls.maxPolarAngle = Math.PI - 0.03;
controls.zoomSpeed = 0.8;

let initialPosition = null;
let initialQuaternion = null;
let initialTarget = null;
let modelRadius = 1;
let dampingFrame = 0;
let modelBounds = null;
let boundsCorners = [];
let meshPoints = [];
let loadedMeshCount = 0;
let loadedTriangleCount = 0;
let suppressRender = false;

function render() {
  if (!renderer) return;
  if (typeof window.generaliaCompositeRender === 'function') window.generaliaCompositeRender();
  else renderer.render(scene, camera);
}

controls.addEventListener('change', () => { if (!suppressRender) render(); });
controls.addEventListener('end', () => {
  if (reducedMotion || dampingFrame) return;
  let remaining = 120;
  const settle = () => {
    const changed = controls.update();
    remaining -= 1;
    if (changed && remaining > 0) dampingFrame = requestAnimationFrame(settle);
    else dampingFrame = 0;
  };
  dampingFrame = requestAnimationFrame(settle);
});

function cornersOf(bounds) {
  const points = [];
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) points.push(new THREE.Vector3(x, y, z));
    }
  }
  return points;
}

function fitProjectionToBounds() {
  if (!meshPoints.length) return;
  camera.updateMatrixWorld(true);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const aspect = Math.max(camera.aspect, 0.1);
  const limit = 0.86;
  let requiredTangent = Math.tan(THREE.MathUtils.degToRad(baseFov) / 2);
  for (const point of meshPoints) {
    const relative = point.clone().sub(camera.position);
    const depth = relative.dot(forward);
    if (depth <= camera.near) continue;
    const horizontal = Math.abs(relative.dot(right)) / (depth * limit * aspect);
    const vertical = Math.abs(relative.dot(up)) / (depth * limit);
    requiredTangent = Math.max(requiredTangent, horizontal, vertical);
  }
  camera.fov = Math.min(110, THREE.MathUtils.radToDeg(2 * Math.atan(requiredTangent)));
  camera.updateProjectionMatrix();
}

function resize() {
  const width = Math.max(1, stage.clientWidth);
  const height = Math.max(1, stage.clientHeight);
  if (renderer) renderer.setSize(width, height, false);
  camera.aspect = width / height;
  fitProjectionToBounds();
  camera.updateProjectionMatrix();
  render();
}
new ResizeObserver(resize).observe(stage);

function frameModel(root) {
  root.updateMatrixWorld(true);
  modelBounds = new THREE.Box3().setFromObject(root);
  boundsCorners = cornersOf(modelBounds);
  const center = modelBounds.getCenter(new THREE.Vector3());
  const size = modelBounds.getSize(new THREE.Vector3());
  modelRadius = Math.max(modelBounds.getBoundingSphere(new THREE.Sphere()).radius, 0.1);
  const viewDirection = threeStateDraft ? new THREE.Vector3(-0.4,0.65,1.5).normalize() : new THREE.Vector3(inspectLiving ? -1.0 : 1.0, inspectLiving ? 0.55 : 0.28, 1.0).normalize();
  camera.position.copy(center).addScaledVector(viewDirection, 1);
  camera.lookAt(center);
  camera.updateMatrixWorld(true);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  const tanV = Math.tan(THREE.MathUtils.degToRad(baseFov) / 2);
  const tanH = tanV * Math.max(camera.aspect, 0.1);
  const margin = 1.17;
  let distance = 0;
  // Fit from occupied mesh vertices in camera space instead of a sphere around
  // the whole bounding box, preserving useful scale for this elongated mesh.
  meshPoints = [];
  root.traverse((node) => {
    if (!node.isMesh) return;
    const position = node.geometry?.getAttribute('position');
    if (!position) return;
    const vertex = new THREE.Vector3();
    for (let i = 0; i < position.count; i += 1) {
      vertex.fromBufferAttribute(position, i).applyMatrix4(node.matrixWorld);
      meshPoints.push(vertex.clone());
      const offset = vertex.clone().sub(center);
      const along = offset.dot(viewDirection);
      distance = Math.max(
        distance,
        along + Math.abs(offset.dot(right)) * margin / tanH,
        along + Math.abs(offset.dot(up)) * margin / tanV,
      );
    }
  });
  distance = Math.max(distance, modelRadius * 0.35);
  const direction = viewDirection;
  controls.target.copy(center);
  camera.position.copy(center).addScaledVector(direction, distance);
  camera.near = Math.max(modelRadius / 1000, 0.005);
  camera.far = Math.max(distance + modelRadius * 12, 80);
  camera.fov = baseFov;
  camera.updateProjectionMatrix();
  controls.minDistance = modelRadius * 0.28;
  controls.maxDistance = modelRadius * 7;
  controls.update();
  initialPosition = camera.position.clone();
  initialQuaternion = camera.quaternion.clone();
  initialTarget = center.clone();
  fitProjectionToBounds();
  stage.dataset.modelWidth = size.x.toFixed(4);
  stage.dataset.modelHeight = size.y.toFixed(4);
  stage.dataset.modelDepth = size.z.toFixed(4);
  const diagnostic = window.generaliaInspection;
  if (diagnostic) diagnostic.status = 'loaded';
  render();
}

function frustumExtrema() {
  if (!boundsCorners.length) return null;
  camera.updateMatrixWorld(true);
  const extremaFor = (points) => {
    const range = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
    for (const point of points) {
      const p = point.clone().project(camera);
      range.minX = Math.min(range.minX, p.x); range.maxX = Math.max(range.maxX, p.x);
      range.minY = Math.min(range.minY, p.y); range.maxY = Math.max(range.maxY, p.y);
      range.minZ = Math.min(range.minZ, p.z); range.maxZ = Math.max(range.maxZ, p.z);
    }
    return range;
  };
  const meshVertices = extremaFor(meshPoints);
  const boxCorners = extremaFor(boundsCorners);
  meshVertices.fullyInView = meshVertices.minX >= -1 && meshVertices.maxX <= 1 && meshVertices.minY >= -1 && meshVertices.maxY <= 1 && meshVertices.minZ >= -1 && meshVertices.maxZ <= 1;
  meshVertices.withSafetyMargin = meshVertices.minX >= -0.9 && meshVertices.maxX <= 0.9 && meshVertices.minY >= -0.9 && meshVertices.maxY <= 0.9;
  return { ...meshVertices, boxCorners };
}

window.generaliaInspection = {
  status: rendererError ? 'webgl-unavailable' : 'loading',
  getSnapshot() {
    return {
      status: this.status,
      loadedAssetId: this.status === 'loaded' ? assetId : null,
      camera: {
        position: camera.position.toArray(),
        quaternion: camera.quaternion.toArray(),
        target: controls.target.toArray(),
        fov: camera.fov,
        aspect: camera.aspect,
      },
      meshCount: loadedMeshCount,
      triangles: loadedTriangleCount,
      rendererInfo: renderer ? {
        render: { ...renderer.info.render },
        memory: { ...renderer.info.memory },
        programs: renderer.info.programs?.length ?? null,
      } : null,
      projectedBounds: frustumExtrema(),
    };
  },
};

if(new URLSearchParams(location.search).get('reviewColors')==='1'||new URLSearchParams(location.search).get('poseReview')==='1') {
  window.generaliaColorCamera={
    setPose(position,target=[0,0,0]) {
      camera.position.fromArray(position);controls.target.fromArray(target);
      camera.lookAt(controls.target);camera.updateMatrixWorld(true);controls.update();render();
    }
  };
}

function showError(message) {
  loading.hidden = true;
  errorMessage.textContent = message;
  error.hidden = false;
  window.generaliaInspection.status = rendererError ? 'webgl-unavailable' : 'load-error';
}

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('./vendor/draco/');
const assetLoader = new GLTFLoader();
assetLoader.setDRACOLoader(dracoLoader);
if (!rendererError && threeStateDraft) loadThreeStateDraft({scene,camera,loader:assetLoader,renderer,frameModel,resize,render,loading,onError:showError,onStats:(meshes,triangles)=>{loadedMeshCount=meshes;loadedTriangleCount=triangles;}});
else if (!rendererError) assetLoader.load(
  inspectLiving ? './assets/living.glb' : './assets/skeleton.glb',
  (gltf) => {
    const root = gltf.scene;
    const ivory = new THREE.MeshStandardMaterial({ color: 0xc8bea5, roughness: 0.88, metalness: 0.0 });
    root.traverse((node) => {
      if (!node.isMesh) return;
      if (!inspectLiving) node.material = ivory;
      else {
        const sourceMaterial = node.material;
        if (sourceMaterial.name === 'Generalia | compact coat and foot skin') {
          node.material = sourceMaterial.clone();
          node.material.normalScale.set(0.15, 0.15);
          node.material.specularIntensity = 0.15;
          node.material.sheen = 0.2;
        } else if (sourceMaterial.name === 'Generalia | compact guard hairs') {
          node.material = sourceMaterial.clone();
          node.material.roughness = 0.9;
          node.material.specularIntensity = 0.08;
          node.material.anisotropy = 0.15;
        }
      }
      node.castShadow = false;
      node.receiveShadow = false;
      loadedMeshCount += 1;
      const geometry = node.geometry;
      loadedTriangleCount += geometry.index ? geometry.index.count / 3 : geometry.getAttribute('position').count / 3;
    });
    scene.add(root);
    loading.hidden = true;
    resize();
    frameModel(root);
  },
  undefined,
  () => showError('Could not load the local model. Check that the prototype files stay together.'),
);

document.querySelector('#reset-camera').addEventListener('click', () => {
  if (!initialPosition || !initialTarget) return;
  if (dampingFrame) cancelAnimationFrame(dampingFrame);
  dampingFrame = 0;
  const wasDamping = controls.enableDamping;
  // Drain OrbitControls' hidden spherical and pan residuals before restoring
  // the saved pose, then sync controls with damping temporarily disabled.
  suppressRender = true;
  controls.enableDamping = true;
  for (let i = 0; i < 160; i += 1) controls.update();
  controls.enableDamping = false;
  camera.position.copy(initialPosition);
  controls.target.copy(initialTarget);
  controls.update();
  controls.enableDamping = wasDamping;
  suppressRender = false;
  camera.position.copy(initialPosition);
  camera.quaternion.copy(initialQuaternion);
  controls.target.copy(initialTarget);
  camera.updateMatrixWorld(true);
  fitProjectionToBounds();
  render();
});

document.querySelector('#fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await stage.requestFullscreen();
  } catch {
    // Fullscreen is optional and can be unavailable in embedded contexts.
  }
});

document.addEventListener('fullscreenchange', resize);
window.addEventListener('beforeunload', () => {
  if (dampingFrame) cancelAnimationFrame(dampingFrame);
  controls.dispose();
  dracoLoader.dispose();
  environmentTarget?.dispose();
  if (renderer) renderer.dispose();
});
