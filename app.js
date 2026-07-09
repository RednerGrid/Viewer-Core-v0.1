import { loadProject } from "./core/projectLoader.js";
import { openScene } from "./core/sceneRouter.js";
import { resizeModule } from "./core/moduleManager.js";
import { initFullscreen } from "./ui/fullscreen.js";

async function start() {
  const project = await loadProject("house");

  document.getElementById("projectTitle").textContent = project.title;

  initFullscreen();

  await openScene(project, project.startScene);
}

window.addEventListener("resize", () => {
  resizeModule();
});

start();