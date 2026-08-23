import { renderToolbar } from "../ui/toolbar.js";

let viewerRef = null;
let imageEl = null;
let projectRef = null;
let sceneRef = null;
let animationId = null;

let currentVertical = 0;
let currentHorizontal = 0;

let velocityVertical = 0;
let velocityHorizontal = 0;

let renderedVertical = null;
let renderedHorizontal = null;

let lastPointerMoveTime = 0;

const frameCache = new Map();

const POINTER_IMPULSE = 0.06;
const POINTER_IDLE_DELAY = 120;
const VELOCITY_DAMPING = 0.83;
const RETURN_SPRING = 0.05;
const BOUNDARY_SLOWDOWN_ZONE = 6;
const BOUNDARY_MIN_SPEED = 0.1;

export async function init({
  project,
  scene,
  viewer,
  openScene
}) {
  viewerRef = viewer;
  projectRef = project;
  sceneRef = scene;

  currentVertical = 0;
  currentHorizontal = 0;

  velocityVertical = 0;
  velocityHorizontal = 0;

  renderedVertical = null;
  renderedHorizontal = null;

  lastPointerMoveTime = performance.now();

  renderToolbar(scene.actions ?? [], openScene);

  imageEl = document.createElement("img");
  imageEl.className = "overview-parallax";
  imageEl.alt = scene.title ?? "Overview";
  imageEl.draggable = false;

  viewer.appendChild(imageEl);

  renderFrame(0, 0);
  preloadFrames();

  viewer.addEventListener("pointermove", onPointerMove);
  viewer.addEventListener("pointerleave", onPointerLeave);

  animate();
}

function onPointerMove(event) {
  velocityHorizontal +=
    event.movementX * POINTER_IMPULSE;

  velocityVertical -=
    event.movementY * POINTER_IMPULSE;

  lastPointerMoveTime = performance.now();
}

function onPointerLeave() {
  lastPointerMoveTime = 0;
}

function animate(time = performance.now()) {
  animationId = requestAnimationFrame(animate);

  const pointerStopped =
    time - lastPointerMoveTime > POINTER_IDLE_DELAY;

  if (pointerStopped) {
    velocityHorizontal +=
      -currentHorizontal * RETURN_SPRING;

    velocityVertical +=
      -currentVertical * RETURN_SPRING;
  }

  velocityHorizontal *= VELOCITY_DAMPING;
  velocityVertical *= VELOCITY_DAMPING;

  const {
    verticalRange,
    horizontalRange
  } = getGridConfig();

  const horizontalDistanceToBoundary =
    horizontalRange - Math.abs(currentHorizontal);

  const verticalDistanceToBoundary =
    verticalRange - Math.abs(currentVertical);

  const horizontalSlowdown = Math.max(
    BOUNDARY_MIN_SPEED,
    Math.min(
      1,
      horizontalDistanceToBoundary / BOUNDARY_SLOWDOWN_ZONE
    )
  );

  const verticalSlowdown = Math.max(
    BOUNDARY_MIN_SPEED,
    Math.min(
      1,
      verticalDistanceToBoundary / BOUNDARY_SLOWDOWN_ZONE
    )
  );

  currentHorizontal +=
    velocityHorizontal * horizontalSlowdown;

  currentVertical +=
    velocityVertical * verticalSlowdown;



/*   const {
    verticalRange,
    horizontalRange
  } = getGridConfig();

  const maxRadius = Math.min(
    verticalRange,
    horizontalRange
  );

  const constrainedPosition = clampToCircle(
    currentHorizontal,
    currentVertical,
    maxRadius
  );

  const reachedBoundary =
    constrainedPosition.horizontal !== currentHorizontal ||
    constrainedPosition.vertical !== currentVertical;

  currentHorizontal =
    constrainedPosition.horizontal;

  currentVertical =
    constrainedPosition.vertical;

  if (reachedBoundary) {
    velocityHorizontal *= 0.25;
    velocityVertical *= 0.25;
  } */



  const previousHorizontal = currentHorizontal;
  const previousVertical = currentVertical;

  currentHorizontal = Math.max(
    -horizontalRange,
    Math.min(horizontalRange, currentHorizontal)
  );

  currentVertical = Math.max(
    -verticalRange,
    Math.min(verticalRange, currentVertical)
  );

  const reachedHorizontalBoundary =
    currentHorizontal !== previousHorizontal;

  const reachedVerticalBoundary =
    currentVertical !== previousVertical;

  if (reachedHorizontalBoundary) {
    velocityHorizontal *= 0.25;
  }

  if (reachedVerticalBoundary) {
    velocityVertical *= 0.25;
  }

  if (
    pointerStopped &&
    Math.abs(currentHorizontal) < 0.01 &&
    Math.abs(currentVertical) < 0.01 &&
    Math.abs(velocityHorizontal) < 0.01 &&
    Math.abs(velocityVertical) < 0.01
  ) {
    currentHorizontal = 0;
    currentVertical = 0;
    velocityHorizontal = 0;
    velocityVertical = 0;
  }

  const verticalFrame =
    Math.round(currentVertical);

  const horizontalFrame =
    Math.round(currentHorizontal);

  if (
    verticalFrame === renderedVertical &&
    horizontalFrame === renderedHorizontal
  ) {
    return;
  }

  renderFrame(verticalFrame, horizontalFrame);
}

