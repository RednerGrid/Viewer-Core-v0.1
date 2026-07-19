import { getViewerApi } from "../core/viewerApi.js";
import { playPanoramaTransition } from "../modules/panoramaTransitionPlayer.js";

export function playTransition({
  transition,
  basePath
}) {
  if (!transition) return;

  const viewerApi = getViewerApi();

  if (!viewerApi?.setPanoramaTexture) return;

  if (transition.type === "panorama-sequence") {
    return playPanoramaTransition({
      basePath,
      ...transition,
      setTexture: viewerApi.setPanoramaTexture
    });
  }
}