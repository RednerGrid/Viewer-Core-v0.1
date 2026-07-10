import { openModule } from "./moduleManager.js";
import { fadeOut, fadeIn } from "../ui/transition.js";
import { beginEditing } from "../editor/editorState.js";

let isTransitioning = false;

export async function openScene(project, sceneId) {
  if (isTransitioning) return;

  const scene = project.scenes[sceneId];

  if (!scene) {
    console.error(`Сцена не найдена: ${sceneId}`);
    return;
  }

  isTransitioning = true;

  await fadeOut();

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

    beginEditing(scene);

  await fadeIn();

  isTransitioning = false;
}