function renderFrame(vertical, horizontal) {
  if (!imageEl || !projectRef || !sceneRef) return;

  const path = getFramePath(vertical, horizontal);
  const cachedImage = frameCache.get(path);

  imageEl.src = cachedImage?.src ?? path;

  renderedVertical = vertical;
  renderedHorizontal = horizontal;
}

function preloadFrames() {
  if (!projectRef || !sceneRef) return;

  const {
    verticalRange,
    horizontalRange
  } = getGridConfig();

  for (
    let vertical = -verticalRange;
    vertical <= verticalRange;
    vertical++
  ) {
    for (
      let horizontal = -horizontalRange;
      horizontal <= horizontalRange;
      horizontal++
    ) {
      const path = getFramePath(vertical, horizontal);

      if (frameCache.has(path)) {
        continue;
      }

      const image = new Image();

      image.onload = () => {
        frameCache.set(path, image);
      };

      image.onerror = () => {
        console.warn(
          `Не удалось загрузить кадр Overview: ${path}`
        );
      };

      image.src = path;
    }
  }
}

function getFramePath(vertical, horizontal) {
  const assets = sceneRef.assets;

  const verticalFolder =
    getVerticalFolder(vertical);

  const {
    centerColumn
  } = getGridConfig();

  const frameIndex =
    horizontal + centerColumn;

  const frameNumber =
    String(frameIndex).padStart(4, "0");

  return (
    `${projectRef.basePath}` +
    `${assets.path}` +
    `${verticalFolder}/` +
    `${assets.framePrefix}${frameNumber}.` +
    `${assets.extension}`
  );
}

function getVerticalFolder(offset) {
  if (offset === 0) {
    return "v_000";
  }

  const direction = offset > 0 ? "p" : "m";
  const number = String(Math.abs(offset)).padStart(2, "0");

  return `v_${direction}${number}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function resize() {}

export function update() {}

export function destroy() {
  if (viewerRef) {
    viewerRef.removeEventListener(
      "pointermove",
      onPointerMove
    );

    viewerRef.removeEventListener(
      "pointerleave",
      onPointerLeave
    );
  }

  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  if (imageEl) {
    imageEl.remove();
  }

  viewerRef = null;
  imageEl = null;
  projectRef = null;
  sceneRef = null;
  animationId = null;

  velocityVertical = 0;
  velocityHorizontal = 0;

  currentVertical = 0;
  currentHorizontal = 0;

  renderedVertical = null;
  renderedHorizontal = null;
}

function clampToCircle(horizontal, vertical, radius) {//круговой срез
  const distance = Math.hypot(horizontal, vertical);

  if (distance <= radius) {
    return {
      horizontal,
      vertical
    };
  }

  const scale = radius / distance;

  return {
    horizontal: horizontal * scale,
    vertical: vertical * scale
  };
}

function getGridConfig() {
  const rows = Number(sceneRef?.assets.rows) || 13;
  const columns = Number(sceneRef?.assets.columns) || 13;

  if (rows % 2 === 0 || columns % 2 === 0) {
    console.warn(
      "Overview Parallax: rows и columns должны быть нечётными."
    );
  }

  return {
    rows,
    columns,
    verticalRange: Math.floor(rows / 2),
    horizontalRange: Math.floor(columns / 2),
    centerRow: Math.floor(rows / 2),
    centerColumn: Math.floor(columns / 2)
  };
}