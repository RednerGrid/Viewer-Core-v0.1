import { renderToolbar } from "../ui/toolbar.js";
import {
  loadSequenceProgressive
} from "../core/assetManager.js";
import { showLoading, updateLoading, hideLoading } from "../ui/loading.js";

let viewerRef = null;
let canvas = null;
let context = null;

let images = [];
let frameCount = 0;

let animationId = null;

let currentIndex = 0;
let currentAngle = 0;

let isDragging = false;
let lastX = 0;

/*
  Скорость вращения теперь задаётся в градусах
  на один пиксель движения мыши.
*/
let degreesPerPixel = 0.4;

/*
  Угловая скорость инерции:
  градусов за кадр анимации.
*/
let rotationVelocity = 0;
let friction = 0.95;

export async function init({ project, scene, viewer, openScene }) {
  viewerRef = viewer;

  renderToolbar(scene.actions, openScene);
  const sequenceKey = scene.assets.sequence;

  const sequence = project.assetManifest?.sequences.find(
  item => item.key === sequenceKey
  );

  if (!sequence) {
    throw new Error(
    `Секвенция не найдена в manifest: ${sequenceKey}`
  );
  }

  frameCount = sequence.frameCount;
  currentIndex = 0;
  images = [];

  canvas = document.createElement("canvas");
  canvas.className = "object360-canvas";
  context = canvas.getContext("2d");

  viewer.appendChild(canvas);

  showLoading("Загрузка 360°");

const progressiveLoad = await loadSequenceProgressive({
  basePath: `${project.basePath}assets/${sequence.path}`,

  frameCount: sequence.frameCount,
  firstFrameNumber: sequence.firstFrameNumber ?? 1,

  filePrefix: sequence.filePrefix,
  fileExtension: sequence.fileExtension,
  padding: sequence.padding,

  startIndex: 0,
  concurrency: 6,

  onProgress: updateLoading
});

images = progressiveLoad.images;

canvas.width = progressiveLoad.firstImage.naturalWidth;
canvas.height = progressiveLoad.firstImage.naturalHeight;

currentAngle = 0;
currentIndex = 0;

render();
hideLoading();

addControls();
animate();

progressiveLoad.complete.then(({ failedFrames }) => {
  if (failedFrames.length > 0) {
    console.warn(
      "Не загружены кадры секвенции:",
      failedFrames
    );
  }
});
}

function setupCanvasSize() {
  const firstImage = images[0];

  canvas.width = firstImage.naturalWidth;
  canvas.height = firstImage.naturalHeight;
}

function findNearestLoadedFrame(targetIndex) {
  if (images[targetIndex]) {
    return targetIndex;
  }

  for (let offset = 1; offset < frameCount; offset++) {
    const forward =
      (targetIndex + offset) % frameCount;

    const backward =
      (targetIndex - offset + frameCount) % frameCount;

    if (images[forward]) {
      return forward;
    }

    if (images[backward]) {
      return backward;
    }
  }

  return null;
}

function render() {
  if (!context || !canvas || images.length === 0) {
    return;
  }

  const loadedIndex =
    findNearestLoadedFrame(currentIndex);

  if (loadedIndex === null) {
    return;
  }

  const image = images[loadedIndex];

  context.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  context.drawImage(
    image,
    0,
    0,
    canvas.width,
    canvas.height
  );
}

function normalizeIndex(index) {
  return ((index % frameCount) + frameCount) % frameCount;
}

function normalizeAngle(angle) {
  return ((angle % 360) + 360) % 360;
}

function angleToFrameIndex(angle) {
  const normalizedAngle = normalizeAngle(angle);

  return Math.round(
    (normalizedAngle / 360) * frameCount
  ) % frameCount;
}

function rotateByDegrees(deltaDegrees) {
  currentAngle = normalizeAngle(
    currentAngle + deltaDegrees
  );

  currentIndex = angleToFrameIndex(currentAngle);

  render();
}

function moveViewer(deltaX) {
  const deltaDegrees = deltaX * degreesPerPixel;

  rotateByDegrees(deltaDegrees);

  return deltaDegrees;
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
  rotationVelocity = 0;

  viewerRef.setPointerCapture(e.pointerId);
}

function onPointerMove(e) {
  e.preventDefault();

  if (!isDragging) return;

  const deltaX = e.clientX - lastX;
  const deltaDegrees = moveViewer(deltaX);

  rotationVelocity = deltaDegrees;
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

  if (
    !isDragging &&
    Math.abs(rotationVelocity) > 0.01
  ) {
    rotateByDegrees(rotationVelocity);
    rotationVelocity *= friction;
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
  currentAngle = 0;
  rotationVelocity = 0;
}