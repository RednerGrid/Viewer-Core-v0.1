import { openModule } from "./moduleManager.js";

export async function openScene(project, sceneId) {
  const scene = project.scenes[sceneId];

  if (!scene) {
    console.error(`Сцена не найдена: ${sceneId}`);
    return;
  }

  document.getElementById("sceneTitle").textContent = scene.title;

  const viewer = document.getElementById("viewer");
  viewer.innerHTML = "";

  const context = {
    project,
    scene,
    viewer,
    openScene: (targetId) => openScene(project, targetId)
  };

  await openModule(context);
}