let originalScene = null;
let editableScene = null;

/**
 * Начать редактирование сцены
 */
export function beginEditing(scene) {
    originalScene = scene;
    editableScene = structuredClone(scene);
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
 * Полностью заменить сцену
 */
export function setEditableScene(scene) {
    editableScene = scene;
}

/**
 * Обновить часть сцены
 */
export function updateScene(callback) {
    callback(editableScene);
}

/**
 * Отменить все изменения
 */
export function resetScene() {
    editableScene = structuredClone(originalScene);
}