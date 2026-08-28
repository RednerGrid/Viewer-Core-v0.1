let rootEl = null;
let baseEl = null;
let knobEl = null;

let pointerId = null;
let startY = 0;

let moveCallback = null;
let stopCallback = null;

const DEAD_ZONE = 10;

function getMaxDrag() {
  const isTouch = matchMedia("(pointer: coarse)").matches;
  const isPortrait = matchMedia("(orientation: portrait)").matches;

  if (isTouch && isPortrait) return 300;
  if (isTouch) return 120;

  return 70;
}

export function showRouteTouchControl({
  onMove,
  onStop
} = {}) {
  hideRouteTouchControl();

  moveCallback = onMove ?? null;
  stopCallback = onStop ?? null;

  rootEl = document.createElement("div");
  rootEl.className = "route-touch-control";

  baseEl = document.createElement("div");
  baseEl.className = "route-touch-control__base";

  knobEl = document.createElement("div");
  knobEl.className = "route-touch-control__knob";

  baseEl.appendChild(knobEl);
  rootEl.appendChild(baseEl);

  document.body.appendChild(rootEl);

  baseEl.addEventListener("pointerdown", onPointerDown);
}

export function hideRouteTouchControl() {
  if (baseEl) {
    baseEl.removeEventListener("pointerdown", onPointerDown);
    baseEl.removeEventListener("pointermove", onPointerMove);
    baseEl.removeEventListener("pointerup", onPointerUp);
    baseEl.removeEventListener("pointercancel", onPointerUp);
  }

  rootEl?.remove();

  rootEl = null;
  baseEl = null;
  knobEl = null;

  pointerId = null;
  moveCallback = null;
  stopCallback = null;
}

function onPointerDown(event) {
  event.stopPropagation();
  event.preventDefault();

  if (pointerId !== null) return;

  pointerId = event.pointerId;
  startY = event.clientY;

  baseEl.setPointerCapture(pointerId);

  baseEl.addEventListener("pointermove", onPointerMove);
  baseEl.addEventListener("pointerup", onPointerUp);
  baseEl.addEventListener("pointercancel", onPointerUp);

  knobEl.classList.add("is-active");
}

function onPointerMove(event) {
  event.stopPropagation();

  if (pointerId === null) return;
  if (event.pointerId !== pointerId) return;

  const maxDrag = getMaxDrag();

  const deltaY = clamp(
    event.clientY - startY,
    -maxDrag,
    maxDrag
  );

  updateVisual(deltaY);

  const distance = Math.abs(deltaY);

  if (distance <= DEAD_ZONE) {
    moveCallback?.(null, 0);
    return;
  }

  const speed = clamp(
    (distance - DEAD_ZONE) / (maxDrag - DEAD_ZONE),
    0,
    1
  );

  moveCallback?.(
    deltaY < 0 ? "forward" : "reverse",
    speed
  );
}

function onPointerUp(event) {
  event.stopPropagation();

  if (event.pointerId !== pointerId) return;

  baseEl.releasePointerCapture?.(pointerId);

  baseEl.removeEventListener("pointermove", onPointerMove);
  baseEl.removeEventListener("pointerup", onPointerUp);
  baseEl.removeEventListener("pointercancel", onPointerUp);

  pointerId = null;

  knobEl.classList.remove("is-active");

  resetVisual();
  stopCallback?.();
}

function updateVisual(deltaY) {
  if (!knobEl) return;

  const maxDrag = getMaxDrag();
  const amount = Math.abs(deltaY) / maxDrag;

  const scaleY = 1 + amount * 0.45;
  const scaleX = 1 - amount * 0.12;

  knobEl.style.transform =
    `translateY(${deltaY}px) scale(${scaleX}, ${scaleY})`;
}

function resetVisual() {
  if (!knobEl) return;

  knobEl.style.transform =
    "translateY(0) scale(1)";
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}