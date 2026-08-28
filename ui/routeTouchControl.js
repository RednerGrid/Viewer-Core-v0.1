let rootEl = null;
let baseEl = null;
let knobEl = null;

let pointerId = null;
let startY = 0;

let moveCallback = null;
let stopCallback = null;

const DEAD_ZONE = 10;
const MAX_DRAG = 70;

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
  if (pointerId !== null) return;

  pointerId = event.pointerId;
  startY = event.clientY;

  baseEl.setPointerCapture(pointerId);

  baseEl.addEventListener("pointermove", onPointerMove);
  baseEl.addEventListener("pointerup", onPointerUp);
  baseEl.addEventListener("pointercancel", onPointerUp);

  knobEl.classList.add("is-active");

  event.preventDefault();
}

function onPointerMove(event) {
  if (event.pointerId !== pointerId) return;

  const deltaY = clamp(
    event.clientY - startY,
    -MAX_DRAG,
    MAX_DRAG
  );

  updateVisual(deltaY);

  const distance = Math.abs(deltaY);

  if (distance <= DEAD_ZONE) {
    moveCallback?.(null, 0);
    return;
  }

  const speed = clamp(
    (distance - DEAD_ZONE) /
    (MAX_DRAG - DEAD_ZONE),
    0,
    1
  );

  moveCallback?.(
    deltaY < 0 ? "forward" : "reverse",
    speed
  );
}

function onPointerUp(event) {
  if (event.pointerId !== pointerId) return;

  baseEl.releasePointerCapture?.(pointerId);

  baseEl.removeEventListener("pointermove", onPointerMove);
  baseEl.removeEventListener("pointerup", onPointerUp);
  baseEl.removeEventListener("pointercancel", onPointerUp);

  pointerId = null;

  knobEl?.classList.remove("is-active");

  resetVisual();
  stopCallback?.();
}

function updateVisual(deltaY) {
  if (!knobEl) return;

  const amount = Math.abs(deltaY) / MAX_DRAG;

  /*
    Центр двигается вслед за пальцем.
    Одновременно круг вытягивается
    в направлении движения.
  */
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