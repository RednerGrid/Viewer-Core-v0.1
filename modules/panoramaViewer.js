import { renderToolbar } from "../ui/toolbar.js";

let viewerRef = null;
let renderer = null;
let scene3d = null;
let camera = null;
let animationId = null;

let lon = 0;
let lat = 0;
let targetFov = 50;

let isDown = false;
let startX = 0;
let startY = 0;

const activePointers = new Map();
let startPinchDistance = 0;
let startPinchFov = 50;

export async function init({ project, scene, viewer, openScene }) {
  viewerRef = viewer;

  renderToolbar(scene.actions, openScene);

  scene3d = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    1,
    2000
  );

  targetFov = 50;

  renderer = new THREE.WebGLRenderer({
    antialias: true
  });

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  viewer.appendChild(renderer.domElement);

  const geometry = new THREE.SphereGeometry(500, 128, 64);
  geometry.scale(-1, 1, 1);

  const texturePath = `${project.basePath}${scene.assets.image}`;

  const texture = new THREE.TextureLoader().load(texturePath);

  const material = new THREE.MeshBasicMaterial({
    map: texture
  });

  const sphere = new THREE.Mesh(geometry, material);
  scene3d.add(sphere);

  addControls(viewer);

  animate();
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

  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon);

  camera.lookAt(
    500 * Math.sin(phi) * Math.cos(theta),
    500 * Math.cos(phi),
    500 * Math.sin(phi) * Math.sin(theta)
  );

  camera.fov += (targetFov - camera.fov) * 0.12;
  camera.updateProjectionMatrix();

  renderer.render(scene3d, camera);
}

export function resize() {
  if (!renderer || !camera) return;

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

export function update() {}

export function destroy() {
  removeControls();

  if (animationId) {
    cancelAnimationFrame(animationId);
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
  animationId = null;
  activePointers.clear();
}