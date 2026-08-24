import { getViewerApi } from "../core/viewerApi.js";
import {
  playPanoramaSequenceTransition
} from "../transitions/panoramaSequenceTransition.js";

import {
  playPanoramaVideoTransition
} from "../transitions/panoramaVideoTransition.js";

import {
  playVideoTransition
} from "../transitions/videoTransition.js";

const transitionPlayers = {
  "panorama-sequence": playPanoramaSequenceTransition,
  "panorama-video": playPanoramaVideoTransition,
  "video": playVideoTransition
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

  return player({
    basePath,
    ...transition,
    setTexture: viewerApi?.setPanoramaTexture
  });
}