let button = null;

export function initFullscreen() {
  if (button) return;

  button = document.createElement("button");
  button.className = "fullscreen-btn";
  button.textContent = "⛶";
  button.title = "Полный экран";

  button.addEventListener("click", toggleFullscreen);

  document.body.appendChild(button);

  document.addEventListener("fullscreenchange", () => {
    button.textContent = document.fullscreenElement ? "×" : "⛶";
  });
}

async function toggleFullscreen() {
  const target = document.documentElement;

  if (!document.fullscreenElement) {
    await target.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
}