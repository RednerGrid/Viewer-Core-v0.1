import { openModule } from "./moduleManager.js";
import { fadeOut, fadeIn } from "../ui/transition.js";
import {
  beginEditing,
  getEditableScene
} from "../editor/editorState.js";

let isTransitioning = false;

export async function openScene(project, sceneId) {
  if (isTransitioning) return;

  const scene = project.scenes[sceneId];

  if (!scene) {
    console.error(`Сцена не найдена: ${sceneId}`);
    return;
  }

  isTransitioning = true;

  try {
    await fadeOut();

    document.getElementById("sceneTitle").textContent =
      scene.title;

    const viewer = document.getElementById("viewer");
    viewer.innerHTML = "";

    /*
      Сначала создаём редактируемую копию.

      Viewer и Developer Tools должны работать
      с одним и тем же объектом сцены.
    */
    beginEditing(scene);

    const editableScene = getEditableScene();

    const context = {
      project,
      scene: editableScene,
      viewer,
      openScene: targetId =>
        openScene(project, targetId)
    };

    await openModule(context);
    await fadeIn();
  } finally {
    isTransitioning = false;
  }
}