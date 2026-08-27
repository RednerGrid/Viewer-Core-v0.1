let gateEl = null;
let activateCallback = null;


export function initRouteGate(
  viewer,
  {
    onActivate
  } = {}
) {
  destroyRouteGate();

  activateCallback =
    onActivate ?? null;

  gateEl =
    document.createElement("div");

  gateEl.className =
    "route-gate";

  gateEl.style.position =
    "absolute";

  gateEl.style.left = "50%";
  gateEl.style.top = "50%";

  gateEl.style.width = "80px";
  gateEl.style.height = "55vh";
  gateEl.style.maxHeight = "420px";

  gateEl.style.transform =
    "translate(-50%, -50%)";

  gateEl.style.border =
    "1px solid rgba(255,255,255,0.7)";

  gateEl.style.borderRadius =
    "4px";

  gateEl.style.background =
    "rgba(255,255,255,0.03)";

  gateEl.style.opacity = "0";

  gateEl.style.pointerEvents =
    "none";

  gateEl.style.cursor =
    "pointer";

  gateEl.style.zIndex =
    "100";

  gateEl.style.transition =
    "opacity 0.15s ease";

  gateEl.addEventListener(
    "click",
    onGateClick
  );

  viewer.appendChild(
    gateEl
  );
}


function onGateClick(event) {
  event.stopPropagation();

  console.log("GATE CLICK");

  activateCallback?.();
}


export function updateRouteGate({
  visible,
  offset = 0,
  strength = 0
}) {
  if (!gateEl) return;

  if (!visible) {
    gateEl.style.opacity = "0";

    gateEl.style.pointerEvents =
      "none";

    return;
  }

  gateEl.style.opacity =
    String(
      0.25 +
      strength * 0.75
    );

  gateEl.style.pointerEvents =
    "auto";

  gateEl.style.transform =
    `translate(calc(-50% + ${offset}px), -50%)`;
}


export function destroyRouteGate() {
  if (gateEl) {
    gateEl.removeEventListener(
      "click",
      onGateClick
    );

    gateEl.remove();
  }

  gateEl = null;
  activateCallback = null;
}
