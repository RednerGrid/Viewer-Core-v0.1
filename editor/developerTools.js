import {
  getEditableScene,
  getIsDirty,
  markClean,
  updateScene
} from "./editorState.js";

import { exportScene } from "./exportScene.js";

let panelEl = null;
let coordinatesEl = null;
let copyButtonEl = null;
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

    return;
  }
 
  panelEl = document.createElement("div");
  panelEl.className = "developer-tools";

  panelEl.innerHTML = `
  <div class="developer-tools__title">Developer Mode</div>

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

  <div class="developer-tools__section">
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

  <div class="developer-tools__section">
    <div class="developer-tools__subtitle">
      Hotspots сцены
    </div>

    <div
      class="developer-tools__hotspot-list"
      data-dev-hotspot-list
    ></div>

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

  hotspotTitleInputEl = panelEl.querySelector("[data-dev-hotspot-title]");
  hotspotTargetSelectEl = panelEl.querySelector("[data-dev-hotspot-target]");
  hotspotListEl = panelEl.querySelector("[data-dev-hotspot-list]");

  updateHotspotButtonEl = panelEl.querySelector("[data-dev-update-hotspot]");
  deleteHotspotButtonEl = panelEl.querySelector("[data-dev-delete-hotspot]");

  dirtyStateEl = panelEl.querySelector("[data-dev-dirty-state]");
  sceneTitleInputEl = panelEl.querySelector("[data-dev-scene-title]");
  updateSceneTitleButtonEl = panelEl.querySelector("[data-dev-update-scene-title]");

  fillTargetSelect();
  renderHotspotList();
  renderDirtyState();
  renderSceneProperties();

  copyViewButtonEl.addEventListener("click", saveCurrentView);
  exportButtonEl.addEventListener("click", exportCurrentScene);
  copyButtonEl.addEventListener("click", copyCurrentHotspot);
  addHotspotButtonEl = panelEl.querySelector("[data-dev-add-hotspot]");
  addHotspotButtonEl.addEventListener("click", addCurrentHotspot);
  updateHotspotButtonEl.addEventListener("click", updateSelectedHotspot);
  deleteHotspotButtonEl.addEventListener("click", deleteSelectedHotspot);
  updateSceneTitleButtonEl.addEventListener("click", updateSceneTitle);
  
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
    copyButtonEl.removeEventListener("click", copyCurrentHotspot);
  }

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
  copyButtonEl = null;
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

  if (!Array.isArray(editableScene.hotspots)) {
    editableScene.hotspots = [];
  }

  const hotspotId = createHotspotId(
    target,
    editableScene.hotspots
  );

  const hotspot = {
    id: hotspotId,
    title,
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

  addHotspotButtonEl.textContent = "Hotspot добавлен";
  hotspotTitleInputEl.value = "";

  setTimeout(() => {
    addHotspotButtonEl.textContent =
      "Добавить hotspot в центр";
  }, 1200);

  selectedHotspotId = hotspot.id;
  highlightHotspotCallback?.(hotspot.id);

renderHotspotList();
notifySceneChanged();
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
      `${scene.title || scene.id} — ${scene.id}`;

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

  selectedHotspotId = hotspot.id;

  if (highlightHotspotCallback) {
    highlightHotspotCallback(hotspot.id);
  }

  hotspotTitleInputEl.value = hotspot.title ?? "";
  hotspotTargetSelectEl.value = hotspot.target ?? "";

  updateHotspotButtonEl.disabled = false;
  deleteHotspotButtonEl.disabled = false;

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