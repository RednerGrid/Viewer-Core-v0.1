import { playTransition } from "../services/transitionService.js";
import { renderToolbar } from "../ui/toolbar.js";
import {
  renderHotspots,
  updatePanoramaHotspots,
  clearHotspots,
  selectPanoramaHotspot,
  hideHotspots,
  showHotspots
} from "../ui/hotspots.js";
import {
  registerViewerApi,
  clearViewerApi
} from "../core/viewerApi.js";



let viewerRef = null;
let renderer = null;
let scene3d = null;
let camera = null;
let animationId = null;
let editorRef = null;
let sphere = null;
let material = null;
let textureLoader = null;

let lon = 0;
let lat = 0;
let targetFov = 50;

let isDown = false;
let startX = 0;
let startY = 0;

const activePointers = new Map();
const hotspotRaycaster = new THREE.Raycaster();
const hotspotPointer = new THREE.Vector2();

let startPinchDistance = 0;
let startPinchFov = 50;

export async function init({ project, scene, viewer, openScene, editor }) {
  viewerRef = viewer;
  editorRef = editor;

  renderToolbar(scene.actions, openScene);

  editorRef?.initDeveloperTools({
    project,

    onSceneChange: editableScene => {
      renderHotspots(
        editableScene.hotspots ?? [],
        openScene,
        editorRef?.selectHotspot ?? null,
        getHotspotPositionFromPointer,
        editorRef?.saveHotspotPosition ?? null
      );
    },

    setView,
    highlightHotspot: selectPanoramaHotspot    
  });

  // Каждый раз сбрасываем состояние управления
  isDown = false;
  startX = 0;
  startY = 0;
  activePointers.clear();

  // Загружаем стартовый ракурс текущей сцены
  lon = Number(scene.view?.yaw ?? 0);
  lat = Number(scene.view?.pitch ?? 0);
  targetFov = Number(scene.view?.fov ?? 50);

  scene3d = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    targetFov,
    window.innerWidth / window.innerHeight,
    1,
    2000
  );

  camera.fov = targetFov;
  camera.updateProjectionMatrix();

  renderer = new THREE.WebGLRenderer({
    antialias: true
  });

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  viewer.appendChild(renderer.domElement);

  const geometry = new THREE.SphereGeometry(500, 128, 64);
  geometry.scale(-1, 1, 1);

  const texturePath = `${project.basePath}${scene.assets.image}`;

  textureLoader = new THREE.TextureLoader();

  const texture = textureLoader.load(texturePath);

  material = new THREE.MeshBasicMaterial({
    map: texture
  });

  sphere = new THREE.Mesh(geometry, material);
  scene3d.add(sphere);

  renderHotspots(
    scene.hotspots,
    openScene,
    editorRef?.selectHotspot ?? null,
    getHotspotPositionFromPointer,
    editorRef?.saveHotspotPosition ?? null
  );

  addControls(viewer);
  animate();

  registerViewerApi({
    setPanoramaTexture,
    loadScene,
    hideHotspots,
    showHotspots
  });
}

function addControls(viewer) {
  viewer.style.touchAction = "none";
  viewer.style.userSelect = "none";

  viewer.addEventListener("pointerdown", onPointerDown);
  viewer.addEventListener("pointermove", onPointerMove);
  viewer.addEventListener("pointerup", onPointerEnd);
  viewer.addEventListener("pointercancel", onPointerEnd);
  window.addEventListener("wheel", onWheel, { passive: false });
}

function removeControls() {
  if (!viewerRef) return;

  viewerRef.removeEventListener("pointerdown", onPointerDown);
  viewerRef.removeEventListener("pointermove", onPointerMove);
  viewerRef.removeEventListener("pointerup", onPointerEnd);
  viewerRef.removeEventListener("pointercancel", onPointerEnd);
  window.removeEventListener("wheel", onWheel);
}

function onPointerDown(e) {
  e.preventDefault();

  activePointers.set(e.pointerId, {
    x: e.clientX,
    y: e.clientY
  });

  viewerRef.setPointerCapture(e.pointerId);

  if (activePointers.size === 1) {
    isDown = true;
    startX = e.clientX;
    startY = e.clientY;
  }

  if (activePointers.size === 2) {
    const points = [...activePointers.values()];
    startPinchDistance = getDistance(points[0], points[1]);
    startPinchFov = targetFov;
    isDown = false;
  }
}

