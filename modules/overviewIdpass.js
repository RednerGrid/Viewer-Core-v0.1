import { renderToolbar } from "../ui/toolbar.js";
import { loadImage } from "../core/assetManager.js";

let viewerRef = null;
let imageEl = null;
let labelEl = null;
let layerElements = {};

let idCanvas = null;
let idContext = null;

let currentObject = null;
let objectsByColor = {};

export async function init({ project, scene, viewer, openScene }) {
  viewerRef = viewer;

  renderToolbar(scene.actions, openScene);

  objectsByColor = buildObjectMap(scene.idObjects || {});

  const imagePath = `${project.basePath}${scene.assets.image}`;
  const idmapPath = `${project.basePath}${scene.assets.idmap}`;

  imageEl = document.createElement("img");
  imageEl.className = "overview-image";
  imageEl.src = imagePath;

  viewer.appendChild(imageEl);

  createLayers(project, scene, viewer);
  createLabel(viewer);

  const idImage = await loadImage(idmapPath);

  idCanvas = document.createElement("canvas");
  idCanvas.width = idImage.naturalWidth;
  idCanvas.height = idImage.naturalHeight;

  idContext = idCanvas.getContext("2d");
  idContext.drawImage(idImage, 0, 0);

  addControls(openScene);
}

function createLayers(project, scene, viewer) {
  layerElements = {};

  (scene.layers || []).forEach(layer => {
    const img = document.createElement("img");
    img.className = "overview-layer";
    img.src = `${project.basePath}${layer.image}`;
    img.dataset.objectId = layer.objectId;

    viewer.appendChild(img);

    layerElements[layer.objectId] = img;
  });
}

function createLabel(viewer) {
  labelEl = document.createElement("div");
  labelEl.className = "overview-label";
  viewer.appendChild(labelEl);
}

function buildObjectMap(idObjects) {
  const map = {};

  idObjects.forEach(obj => {
    const key = colorToKey(obj.color);
    map[key] = obj;
  });

  return map;
}

function colorToKey(color) {
  return `${color[0]},${color[1]},${color[2]}`;
}

function addControls(openScene) {
  viewerRef.addEventListener("pointermove", onPointerMove);
  viewerRef.addEventListener("pointerleave", onPointerLeave);

  viewerRef.addEventListener("click", () => {
    if (currentObject?.target) {
      openScene(currentObject.target);
    }
  });
}

function removeControls() {
  if (!viewerRef) return;

  viewerRef.removeEventListener("pointermove", onPointerMove);
  viewerRef.removeEventListener("pointerleave", onPointerLeave);
}

function onPointerMove(e) {
  if (!idContext || !imageEl) return;

  const hit = getObjectUnderPointer(e);

  if (hit) {
    currentObject = hit;
    viewerRef.style.cursor = "pointer";

    showLayer(hit.id);

    labelEl.textContent = hit.title;
    labelEl.style.left = `${e.clientX + 14}px`;
    labelEl.style.top = `${e.clientY + 14}px`;
    labelEl.classList.add("active");
  } else {
    clearHover();
  }
}

function onPointerLeave() {
  clearHover();
}

function showLayer(objectId) {
  Object.values(layerElements).forEach(layer => {
    layer.classList.remove("active");
  });

  if (layerElements[objectId]) {
    layerElements[objectId].classList.add("active");
  }
}

function clearHover() {
  currentObject = null;

  if (viewerRef) {
    viewerRef.style.cursor = "default";
  }

  Object.values(layerElements).forEach(layer => {
    layer.classList.remove("active");
  });

  if (labelEl) {
    labelEl.classList.remove("active");
  }
}

function getObjectUnderPointer(e) {
  const rect = imageEl.getBoundingClientRect();

  const xNorm = (e.clientX - rect.left) / rect.width;
  const yNorm = (e.clientY - rect.top) / rect.height;

  if (xNorm < 0 || xNorm > 1 || yNorm < 0 || yNorm > 1) {
    return null;
  }

  const x = Math.floor(xNorm * idCanvas.width);
  const y = Math.floor(yNorm * idCanvas.height);

  const pixel = idContext.getImageData(x, y, 1, 1).data;
  const key = `${pixel[0]},${pixel[1]},${pixel[2]}`;

  return objectsByColor[key] || null;
}

export function destroy() {
  removeControls();

  if (viewerRef) {
    viewerRef.innerHTML = "";
  }

  viewerRef = null;
  imageEl = null;
  labelEl = null;
  layerElements = {};
  idCanvas = null;
  idContext = null;
  currentObject = null;
  objectsByColor = {};
}

export function resize() {}

export function update() {}