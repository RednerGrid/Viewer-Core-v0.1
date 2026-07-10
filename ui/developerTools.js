let panelEl = null;
let coordinatesEl = null;
let copyButtonEl = null;
let copyViewButtonEl = null;

let currentView = {
  yaw: 0,
  pitch: 0,
  fov: 50
};

export function initDeveloperTools() {
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
      data-dev-copy-view
    >
      Скопировать стартовый вид
    </button>

  `;

  document.body.appendChild(panelEl);

  coordinatesEl = {
    yaw: panelEl.querySelector("[data-dev-yaw]"),
    pitch: panelEl.querySelector("[data-dev-pitch]")
  };

  copyButtonEl = panelEl.querySelector("[data-dev-copy]");
  copyViewButtonEl = panelEl.querySelector("[data-dev-copy-view]");
  copyViewButtonEl.addEventListener("click", copyCurrentView);
  copyButtonEl.addEventListener("click", copyCurrentHotspot);
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

  if (panelEl) {
    panelEl.remove();
  }

  if (copyViewButtonEl) {
    copyViewButtonEl.removeEventListener("click", copyCurrentView);
  }

  panelEl = null;
  coordinatesEl = null;
  copyButtonEl = null;
  copyViewButtonEl = null;
  
}

async function copyCurrentView() {
  const view = {
    view: {
      yaw: Number(currentView.yaw.toFixed(1)),
      pitch: Number(currentView.pitch.toFixed(1)),
      fov: Number(currentView.fov.toFixed(1))
    }
  };

  const text = JSON.stringify(view, null, 2);

  try {
    await navigator.clipboard.writeText(text);

    copyViewButtonEl.textContent = "Скопировано";

    setTimeout(() => {
      copyViewButtonEl.textContent = "Скопировать стартовый вид";
    }, 1200);
  } catch (error) {
    console.error("Не удалось скопировать стартовый вид:", error);
  }
}