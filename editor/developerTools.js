import {
  getEditableScene,
  getIsDirty,
  markClean,
  updateScene
} from "./editorState.js";

import { exportScene } from "./exportScene.js";

let panelEl = null;
let coordinatesEl = null;
let copyViewButtonEl = null;
let exportButtonEl = null;
let addHotspotButtonEl = null;
let crosshairEl = null;
let sceneChangedCallback = null;
let hotspotTitleInputEl = null;
let hotspotTargetSelectEl = null;
let currentProject = null;
let hotspotListEl = null;
let updateHotspotButtonEl = null;
let deleteHotspotButtonEl = null;
let selectedHotspotId = null;
let dirtyStateEl = null;
let sceneTitleInputEl = null;
let updateSceneTitleButtonEl = null;
let setViewCallback = null;
let highlightHotspotCallback = null;
let inspectorTitleEl = null;
let sceneInspectorEl = null;
let hotspotInspectorEl = null;
let routeGateInspectorEl = null;

let routeGateYawInputEl = null;
let routeGatePitchInputEl = null;
let routeGateDistanceInputEl = null;
let routeGateWidthInputEl = null;
let routeGateRotationInputEl = null;

let selectedRouteGate = null;

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

  sceneChangedCallback =
    options.onSceneChange ?? sceneChangedCallback;
  
  setViewCallback =
    options.setView ?? setViewCallback;

  highlightHotspotCallback =
    options.highlightHotspot ?? highlightHotspotCallback;

  currentProject =
    options.project ?? currentProject;

  /*
    Панель уже существует, но сцена могла измениться.
    Поэтому обновляем её содержимое вместо выхода
    без синхронизации.
  */
  if (panelEl) {
    selectedHotspotId = null;

    hotspotTitleInputEl.value = "";

    updateHotspotButtonEl.disabled = true;
    deleteHotspotButtonEl.disabled = true;

    fillTargetSelect();
    renderHotspotList();
    renderDirtyState();
    renderSceneProperties();
    renderInspector();

    return;
  }
 
  panelEl = document.createElement("div");
  panelEl.className = "developer-tools";

 panelEl.innerHTML = `
  <div class="developer-tools__title">
    Developer Mode
  </div>

  <div
    class="developer-tools__status"
    data-dev-dirty-state
  >
    Scene saved
  </div>

  <div class="developer-tools__coordinates">
    <span>Yaw: <b data-dev-yaw>0.0</b></span>
    <span>Pitch: <b data-dev-pitch>0.0</b></span>
  </div>

  <div class="developer-tools__section">
    <div class="developer-tools__subtitle">
      Inspector
    </div>

    <div data-dev-inspector-title>
      Scene
    </div>
  </div>

  <div
    class="developer-tools__section"
    data-dev-scene-inspector
  >
    <div class="developer-tools__subtitle">
      Scene
    </div>

    <label class="developer-tools__label">
      Название сцены

      <input
        type="text"
        class="developer-tools__input"
        data-dev-scene-title
        placeholder="Название сцены"
      >
    </label>

    <button
      type="button"
      class="developer-tools__button"
      data-dev-update-scene-title
    >
      Обновить название сцены
    </button>
  </div>

  <div
    class="developer-tools__section"
    data-dev-route-gate-inspector
    hidden
  >
    <div class="developer-tools__subtitle">
      Route Gate
    </div>

    <label class="developer-tools__label">
      Yaw

      <input
        type="number"
        step="0.1"
        class="developer-tools__input"
        data-dev-route-gate-yaw
      >
    </label>

    <label class="developer-tools__label">
      Pitch

      <input
        type="number"
        step="0.1"
        class="developer-tools__input"
        data-dev-route-gate-pitch
      >
    </label>

    <label class="developer-tools__label">
      Distance

      <input
        type="number"
        step="5"
        min="10"
        class="developer-tools__input"
        data-dev-route-gate-distance
      >
    </label>

    <label class="developer-tools__label">
      Width

      <input
        type="number"
        step="5"
        min="10"
        class="developer-tools__input"
        data-dev-route-gate-width
      >
    </label>

    <label class="developer-tools__label">
      Rotation

      <input
        type="number"
        step="1"
        class="developer-tools__input"
        data-dev-route-gate-rotation
      >
    </label>

    <button
      type="button"
      class="developer-tools__button"
      data-dev-route-gate-from-view
    >
      Поставить в центр взгляда
    </button>
  </div>

  <div
    class="developer-tools__section"
    data-dev-hotspot-inspector
    hidden
  >
    <div class="developer-tools__subtitle">
      Hotspot
    </div>

    <label class="developer-tools__label">
      Название

      <input
        type="text"
        class="developer-tools__input"
        data-dev-hotspot-title
        placeholder="Например: В гостиную"
      >
    </label>

    <label class="developer-tools__label">
      Target

      <select
        class="developer-tools__select"
        data-dev-hotspot-target
      ></select>
    </label>

    <button
      type="button"
      class="developer-tools__button"
      data-dev-update-hotspot
      disabled
    >
      Обновить выбранный hotspot
    </button>

    <button
      type="button"
      class="developer-tools__button developer-tools__button--danger"
      data-dev-delete-hotspot
      disabled
    >
      Удалить выбранный hotspot
    </button>
  </div>

  <div class="developer-tools__section">
    <div class="developer-tools__subtitle">
      Hotspots сцены
    </div>

    <button
      type="button"
      class="developer-tools__button"
      data-dev-add-hotspot
    >
      Добавить hotspot в центр
    </button>

    <div
      class="developer-tools__hotspot-list"
      data-dev-hotspot-list
    ></div>
  </div>

  <div class="developer-tools__section">
    <div class="developer-tools__subtitle">
      View
    </div>

    <button
      type="button"
      class="developer-tools__button"
      data-dev-copy-view
    >
      Сделать текущий вид стартовым
    </button>
  </div>

  <div class="developer-tools__section">
    <div class="developer-tools__subtitle">
      Export
    </div>

    <button
      type="button"
      class="developer-tools__button"
      data-dev-export
    >
      Экспорт сцены
    </button>
  </div>
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

  copyViewButtonEl = panelEl.querySelector("[data-dev-copy-view]");
  exportButtonEl = panelEl.querySelector("[data-dev-export]");
  addHotspotButtonEl = panelEl.querySelector("[data-dev-add-hotspot]");

  hotspotTitleInputEl = panelEl.querySelector("[data-dev-hotspot-title]");
  hotspotTargetSelectEl = panelEl.querySelector("[data-dev-hotspot-target]");
  hotspotListEl = panelEl.querySelector("[data-dev-hotspot-list]");

  updateHotspotButtonEl = panelEl.querySelector("[data-dev-update-hotspot]");
  deleteHotspotButtonEl = panelEl.querySelector("[data-dev-delete-hotspot]");

  dirtyStateEl = panelEl.querySelector("[data-dev-dirty-state]");
  sceneTitleInputEl = panelEl.querySelector("[data-dev-scene-title]");
  updateSceneTitleButtonEl = panelEl.querySelector("[data-dev-update-scene-title]");

  inspectorTitleEl = panelEl.querySelector("[data-dev-inspector-title]");
  sceneInspectorEl = panelEl.querySelector("[data-dev-scene-inspector]");
  hotspotInspectorEl = panelEl.querySelector("[data-dev-hotspot-inspector]");
  routeGateInspectorEl =
    panelEl.querySelector(
      "[data-dev-route-gate-inspector]"
    );

  routeGateYawInputEl =
    panelEl.querySelector(
      "[data-dev-route-gate-yaw]"
    );

  routeGatePitchInputEl =
    panelEl.querySelector(
      "[data-dev-route-gate-pitch]"
    );

  routeGateDistanceInputEl =
    panelEl.querySelector(
      "[data-dev-route-gate-distance]"
    );

  routeGateWidthInputEl =
    panelEl.querySelector(
      "[data-dev-route-gate-width]"
    );

  routeGateRotationInputEl =
    panelEl.querySelector(
      "[data-dev-route-gate-rotation]"
    );

  const routeGateFromViewButton =
    panelEl.querySelector(
      "[data-dev-route-gate-from-view]"
    );

  fillTargetSelect();
  renderHotspotList();
  renderDirtyState();
  renderSceneProperties();
  renderInspector();

  copyViewButtonEl.addEventListener("click", saveCurrentView);
  exportButtonEl.addEventListener("click", exportCurrentScene);
  addHotspotButtonEl = panelEl.querySelector("[data-dev-add-hotspot]");
  addHotspotButtonEl.addEventListener("click", addCurrentHotspot);
  updateHotspotButtonEl.addEventListener("click", updateSelectedHotspot);
  deleteHotspotButtonEl.addEventListener("click", deleteSelectedHotspot);
  updateSceneTitleButtonEl.addEventListener("click", updateSceneTitle);
  routeGateYawInputEl.addEventListener(
    "input",
    updateSelectedRouteGate
  );

  routeGatePitchInputEl.addEventListener(
    "input",
    updateSelectedRouteGate
  );

  routeGateDistanceInputEl.addEventListener(
    "input",
    updateSelectedRouteGate
  );

  routeGateWidthInputEl.addEventListener(
    "input",
    updateSelectedRouteGate
  );

  routeGateRotationInputEl.addEventListener(
    "input",
    updateSelectedRouteGate
  );

  routeGateFromViewButton.addEventListener(
    "click",
    setRouteGateFromView
  );
  
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

  if (copyViewButtonEl) {
    copyViewButtonEl.removeEventListener("click", saveCurrentView);
  }

  if (addHotspotButtonEl) {
    addHotspotButtonEl.removeEventListener("click", addCurrentHotspot);
  }

  if (exportButtonEl) {
    exportButtonEl.removeEventListener("click", exportCurrentScene);
  }

  if (updateHotspotButtonEl) {
    updateHotspotButtonEl.removeEventListener("click", updateSelectedHotspot);
  }

  if (deleteHotspotButtonEl) {
    deleteHotspotButtonEl.removeEventListener("click", deleteSelectedHotspot);
  }

  if (updateSceneTitleButtonEl) {
    updateSceneTitleButtonEl.removeEventListener("click", updateSceneTitle);
  }

  if (crosshairEl) {
    crosshairEl.remove();
  }

  if (panelEl) {
    panelEl.remove();
  }

  panelEl = null;
  coordinatesEl = null;
  copyViewButtonEl = null;
  exportButtonEl = null;
  addHotspotButtonEl = null;
  crosshairEl = null;
  sceneChangedCallback = null;
  hotspotTitleInputEl = null;
  hotspotTargetSelectEl = null;
  currentProject = null;
  hotspotListEl = null;
  updateHotspotButtonEl = null;
  deleteHotspotButtonEl = null;
  selectedHotspotId = null;
  dirtyStateEl = null;
  sceneTitleInputEl = null;
  updateSceneTitleButtonEl = null;
  setViewCallback = null;
  highlightHotspotCallback = null;
  inspectorTitleEl = null;
  sceneInspectorEl = null;
  hotspotInspectorEl = null;
}

function saveCurrentView() {
  updateScene(scene => {
    scene.view = {
      yaw: Number(currentView.yaw.toFixed(1)),
      pitch: Number(currentView.pitch.toFixed(1)),
      fov: Number(currentView.fov.toFixed(1))
    };
  });

  notifySceneChanged();

  copyViewButtonEl.textContent =
    "Стартовый вид обновлён";

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

  if (!Array.isArray(editableScene.hotspots)) {
    editableScene.hotspots = [];
  }

  const availableScenes = Object.values(
    currentProject?.scenes ?? {}
  ).filter(scene => scene.id !== editableScene.id);

  if (availableScenes.length === 0) {
    alert("Нет доступной целевой сцены.");
    return;
  }

  const target = availableScenes[0].id;

  const hotspotId = createHotspotId(
    target,
    editableScene.hotspots
  );

  const hotspot = {
    id: hotspotId,
    title: "Новый hotspot",
    yaw: Number(currentView.yaw.toFixed(1)),
    pitch: Number(currentView.pitch.toFixed(1)),
    target
  };

  updateScene(scene => {
    if (!Array.isArray(scene.hotspots)) {
      scene.hotspots = [];
    }

    scene.hotspots.push(hotspot);
  });

  notifySceneChanged();
  selectHotspot(hotspot.id);

  addHotspotButtonEl.textContent = "Hotspot добавлен";

  setTimeout(() => {
    addHotspotButtonEl.textContent =
      "Добавить hotspot в центр";
  }, 1200);
}

function createHotspotId(target, existingHotspots) {
  const baseId = `to_${target}`
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  const usedIds = new Set(
    existingHotspots.map(hotspot => hotspot.id)
  );

  if (!usedIds.has(baseId)) {
    return baseId;
  }

  let number = 2;

  while (usedIds.has(`${baseId}_${number}`)) {
    number++;
  }

  return `${baseId}_${number}`;
}

function fillTargetSelect() {
  if (!hotspotTargetSelectEl) return;

  hotspotTargetSelectEl.innerHTML = "";

  const editableScene = getEditableScene();
  const currentSceneId = editableScene?.id;

  console.log("TARGET SELECT", {
    currentSceneId,
    editableScene,
    sceneIds: Object.values(currentProject?.scenes ?? {}).map(scene => scene.id)
  });

  const scenes = currentProject?.scenes ?? {};

  Object.values(scenes).forEach(scene => {
    /*
      Текущую сцену пока исключаем:
      переход из hall в hall обычно не нужен.
    */
    if (scene.id === currentSceneId) {
      return;
    }

    const option = document.createElement("option");

    option.value = scene.id;
    option.textContent =
      `${scene.id} — ${scene.title || scene.id}`;

    hotspotTargetSelectEl.appendChild(option);
  });
}

function renderHotspotList() {
  if (!hotspotListEl) return;

  const editableScene = getEditableScene();
  const hotspots = editableScene?.hotspots ?? [];

  hotspotListEl.innerHTML = "";

  if (hotspots.length === 0) {
    const emptyEl = document.createElement("div");
    emptyEl.className = "developer-tools__empty";
    emptyEl.textContent = "Hotspots пока нет";

    hotspotListEl.appendChild(emptyEl);
    return;
  }

  hotspots.forEach(hotspot => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "developer-tools__hotspot-item";
    button.dataset.hotspotId = hotspot.id;

    if (hotspot.id === selectedHotspotId) {
      button.classList.add("active");
    }

    button.innerHTML = `
      <span>${hotspot.title || hotspot.id}</span>
      <small>${hotspot.target || "Без target"}</small>
    `;

    button.addEventListener("click", () => {
      console.log("Hotspot clicked:", hotspot.id);
      console.log("Editable scene:", getEditableScene());

      selectHotspot(hotspot.id);
      
    });

    hotspotListEl.appendChild(button);
  });
}

export function selectHotspot(hotspotId) {
  const editableScene = getEditableScene();

  const hotspot = editableScene?.hotspots?.find(
    item => item.id === hotspotId
  );

  if (!hotspot) {
    console.warn(`Hotspot не найден: ${hotspotId}`);
    return;
  }

  if (!hotspotTitleInputEl || !hotspotTargetSelectEl) {
    console.error("Hotspot Editor не инициализирован.");
    return;
  }

  if (setViewCallback) {
    setViewCallback({
      yaw: hotspot.yaw,
      pitch: hotspot.pitch
    });
  }

  selectedRouteGate = null;
  selectedHotspotId = hotspot.id;

  if (highlightHotspotCallback) {
    highlightHotspotCallback(
      hotspot.id
    );
  }

  hotspotTitleInputEl.value =
    hotspot.title ?? "";

  hotspotTargetSelectEl.value =
    hotspot.target ?? "";

  updateHotspotButtonEl.disabled =
    false;

  deleteHotspotButtonEl.disabled =
    false;

  renderInspector();
  renderHotspotList();
}

function updateSelectedHotspot() {
  if (!selectedHotspotId) {
    alert("Сначала выбери hotspot.");
    return;
  }

  const title = hotspotTitleInputEl.value.trim();
  const target = hotspotTargetSelectEl.value;

  if (!title) {
    alert("Укажи название hotspot.");
    hotspotTitleInputEl.focus();
    return;
  }

  if (!target) {
    alert("Выбери целевую сцену.");
    return;
  }

  updateScene(scene => {
    const hotspot = scene.hotspots?.find(
      item => item.id === selectedHotspotId
    );

    if (!hotspot) return;

    hotspot.title = title;
    hotspot.target = target;
    hotspot.yaw = Number(currentView.yaw.toFixed(1));
    hotspot.pitch = Number(currentView.pitch.toFixed(1));
  });

  updateHotspotButtonEl.textContent = "Hotspot обновлён";

  setTimeout(() => {
    updateHotspotButtonEl.textContent =
      "Обновить выбранный hotspot";
  }, 1200);

  renderHotspotList();
  notifySceneChanged();
}

function deleteSelectedHotspot() {
  if (!selectedHotspotId) {
    alert("Сначала выбери hotspot.");
    return;
  }

  const editableScene = getEditableScene();

  const hotspot = editableScene?.hotspots?.find(
    item => item.id === selectedHotspotId
  );

  if (!hotspot) return;

  const confirmed = confirm(
    `Удалить hotspot «${hotspot.title}»?`
  );

  if (!confirmed) return;

  updateScene(scene => {
    scene.hotspots = (scene.hotspots ?? []).filter(
      item => item.id !== selectedHotspotId
    );
  });

  selectedHotspotId = null;
  renderInspector();

  hotspotTitleInputEl.value = "";
  updateHotspotButtonEl.disabled = true;
  deleteHotspotButtonEl.disabled = true;

  renderHotspotList();
  notifySceneChanged();
}

function notifySceneChanged() {
  renderDirtyState();

  if (sceneChangedCallback) {
    sceneChangedCallback(getEditableScene());
  }
}

function renderDirtyState() {
  if (!dirtyStateEl) return;

  const dirty = getIsDirty();

  dirtyStateEl.textContent = dirty
    ? "● Scene modified"
    : "Scene saved";

  dirtyStateEl.classList.toggle(
    "is-dirty",
    dirty
  );
}

async function exportCurrentScene() {
  try {
    await exportScene();

    markClean();
    renderDirtyState();

    exportButtonEl.textContent = "Сцена экспортирована";

    setTimeout(() => {
      exportButtonEl.textContent = "Экспорт сцены";
    }, 1200);
  } catch (error) {
    console.error(
      "Не удалось экспортировать сцену:",
      error
    );

    exportButtonEl.textContent = "Ошибка экспорта";

    setTimeout(() => {
      exportButtonEl.textContent = "Экспорт сцены";
    }, 1200);
  }
}

function renderSceneProperties() {
  if (!sceneTitleInputEl) return;

  const editableScene = getEditableScene();

  sceneTitleInputEl.value =
    editableScene?.title ?? "";
}

function updateSceneTitle() {
  const title = sceneTitleInputEl.value.trim();

  if (!title) {
    alert("Укажи название сцены.");
    sceneTitleInputEl.focus();
    return;
  }

  const editableScene = getEditableScene();

  if (!editableScene) {
    alert("Нет активной сцены.");
    return;
  }

  /*
    Не создаём лишнее изменение,
    если название фактически не поменялось.
  */
  if (editableScene.title === title) {
    return;
  }

  updateScene(scene => {
    scene.title = title;
  });

  const sceneTitleEl =
    document.getElementById("sceneTitle");

  if (sceneTitleEl) {
    sceneTitleEl.textContent = title;
  }

  notifySceneChanged();

  updateSceneTitleButtonEl.textContent =
    "Название обновлено";

  setTimeout(() => {
    updateSceneTitleButtonEl.textContent =
      "Обновить название сцены";
  }, 1200);
}

export function saveHotspotPosition(
  hotspotId,
  position
) {
  if (!position) return;

  updateScene(scene => {
    const hotspot = scene.hotspots?.find(
      item => item.id === hotspotId
    );

    if (!hotspot) return;

    hotspot.yaw = Number(position.yaw.toFixed(1));
    hotspot.pitch = Number(position.pitch.toFixed(1));
  });

  selectedHotspotId = hotspotId;

  renderHotspotList();
  renderDirtyState();

  if (sceneChangedCallback) {
    sceneChangedCallback(getEditableScene());
  }
}

function renderInspector() {
  if (
    !inspectorTitleEl ||
    !sceneInspectorEl ||
    !hotspotInspectorEl ||
    !routeGateInspectorEl
  ) {
    return;
  }

  const hasHotspot =
    Boolean(
      selectedHotspotId
    );

  const hasRouteGate =
    Boolean(
      selectedRouteGate
    );

  if (hasRouteGate) {
    inspectorTitleEl.textContent =
      `Route Gate — ${selectedRouteGate.edgeId}`;

    sceneInspectorEl.hidden =
      true;

    hotspotInspectorEl.hidden =
      true;

    routeGateInspectorEl.hidden =
      false;

    return;
  }

  if (hasHotspot) {
    inspectorTitleEl.textContent =
      "Hotspot";

    sceneInspectorEl.hidden =
      true;

    hotspotInspectorEl.hidden =
      false;

    routeGateInspectorEl.hidden =
      true;

    return;
  }

  inspectorTitleEl.textContent =
    "Scene";

  sceneInspectorEl.hidden =
    false;

  hotspotInspectorEl.hidden =
    true;

  routeGateInspectorEl.hidden =
    true;
}

export function selectRouteGate(
  edgeId,
  panoramaId
) {
  const side =
    getRouteGateSide(
      edgeId,
      panoramaId
    );

  if (!side) {
    console.warn(
      `Route Gate не найден: ${edgeId} / ${panoramaId}`
    );

    return;
  }

  selectedHotspotId = null;

  selectedRouteGate = {
    edgeId,
    panoramaId
  };

  routeGateYawInputEl.value =
    side.yaw ?? 0;

  routeGatePitchInputEl.value =
    side.pitch ?? 0;

  routeGateDistanceInputEl.value =
    side.distance ?? 250;

  routeGateWidthInputEl.value =
    side.gateWidth ?? 120;

  routeGateRotationInputEl.value =
    side.gateRotation ?? 0;

  renderInspector();
}

function getRouteGateSide(
  edgeId,
  panoramaId
) {
  const scene =
    getEditableScene();

  const edge =
    scene?.graph?.edges?.[
      edgeId
    ];

  if (!edge) {
    return null;
  }

  if (
    edge.from?.panorama ===
    panoramaId
  ) {
    return edge.from;
  }

  if (
    edge.to?.panorama ===
    panoramaId
  ) {
    return edge.to;
  }

  return null;
}

function updateSelectedRouteGate() {
  if (!selectedRouteGate) {
    return;
  }

  const {
    edgeId,
    panoramaId
  } = selectedRouteGate;

  updateScene(scene => {
    const edge =
      scene.graph?.edges?.[
        edgeId
      ];

    if (!edge) return;

    let side = null;

    if (
      edge.from?.panorama ===
      panoramaId
    ) {
      side = edge.from;
    }

    if (
      edge.to?.panorama ===
      panoramaId
    ) {
      side = edge.to;
    }

    if (!side) return;

    side.yaw =
      Number(
        routeGateYawInputEl.value
      );

    side.pitch =
      Number(
        routeGatePitchInputEl.value
      );

    side.distance =
      Number(
        routeGateDistanceInputEl.value
      );

    side.gateWidth =
      Number(
        routeGateWidthInputEl.value
      );

    side.gateRotation =
      Number(
        routeGateRotationInputEl.value
      );
  });

  notifySceneChanged();
}

function setRouteGateFromView() {
  if (!selectedRouteGate) {
    return;
  }

  routeGateYawInputEl.value =
    currentView.yaw.toFixed(1);

  routeGatePitchInputEl.value =
    currentView.pitch.toFixed(1);

  updateSelectedRouteGate();
}