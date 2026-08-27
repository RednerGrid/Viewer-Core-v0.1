const gateElements =
  new Map();

let viewerRef = null;


export function initRouteGates(
  viewer
) {
  destroyRouteGates();

  viewerRef = viewer;
}


export function updateRouteGates(
  gates
) {
  if (!viewerRef) return;

  const visibleIds =
    new Set(
      gates.map(
        gate => gate.id
      )
    );


  /*
    Удаляем gates,
    которые больше не видны.
  */

  for (
    const [
      edgeId,
      element
    ]
    of gateElements
  ) {
    if (
      visibleIds.has(edgeId)
    ) {
      continue;
    }

    element.style.opacity =
      "0";

    element.dataset.visible =
      "false";
  }


  /*
    Создаём / обновляем
    видимые gates.
  */

  gates.forEach(gate => {
    let element =
      gateElements.get(
        gate.id
      );

    if (!element) {
      element =
        createGateElement();

      viewerRef.appendChild(
        element
      );

      gateElements.set(
        gate.id,
        element
      );
    }

    updateGateElement(
      element,
      gate
    );
  });
}


function createGateElement() {
  const element =
    document.createElement(
      "div"
    );

  element.className =
    "route-gate";

  element.style.position =
    "absolute";

  element.style.height =
    "220px";

  element.style.border =
    "none";

  element.style.borderBottom =
    "2px solid rgba(255,255,255,0.8)";

  element.style.borderRadius =
    "0 0 12px 12px";

  element.style.background = `
    linear-gradient(
      to top,
      rgba(255,255,255,0.28) 0%,
      rgba(255,255,255,0.15) 18%,
      rgba(255,255,255,0.05) 38%,
      rgba(255,255,255,0.00) 62%
    )
  `;

  element.style.boxShadow =
    "0 5px 14px rgba(255,255,255,0.14)";

  /*
    Gate — индикатор,
    НЕ самостоятельная кнопка.
  */
  element.style.pointerEvents =
    "none";

  element.style.transform =
    "translate(-50%, -50%)";

  element.style.transformOrigin =
    "center bottom";

  element.style.opacity =
    "0";

  element.style.transition = `
    opacity 140ms ease,
    filter 140ms ease,
    transform 140ms ease
  `;

  element.style.zIndex =
    "100";

  return element;
}


function updateGateElement(
  element,
  {
    x,
    y,
    width = 120,
    active = false,
    strength = 1
  }
) {
  element.dataset.visible =
    "true";

  element.style.left =
    `${x}px`;

  element.style.top =
    `${y}px`;

  element.style.width =
    `${width}px`;


  if (active) {
    element.style.opacity =
      String(
        0.72 +
        strength * 0.28
      );

    element.style.filter =
      "brightness(1.45)";

    element.style.transform =
      "translate(-50%, -50%) scale(1.03)";
  } else {
    element.style.opacity =
      String(
        0.22 +
        strength * 0.20
      );

    element.style.filter =
      "brightness(0.8)";

    element.style.transform =
      "translate(-50%, -50%)";
  }
}


export function hideRouteGates() {
  for (
    const element
    of gateElements.values()
  ) {
    element.style.opacity =
      "0";
  }
}


export function destroyRouteGates() {
  for (
    const element
    of gateElements.values()
  ) {
    element.remove();
  }

  gateElements.clear();

  viewerRef = null;
}