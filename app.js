import { loadProject } from "./core/projectLoader.js";
import { openScene } from "./core/sceneRouter.js";
import { resizeModule } from "./core/moduleManager.js";
import { initFullscreen } from "./ui/fullscreen.js";

async function start() {
  const project = await loadProject("house");

  document.getElementById("projectTitle").textContent = project.title;

  initFullscreen();

  const params = new URLSearchParams(window.location.search);
  const editor = params.get("dev") === "1"
    ? await import("./editor/index.js")
    : null;
  await openScene(project, project.startScene, editor);
}

window.addEventListener("resize", () => {
  resizeModule();
});

start();