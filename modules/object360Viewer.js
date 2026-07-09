import { renderToolbar } from "../ui/toolbar.js";
import { loadFrames } from "../core/assetManager.js";
import { showLoading, updateLoading, hideLoading } from "../ui/loading.js";

let viewerRef = null;
let canvas = null;
let context = null;

let images = [];
let currentIndex = 0;
let frameCount = 0;

let isDragging = false;
let lastX = 0;
let velocity = 0;
let animationId = null;

let sensitivity = 8;
let friction = 0.94;

export async function init({ project, scene, viewer, openScene }) {
  viewerRef = viewer;

  renderToolbar(scene.actions, openScene);

  frameCount = scene.assets.frameCount;
  currentIndex = 0;
  images = [];

  canvas = document.createElement("canvas");
  canvas.className = "object360-canvas";
  context = canvas.getContext("2d");

  viewer.appendChild(canvas);

  showLoading("Загрузка 360°");

  images = await loadFrames({
    basePath: `${project.basePath}${scene.assets.framesPath}`,
    frameCount: scene.assets.frameCount,
    filePrefix: scene.assets.filePrefix,
    fileExtension: scene.assets.fileExtension,
    padding: scene.assets.padding,
    onProgress: updateLoading
  });

  hideLoading();

  setupCanvasSize();
  render();

  addControls();
  animate();
}

function setupCanvasSize() {
  const firstImage = images[0];

  canvas.width = firstImage.naturalWidth;
  canvas.height = firstImage.naturalHeight;
}

function render() {
  const img = images[currentIndex];

  if (!img) return;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(img, 0, 0, canvas.width, canvas.height);
}

function normalizeIndex(index) {
  return ((index % frameCount) + frameCount) % frameCount;
}

function moveViewer(deltaX) {
  const frameDelta = Math.round(deltaX / sensitivity);

  if (frameDelta !== 0) {
    currentIndex = normalizeIndex(currentIndex + frameDelta);
    render();
  }
}

function addControls() {
  viewerRef.style.touchAction = "none";
  viewerRef.style.userSelect = "none";

  viewerRef.addEventListener("pointerdown", onPointerDown);
  viewerRef.addEventListener("pointermove", onPointerMove);
  viewerRef.addEventListener("pointerup", onPointerEnd);
  viewerRef.addEventListener("pointercancel", onPointerEnd);
}

function removeControls() {
  if (!viewerRef) return;

  viewerRef.removeEventListener("pointerdown", onPointerDown);
  viewerRef.removeEventListener("pointermove", onPointerMove);
  viewerRef.removeEventListener("pointerup", onPointerEnd);
  viewerRef.removeEventListener("pointercancel", onPointerEnd);
}

function onPointerDown(e) {
  e.preventDefault();

  isDragging = true;
  lastX = e.clientX;
  velocity = 0;

  viewerRef.setPointerCapture(e.pointerId);
}

function onPointerMove(e) {
  e.preventDefault();

  if (!isDragging) return;

  const deltaX = e.clientX - lastX;

  moveViewer(deltaX);

  velocity = deltaX;
  lastX = e.clientX;
}

function onPointerEnd(e) {
  isDragging = false;

  if (viewerRef && viewerRef.hasPointerCapture(e.pointerId)) {
    viewerRef.releasePointerCapture(e.pointerId);
  }
}

function animate() {
  animationId = requestAnimationFrame(animate);

  if (!isDragging && Math.abs(velocity) > 0.1) {
    moveViewer(velocity);
    velocity *= friction;
  }
}

export function resize() {}

export function update() {}

export function destroy() {
  removeControls();

  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  if (viewerRef) {
    viewerRef.innerHTML = "";
  }

  viewerRef = null;
  canvas = null;
  context = null;
  images = [];
  currentIndex = 0;
  frameCount = 0;
  isDragging = false;
  velocity = 0;
}