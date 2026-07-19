import { playPanoramaTransition } from "../modules/panoramaTransitionPlayer.js";

export function playTransition({
  transition,
  basePath,
  setPanoramaTexture
}) {
  if (!transition) return;

  if (transition.type === "panorama-sequence") {
    return playPanoramaTransition({
      basePath,
      ...transition,
      setTexture: setPanoramaTexture
    });
  }
}