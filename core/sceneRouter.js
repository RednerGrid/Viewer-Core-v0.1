import { openModule } from "./moduleManager.js";
import { fadeOut, fadeIn } from "../ui/transition.js";
import { playTransition } from "../services/transitionService.js";


let isTransitioning = false;

export async function openScene(project, sceneId, editor = null) {
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
    const activeScene = editor
      ? editor.beginSceneEditing(scene)
      : scene;

    const context = {
      project,
      scene: activeScene,
      viewer,
      editor,
      openScene: targetId => openScene(project, targetId, editor)
    };

    await openModule(context);

    await playTransition({
      transition: activeScene.transition,
      basePath: project.basePath
    });

    await fadeIn();
  } 
  
  finally {
    isTransitioning = false;
  }
}