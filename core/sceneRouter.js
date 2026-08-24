import { openModule } from "./moduleManager.js";
import { fadeOut, fadeIn } from "../ui/transition.js";
import { playTransition } from "../services/transitionService.js";
import { getViewerApi } from "../core/viewerApi.js";


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
  const viewerApi = getViewerApi();

  const reuseViewer =
    scene.type === "panorama" &&
    viewerApi;

  if (!reuseViewer) {
    await fadeOut();
  }

  document.getElementById("sceneTitle").textContent =
    scene.title;
      const activeScene = editor
      ? editor.beginSceneEditing(scene)
      : scene;

      const viewer = document.getElementById("viewer");

      if (!reuseViewer) {
        viewer.innerHTML = "";
      }

    /*
      Сначала создаём редактируемую копию.

      Viewer и Developer Tools должны работать
      с одним и тем же объектом сцены.
    */


    const context = {
      project,
      scene: activeScene,
      viewer,
      editor,
      openScene: async hotspot => {
        if (typeof hotspot === "string") {
          return openScene(project, hotspot, editor);
        }

    if (hotspot.transition) {
      const viewerApi = getViewerApi();

      viewerApi?.hideHotspots();

      const result = await playTransition({
        transition: hotspot.transition,
        basePath: project.basePath
      });

      if (result === "backward") {
        await viewerApi.loadScene(
          project,
          activeScene,
          context.openScene,
          { preserveView: true }
        );

        viewerApi.showHotspots();

        return;
      }
    }

    return openScene(
      project,
      hotspot.target,
      editor
    );
      }
    };

      if (reuseViewer) {
        const viewerApi = getViewerApi();

        await viewerApi.loadScene(
          project,
          activeScene,
          context.openScene,
          { preserveView: true }
        );

        viewerApi.showHotspots();
      } else {
        await openModule(context);
      }

    if (!reuseViewer) {
      await fadeIn();
    }

    await playTransition({
      transition: activeScene.transition,
      basePath: project.basePath
    });

   
  } 
  
  finally {
    isTransitioning = false;
  }
}