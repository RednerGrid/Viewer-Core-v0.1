let hotspotLayer = null;
let hotspotElements = [];
let selectedHotspotId = null;

export function renderHotspots(
    hotspots = [],
    openScene,
    selectHotspot = null
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
    console.log("renderHotspots:", !!selectHotspot);

    el.addEventListener("pointerdown", e => e.stopPropagation());
    el.addEventListener("pointerup", e => e.stopPropagation());

    el.addEventListener("click", e => {
      console.log(
        "ctrl:", e.ctrlKey,
        "meta:", e.metaKey,
        "callback:", !!selectHotspot
      );

      e.preventDefault();
      e.stopPropagation();

      const editMode = e.ctrlKey || e.metaKey;

      if (editMode && selectHotspot) {
        selectPanoramaHotspot(hotspot.id);
        selectHotspot(hotspot.id);
        return;
      }

      openScene(hotspot.target);
    });

    hotspotLayer.appendChild(el);

    return {
      data: hotspot,
      el
    };
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
    const { data, el } = item;

    const yaw = THREE.MathUtils.degToRad(data.yaw);
    const pitch = THREE.MathUtils.degToRad(data.pitch);

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