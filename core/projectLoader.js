const REQUIRED_MANIFEST_SCHEMA = 2;

export async function loadJson(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(
      `Не удалось загрузить JSON: ${path}. HTTP ${response.status}`
    );
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error(`Некорректный JSON: ${path}`);
  }
}

export async function loadProject(projectId) {
  const basePath = `projects/${projectId}/`;

  const project = await loadJson(`${basePath}project.json`);

  validateProject(project, projectId);

  let assetManifest = null;

  try {
    assetManifest = await loadJson(
      `${basePath}asset-manifest.json`
    );

    validateAssetManifest(assetManifest, projectId);
  } catch (error) {
    /*
      Если manifest существует, но устарел или повреждён,
      запуск проекта нужно остановить.

      Игнорируем только реальное отсутствие файла.
    */
    if (error.message.includes("HTTP 404")) {
      console.warn(
        `Asset manifest проекта "${projectId}" не найден.`
      );
    } else {
      throw error;
    }
  }

  const scenes = {};

  for (const sceneId of project.scenes) {
    const scene = await loadJson(
      `${basePath}scenes/${sceneId}.json`
    );

    validateScene(scene, sceneId);
    scenes[sceneId] = scene;
  }

  if (!scenes[project.startScene]) {
    throw new Error(
      `Стартовая сцена "${project.startScene}" отсутствует ` +
      `в проекте "${projectId}".`
    );
  }

  return {
    ...project,
    basePath,
    scenes,
    assetManifest
  };
}

function validateProject(project, expectedProjectId) {
  if (!project || typeof project !== "object") {
    throw new Error("project.json должен содержать объект.");
  }

  if (!project.id) {
    throw new Error('В project.json отсутствует поле "id".');
  }

  if (project.id !== expectedProjectId) {
    throw new Error(
      `ID проекта не совпадает: ожидался "${expectedProjectId}", ` +
      `получен "${project.id}".`
    );
  }

  if (!project.startScene) {
    throw new Error(
      'В project.json отсутствует поле "startScene".'
    );
  }

  if (!Array.isArray(project.scenes)) {
    throw new Error(
      'Поле "scenes" в project.json должно быть массивом.'
    );
  }

  if (project.scenes.length === 0) {
    throw new Error("В проекте нет ни одной сцены.");
  }
}

function validateAssetManifest(manifest, projectId) {
  if (!manifest || typeof manifest !== "object") {
    throw new Error(
      `asset-manifest.json проекта "${projectId}" повреждён.`
    );
  }

  if (manifest.schemaVersion !== REQUIRED_MANIFEST_SCHEMA) {
    throw new Error(
      `Устаревший asset-manifest.json проекта "${projectId}". ` +
      `Нужна схема ${REQUIRED_MANIFEST_SCHEMA}, ` +
      `обнаружена ${manifest.schemaVersion ?? "не указана"}. ` +
      `Выполни: npm run build:project -- ${projectId}`
    );
  }

  if (manifest.projectId !== projectId) {
    throw new Error(
      `Manifest принадлежит проекту "${manifest.projectId}", ` +
      `но загружается проект "${projectId}".`
    );
  }

  if (!Array.isArray(manifest.sequences)) {
    throw new Error(
      `Поле "sequences" в asset-manifest.json должно быть массивом.`
    );
  }

  const usedKeys = new Set();

  for (const sequence of manifest.sequences) {
    validateSequence(sequence, projectId);

    if (usedKeys.has(sequence.key)) {
      throw new Error(
        `В manifest найден повторяющийся ключ секвенции: ` +
        `"${sequence.key}".`
      );
    }

    usedKeys.add(sequence.key);
  }
}

function validateSequence(sequence, projectId) {
  const requiredFields = [
    "id",
    "key",
    "type",
    "path",
    "filePrefix",
    "fileExtension",
    "padding",
    "frameCount"
  ];

  for (const field of requiredFields) {
    if (
      sequence[field] === undefined ||
      sequence[field] === null ||
      sequence[field] === ""
    ) {
      throw new Error(
        `Секвенция проекта "${projectId}" не содержит поле ` +
        `"${field}". Пересобери manifest.`
      );
    }
  }

  if (!Number.isInteger(sequence.frameCount)) {
    throw new Error(
      `frameCount секвенции "${sequence.key}" должен быть целым числом.`
    );
  }

  if (sequence.frameCount < 2) {
    throw new Error(
      `В секвенции "${sequence.key}" недостаточно кадров: ` +
      `${sequence.frameCount}.`
    );
  }

  if (
    Array.isArray(sequence.missingFrames) &&
    sequence.missingFrames.length > 0
  ) {
    console.warn(
      `В секвенции "${sequence.key}" пропущены кадры:`,
      sequence.missingFrames
    );
  }
}

function validateScene(scene, expectedSceneId) {
  if (!scene || typeof scene !== "object") {
    throw new Error(
      `Сцена "${expectedSceneId}" должна содержать объект JSON.`
    );
  }

  if (scene.id !== expectedSceneId) {
    throw new Error(
      `ID сцены не совпадает: файл "${expectedSceneId}.json", ` +
      `но внутри указано "${scene.id}".`
    );
  }

  if (!scene.type) {
    throw new Error(
      `В сцене "${expectedSceneId}" отсутствует поле "type".`
    );
  }

  if (
    scene.type !== "route_graph" &&
    !scene.assets
  ) {
    throw new Error(
      `В сцене "${scene.id}" отсутствует объект "assets".`
    );
  }

  if (scene.type === "route_graph") {
    if (!scene.graph) {
      throw new Error(
        `В сцене "${scene.id}" отсутствует объект "graph".`
      );
    }

    if (!scene.graph.startNode) {
      throw new Error(
        `В сцене "${scene.id}" отсутствует "graph.startNode".`
      );
    }

    if (!scene.graph.nodes) {
      throw new Error(
        `В сцене "${scene.id}" отсутствует "graph.nodes".`
      );
    }

    if (!scene.graph.edges) {
      throw new Error(
        `В сцене "${scene.id}" отсутствует "graph.edges".`
      );
    }
  }
}