function onPointerMove(e) {
  e.preventDefault();

  if (!activePointers.has(e.pointerId)) return;

  activePointers.set(e.pointerId, {
    x: e.clientX,
    y: e.clientY
  });

  if (activePointers.size === 2) {
    const points = [...activePointers.values()];
    const currentDistance = getDistance(points[0], points[1]);
    const zoomFactor = startPinchDistance / currentDistance;

    targetFov = startPinchFov * zoomFactor;
    targetFov = Math.max(35, Math.min(60, targetFov));
    return;
  }

  if (!isDown) return;

  const dx = e.clientX - startX;
  const dy = e.clientY - startY;

  lon -= dx * 0.18;
  lat += dy * 0.18;

  startX = e.clientX;
  startY = e.clientY;
}

function onPointerEnd(e) {
  activePointers.delete(e.pointerId);
  isDown = false;

  if (viewerRef && viewerRef.hasPointerCapture(e.pointerId)) {
    viewerRef.releasePointerCapture(e.pointerId);
  }
}

function onWheel(e) {
  e.preventDefault();

  targetFov += e.deltaY * 0.03;
  targetFov = Math.max(35, Math.min(60, targetFov));
}

function getDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;

  return Math.sqrt(dx * dx + dy * dy);
}

function animate() {
  animationId = requestAnimationFrame(animate);

  lat = Math.max(-45, Math.min(45, lat));
  editorRef?.updateDeveloperView({
  yaw: lon,
  pitch: lat,
  fov: camera.fov
});

  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon);

  camera.lookAt(
    500 * Math.sin(phi) * Math.cos(theta),
    500 * Math.cos(phi),
    500 * Math.sin(phi) * Math.sin(theta)
  );

  camera.fov += (targetFov - camera.fov) * 0.12;
  camera.updateProjectionMatrix();

  window.currentView = {
  yaw: Number(lon.toFixed(1)),
  pitch: Number(lat.toFixed(1))
}; // временная для координат
  
  renderer.render(scene3d, camera);
  updatePanoramaHotspots(camera, renderer);
}

export function setPanoramaTexture(texture) {
  if (!material) return;

  material.map = texture;
  material.needsUpdate = true;
}

export function resize() {
  if (!renderer || !camera) return;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

async function loadScene(
  project,
  scene,
  openScene,
  { preserveView = false } = {}
) {
  const texturePath =
    `${project.basePath}${scene.assets.image}`;

  const texture = await textureLoader.loadAsync(texturePath);

  console.log("До замены:", {
  yaw: lon,
  pitch: lat
  });
  
  setPanoramaTexture(texture);

  console.log("После замены:", {
  yaw: lon,
  pitch: lat
  });

  if (!preserveView) {
    setView(scene.view);
  }

  renderToolbar(scene.actions, openScene);

  renderHotspots(
    scene.hotspots ?? [],
    openScene,
    editorRef?.selectHotspot ?? null,
    getHotspotPositionFromPointer,
    editorRef?.saveHotspotPosition ?? null
  );
}

export function update() {}

export function destroy() {
  editorRef?.destroyDeveloperTools();
  clearHotspots();
  removeControls();

  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  if (material?.map) {
    material.map.dispose();
  }

  if (material) {
    material.dispose();
  }

  if (sphere?.geometry) {
    sphere.geometry.dispose();
  }
  
  if (renderer) {
    renderer.dispose();
  }

  if (viewerRef) {
    viewerRef.innerHTML = "";
  }

  viewerRef = null;
  renderer = null;
  scene3d = null;
  camera = null;
  sphere = null;
  material = null;
  textureLoader = null;
  animationId = null;
  editorRef = null;
  activePointers.clear();
  clearViewerApi();

}

function setView({
  yaw,
  pitch,
  fov
}) {
  lon = Number(yaw);
  lat = Number(pitch);

  if (fov !== undefined) {
    targetFov = Number(fov);
  }
}

function getHotspotPositionFromPointer({ clientX, clientY }) {
  if (!renderer || !camera) return null;

  const rect = renderer.domElement.getBoundingClientRect();

  hotspotPointer.x =
    ((clientX - rect.left) / rect.width) * 2 - 1;

  hotspotPointer.y =
    -((clientY - rect.top) / rect.height) * 2 + 1;

  hotspotRaycaster.setFromCamera(hotspotPointer, camera);

  const direction =
    hotspotRaycaster.ray.direction.clone().normalize();

  const yaw = THREE.MathUtils.radToDeg(
    Math.atan2(direction.z, direction.x)
  );

  const pitch = THREE.MathUtils.radToDeg(
    Math.asin(
      THREE.MathUtils.clamp(direction.y, -1, 1)
    )
  );

  return {
    yaw,
    pitch
  };
}

export function replaceTexture(path) {

}
