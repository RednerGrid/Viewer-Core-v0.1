import {
  getEditableScene,
  updateScene
} from "../editor/editorState.js";

import { exportScene } from "../editor/exportScene.js";

let panelEl = null;
let coordinatesEl = null;
let copyButtonEl = null;
let copyViewButtonEl = null;
let exportButtonEl = null;
let addHotspotButtonEl = null;
let crosshairEl = null;
let sceneChangedCallback = null;

let currentView = {
  yaw: 0,
  pitch: 0,
  fov: 50
};

export function isDeveloperMode() {
  const params = new URLSearchParams(window.location.search);

  return params.get("dev") === "1";
}

export function initDeveloperTools(options = {}) {
  if (!isDeveloperMode()) return;
  if (panelEl) return;

  sceneChangedCallback = options.onSceneChange ?? null;
  if (panelEl) return;

  panelEl = document.createElement("div");
  panelEl.className = "developer-tools";

  panelEl.innerHTML = `
    <div class="developer-tools__title">Developer Mode</div>

    <div class="developer-tools__coordinates">
      <span>Yaw: <b data-dev-yaw>0.0</b></span>
      <span>Pitch: <b data-dev-pitch>0.0</b></span>
    </div>

    <button
      type="button"
      class="developer-tools__button"
      data-dev-copy
    >
      Скопировать hotspot
    </button>

    <button
      type="button"
      class="developer-tools__button"
      data-dev-add-hotspot
    >
      Добавить hotspot в центр
    </button>

    <button
      type="button"
      class="developer-tools__button"
      data-dev-copy-view
    >
      Сделать текущий вид стартовым
    </button>

    <button
      type="button"
      class="developer-tools__button"
      data-dev-export
    >
      Экспорт сцены
    </button>

  `;

  document.body.appendChild(panelEl);

  crosshairEl = document.createElement("div");
  crosshairEl.className = "developer-crosshair";
  crosshairEl.setAttribute("aria-hidden", "true");

  document.body.appendChild(crosshairEl);
  
  coordinatesEl = {
    yaw: panelEl.querySelector("[data-dev-yaw]"),
    pitch: panelEl.querySelector("[data-dev-pitch]")
  };

  copyButtonEl = panelEl.querySelector("[data-dev-copy]");
  copyViewButtonEl = panelEl.querySelector("[data-dev-copy-view]");
  exportButtonEl = panelEl.querySelector("[data-dev-export]");
  addHotspotButtonEl = panelEl.querySelector("[data-dev-add-hotspot]");
  copyViewButtonEl.addEventListener("click", saveCurrentView);
  exportButtonEl.addEventListener("click", exportScene);
  copyButtonEl.addEventListener("click", copyCurrentHotspot);
  addHotspotButtonEl.addEventListener("click", addCurrentHotspot);
  
}

export function updateDeveloperView({ yaw, pitch, fov }) {
  currentView.yaw = Number(yaw);
  currentView.pitch = Number(pitch);
  currentView.fov = Number(fov);

  if (!coordinatesEl) return;

  coordinatesEl.yaw.textContent = currentView.yaw.toFixed(1);
  coordinatesEl.pitch.textContent = currentView.pitch.toFixed(1);
}

async function copyCurrentHotspot() {
  const hotspot = {
    id: "new_hotspot",
    title: "Новая точка",
    yaw: Number(currentView.yaw.toFixed(1)),
    pitch: Number(currentView.pitch.toFixed(1)),
    target: "scene_id"
  };

  const text = JSON.stringify(hotspot, null, 2);

  try {
    await navigator.clipboard.writeText(text);

    copyButtonEl.textContent = "Скопировано";

    setTimeout(() => {
      copyButtonEl.textContent = "Скопировать hotspot";
    }, 1200);
  } catch (error) {
    console.error("Не удалось скопировать hotspot:", error);
  }
}

export function destroyDeveloperTools() {
  if (copyButtonEl) {
    copyViewButtonEl.removeEventListener(
  "click",
  saveCurrentView
);
  }

if (addHotspotButtonEl) {
  addHotspotButtonEl.removeEventListener(
    "click",
    addCurrentHotspot
  );
}

if (exportButtonEl) {
  exportButtonEl.removeEventListener(
    "click",
    exportScene
  );
}

if (crosshairEl) {
  crosshairEl.remove();
}

  if (panelEl) {
    panelEl.remove();
  }

  if (copyViewButtonEl) {
    copyViewButtonEl.removeEventListener("click", copyCurrentView);
  }

  if (exportButtonEl) {
    exportButtonEl.removeEventListener(
        "click",
        exportScene
    );
}

  panelEl = null;
  coordinatesEl = null;
  copyButtonEl = null;
  copyViewButtonEl = null;
  exportButtonEl = null;
  addHotspotButtonEl = null;
  exportButtonEl = null;
  crosshairEl = null;
  sceneChangedCallback = null;
  
}

function saveCurrentView() {
  updateScene(scene => {
    scene.view = {
      yaw: Number(currentView.yaw.toFixed(1)),
      pitch: Number(currentView.pitch.toFixed(1)),
      fov: Number(currentView.fov.toFixed(1))
    };
  });

  copyViewButtonEl.textContent = "Стартовый вид обновлён";

  setTimeout(() => {
    copyViewButtonEl.textContent =
      "Сделать текущий вид стартовым";
  }, 1200);
}

function addCurrentHotspot() {
  const editableScene = getEditableScene();

  if (!editableScene) {
    alert("Нет активной сцены.");
    return;
  }

  const existingHotspots = editableScene.hotspots ?? [];

  const nextNumber = existingHotspots.length + 1;

  const hotspot = {
    id: `hotspot_${String(nextNumber).padStart(3, "0")}`,
    title: "Новая точка",
    yaw: Number(currentView.yaw.toFixed(1)),
    pitch: Number(currentView.pitch.toFixed(1)),
    target: "scene_id"
  };

  updateScene(scene => {
    if (!Array.isArray(scene.hotspots)) {
      scene.hotspots = [];
    }

    scene.hotspots.push(hotspot);
  });

  addHotspotButtonEl.textContent = "Hotspot добавлен";

  setTimeout(() => {
    addHotspotButtonEl.textContent =
      "Добавить hotspot в центр";
  }, 1200);

  if (sceneChangedCallback) {
    sceneChangedCallback(getEditableScene());
  }
}
