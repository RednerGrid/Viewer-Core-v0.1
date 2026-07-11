let originalScene = null;
let editableScene = null;
let isDirty = false;

/**
 * Начать редактирование сцены
 */
export function beginEditing(scene) {
  originalScene = scene;
  editableScene = structuredClone(scene);
  isDirty = false;
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
  isDirty = true;
}

/**
 * Пометить сцену как сохранённую
 */
export function markClean() {
  isDirty = false;
}

/**
 * Полностью заменить сцену
 */
export function setEditableScene(scene) {
  editableScene = scene;
  isDirty = true;
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
  isDirty = true;
}

/**
 * Отменить все изменения
 */
export function resetScene() {
  if (!originalScene) return;

  editableScene = structuredClone(originalScene);
  isDirty = false;
}