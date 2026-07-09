let loadingEl = null;
let loadingTextEl = null;
let loadingBarEl = null;

export function showLoading(title = "Загрузка") {
  hideLoading();

  loadingEl = document.createElement("div");
  loadingEl.className = "loading-screen";

  loadingEl.innerHTML = `
    <div class="loading-box">
      <div class="loading-title">${title}</div>
      <div class="loading-progress">
        <div class="loading-progress-bar"></div>
      </div>
      <div class="loading-text">0%</div>
    </div>
  `;

  document.body.appendChild(loadingEl);

  loadingTextEl = loadingEl.querySelector(".loading-text");
  loadingBarEl = loadingEl.querySelector(".loading-progress-bar");
}

export function updateLoading({ loaded, total, progress }) {
  if (!loadingEl) return;

  const percent = Math.round(progress * 100);

  loadingTextEl.textContent = `${loaded} / ${total} — ${percent}%`;
  loadingBarEl.style.width = `${percent}%`;
}

export function hideLoading() {
  if (loadingEl) {
    loadingEl.remove();
  }

  loadingEl = null;
  loadingTextEl = null;
  loadingBarEl = null;
}