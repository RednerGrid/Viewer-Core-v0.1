let hotspotLayer = null;
let hotspotElements = [];
let selectedHotspotId = null;
let draggedHotspotId = null;
let dragPointerId = null;
let dragStartX = 0;
let dragStartY = 0;
let hasDragged = false;

export function renderHotspots(
  hotspots = [],
  openScene,
  selectHotspot = null,
  moveHotspot = null,
  saveHotspotPosition = null
) {
  clearHotspots();

  hotspotLayer = document.createElement("div");
  hotspotLayer.className = "hotspot-layer";

hotspotElements = hotspots.map(hotspot => {
  const el = document.createElement("button");

  el.className = "hotspot-point";
  el.title = hotspot.title;

  el.innerHTML = `
    <span class="hotspot-dot"></span>
    <span class="hotspot-label">${hotspot.title}</span>
  `;

  const item = {
    data: hotspot,
    el,
    previewPosition: null
  };

  el.addEventListener("pointerdown", e => {
    e.stopPropagation();

    const editMode = e.ctrlKey || e.metaKey;

    if (!editMode || !selectHotspot) return;

    e.preventDefault();

    draggedHotspotId = hotspot.id;
    dragPointerId = e.pointerId;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    hasDragged = false;

    el.setPointerCapture(e.pointerId);
    el.classList.add("hotspot-point--dragging");

    selectHotspot(hotspot.id);
  });

  el.addEventListener("pointermove", e => {
    if (
      draggedHotspotId !== hotspot.id ||
      dragPointerId !== e.pointerId
    ) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasDragged = true;
    }

    const position = moveHotspot?.({
      clientX: e.clientX,
      clientY: e.clientY
    });

    if (position) {
      item.previewPosition = position;
    }
  });

  el.addEventListener("pointerup", e => {
    e.stopPropagation();

    if (
      draggedHotspotId !== hotspot.id ||
      dragPointerId !== e.pointerId
    ) {
      return;
    }

    e.preventDefault();

    if (el.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }

    el.classList.remove("hotspot-point--dragging");

    if (
      hasDragged &&
      item.previewPosition &&
      saveHotspotPosition
    ) {
      saveHotspotPosition(
        hotspot.id,
        item.previewPosition
      );
    }

    item.previewPosition = null;
    draggedHotspotId = null;
    dragPointerId = null;
  });

  el.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();

    if (hasDragged) {
      hasDragged = false;
      return;
    }

    const editMode = e.ctrlKey || e.metaKey;

    if (editMode && selectHotspot) {
      selectHotspot(hotspot.id);
      return;
    }

    openScene(hotspot);
  });

  hotspotLayer.appendChild(el);

  return item;
});

  document.getElementById("viewer").appendChild(hotspotLayer);
  selectPanoramaHotspot(selectedHotspotId);
}

export function updatePanoramaHotspots(camera, renderer) {
  if (!hotspotElements.length) return;

  const width = renderer.domElement.clientWidth;
  const height = renderer.domElement.clientHeight;

  const cameraDirection = new THREE.Vector3();
  camera.getWorldDirection(cameraDirection);

  hotspotElements.forEach(item => {
    const { data, el, previewPosition } = item;
    const position = previewPosition ?? data;

    const yaw = THREE.MathUtils.degToRad(position.yaw);
    const pitch = THREE.MathUtils.degToRad(position.pitch);

    const point = new THREE.Vector3(
      500 * Math.cos(pitch) * Math.cos(yaw),
      500 * Math.sin(pitch),
      500 * Math.cos(pitch) * Math.sin(yaw)
    );

    const pointDirection = point.clone().normalize();

    const visible = cameraDirection.dot(pointDirection) > 0;

    if (!visible) {
      el.style.display = "none";
      return;
    }

    const projected = point.clone().project(camera);

    const x = (projected.x * 0.5 + 0.5) * width;
    const y = (-projected.y * 0.5 + 0.5) * height;

    el.style.display = "flex";
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  });
}

export function clearHotspots() {
  if (hotspotLayer) {
    hotspotLayer.remove();
  }

  hotspotLayer = null;
  hotspotElements = [];
}

export function selectPanoramaHotspot(hotspotId) {
  selectedHotspotId = hotspotId;

  hotspotElements.forEach(item => {
    item.el.classList.toggle(
      "hotspot-point--selected",
      item.data.id === hotspotId
    );
  });
}