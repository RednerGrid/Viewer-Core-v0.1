import {
  beginEditing,
  getEditableScene
} from "./editorState.js";

export {
  initDeveloperTools,
  updateDeveloperView,
  destroyDeveloperTools,
  selectHotspot,
  saveHotspotPosition
} from "./developerTools.js";

export function beginSceneEditing(scene) {
  beginEditing(scene);
  return getEditableScene();
}