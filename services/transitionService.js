import { getViewerApi } from "../core/viewerApi.js";
import {
  playPanoramaSequenceTransition
} from "../transitions/panoramaSequenceTransition.js";

const transitionPlayers = {
  "panorama-sequence": playPanoramaSequenceTransition
};

export function playTransition({
  transition,
  basePath
}) {
  if (!transition?.type) return;

  const player = transitionPlayers[transition.type];

  if (!player) {
    console.warn(
      `Неизвестный тип перехода: ${transition.type}`
    );

    return;
  }

  const viewerApi = getViewerApi();

  if (!viewerApi) {
    console.warn("API активного Viewer не зарегистрирован");
    return;
  }

  return player({
    basePath,
    ...transition,
    setTexture: viewerApi.setPanoramaTexture
  });
}