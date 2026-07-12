let originalScene = null;
let editableScene = null;
let isDirty = false;

const originalScenes = new Map();
const editableScenes = new Map();
const dirtySceneIds = new Set();

/**
 * Начать редактирование сцены
 */
export function beginEditing(scene) {
  originalScene = scene;

  if (!originalScenes.has(scene.id)) {
    originalScenes.set(scene.id, scene);
  }

  if (!editableScenes.has(scene.id)) {
    editableScenes.set(
      scene.id,
      structuredClone(scene)
    );
  }

  editableScene = editableScenes.get(scene.id);
  isDirty = dirtySceneIds.has(scene.id);
}

/**
 * Получить редактируемую копию
 */
export function getEditableScene() {
  return editableScene;
}

/**
 * Получить оригинальную сцену
 */
export function getOriginalScene() {
  return originalScene;
}

/**
 * Проверить, есть ли несохранённые изменения
 */
export function getIsDirty() {
  return isDirty;
}

/**
 * Пометить сцену как изменённую
 */
export function markDirty() {
  if (!editableScene) return;

  dirtySceneIds.add(editableScene.id);
  isDirty = true;
}

/**
 * Пометить сцену как сохранённую
 */
export function markClean() {
  if (!editableScene) return;

  dirtySceneIds.delete(editableScene.id);
  isDirty = false;
}

/**
 * Полностью заменить сцену
 */
export function setEditableScene(scene) {
  editableScene = scene;
  editableScenes.set(scene.id, scene);

  markDirty();
}

/**
 * Обновить часть сцены
 */
export function updateScene(callback) {
  if (!editableScene) {
    console.warn(
      "Невозможно обновить сцену: редактирование не начато."
    );

    return;
  }

  callback(editableScene);

  editableScenes.set(
    editableScene.id,
    editableScene
  );

  markDirty();
}

/**
 * Отменить все изменения текущей сцены
 */
export function resetScene() {
  if (!originalScene) return;

  editableScene = structuredClone(originalScene);

  editableScenes.set(
    originalScene.id,
    editableScene
  );

  dirtySceneIds.delete(originalScene.id);
  isDirty = false;
}