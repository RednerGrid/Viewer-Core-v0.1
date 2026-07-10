import fs from "node:fs";
import path from "node:path";

const projectId = process.argv[2];

if (!projectId) {
  console.error(
    "Не указан проект.\nПример: node tools/buildProject.js house"
  );
  process.exit(1);
}

const ROOT_DIR = process.cwd();
const PROJECT_DIR = path.join(ROOT_DIR, "projects", projectId);
const ASSETS_DIR = path.join(PROJECT_DIR, "assets");
const OUTPUT_FILE = path.join(PROJECT_DIR, "asset-manifest.json");
const MANIFEST_SCHEMA_VERSION = 2;
const BUILDER_VERSION = "0.3.0";

const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif"
]);

const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".webm"
]);

const DOCUMENT_EXTENSIONS = new Set([
  ".pdf"
]);

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

function scanDirectory(directory, baseDirectory = directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  const files = [];

  const entries = fs.readdirSync(directory, {
    withFileTypes: true
  });

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...scanDirectory(absolutePath, baseDirectory));
      continue;
    }

    const stats = fs.statSync(absolutePath);

    files.push({
      name: entry.name,
      path: normalizePath(
        path.relative(baseDirectory, absolutePath)
      ),
      extension: path.extname(entry.name).toLowerCase(),
      size: stats.size
    });
  }

  return files;
}

function getSequenceInfo(sequencePath) {
  const parts = sequencePath
    .split("/")
    .filter(Boolean);

  const rootFolder = parts[0];
  const sequenceId = parts[1];

  const typeMap = {
    object360: "object360",
    animations: "animation",
    "animated-panoramas": "animatedPanorama"
  };

  return {
    id: sequenceId || "unknown",
    type: typeMap[rootFolder] || "unknown"
  };
}

function detectSequences(files) {
  const groups = new Map();

  for (const file of files) {
    if (!IMAGE_EXTENSIONS.has(file.extension)) {
      continue;
    }

    const match = file.name.match(/^(.*?)(\d+)(\.[^.]+)$/);

    if (!match) {
      continue;
    }

    const [, prefix, numberText, extension] = match;
    const directory = path.posix.dirname(file.path);

    const key = [
      directory,
      prefix,
      extension.toLowerCase()
    ].join("|");

    if (!groups.has(key)) {
      groups.set(key, {
        path: directory === "." ? "" : `${directory}/`,
        filePrefix: prefix,
        fileExtension: extension.slice(1).toLowerCase(),
        padding: numberText.length,
        frames: []
      });
    }

    groups.get(key).frames.push({
      file,
      number: Number(numberText)
    });
  }

  const sequences = [];

  for (const group of groups.values()) {
    if (group.frames.length < 2) {
      continue;
    }

    group.frames.sort((a, b) => a.number - b.number);

    const first = group.frames[0];
    const last = group.frames.at(-1);

    const missingFrames = [];

    for (
      let frame = first.number;
      frame <= last.number;
      frame++
    ) {
      const exists = group.frames.some(
        item => item.number === frame
      );

      if (!exists) {
        missingFrames.push(frame);
      }
    }

    const sequenceInfo = getSequenceInfo(group.path);

    sequences.push({
      id: sequenceInfo.id,
      key: `${sequenceInfo.type}:${sequenceInfo.id}`,
      type: sequenceInfo.type,

      path: group.path,
      filePrefix: group.filePrefix,
      fileExtension: group.fileExtension,
      padding: group.padding,

      frameCount: group.frames.length,
      firstFrameNumber: first.number,
      lastFrameNumber: last.number,
      firstFrame: first.file.name,
      lastFrame: last.file.name,

      missingFrames
    });
  }

  return sequences;
}

function validateProject() {
  if (!fs.existsSync(PROJECT_DIR)) {
    throw new Error(
      `Проект "${projectId}" не найден:\n${PROJECT_DIR}`
    );
  }

  if (!fs.existsSync(ASSETS_DIR)) {
    throw new Error(
      `Папка assets не найдена:\n${ASSETS_DIR}`
    );
  }
}

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`JSON-файл не найден:\n${filePath}`);
  }

  try {
    return JSON.parse(
      fs.readFileSync(filePath, "utf8")
    );
  } catch (error) {
    throw new Error(
      `Не удалось прочитать JSON:\n${filePath}\n${error.message}`
    );
  }
}

function writeJsonAtomic(filePath, data) {
  const temporaryPath = `${filePath}.tmp`;

  fs.writeFileSync(
    temporaryPath,
    JSON.stringify(data, null, 2) + "\n",
    "utf8"
  );

  fs.renameSync(temporaryPath, filePath);
}

function createSceneIdFromPanoramaPath(filePath) {
  const relativePath = filePath
    .replace(/^panoramas\//, "")
    .replace(/\.[^.]+$/, "");

  const parts = relativePath.split("/");

  const normalizedParts = parts.map(part => {
    const normalized = part
      .toLowerCase()
      .trim()
      .replace(/[\s-]+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

    if (!normalized) {
      throw new Error(
        `Невозможно создать ID сцены из имени:\n${filePath}\n` +
        `Используй латиницу, цифры и подчёркивания.`
      );
    }

    return normalized;
  });

  /*
    Пример:
    panoramas/floor_1/hall.jpg
    →
    floor_1__hall
  */
  return normalizedParts.join("__");
}

function createTitleFromSceneId(sceneId) {
  const title = sceneId
    .replace(/__/g, " — ")
    .replace(/_/g, " ");

  return title.charAt(0).toUpperCase() + title.slice(1);
}

function createPanoramaScene(sceneId, panoramaPath) {
  return {
    id: sceneId,
    title: createTitleFromSceneId(sceneId),
    type: "panorama",

    view: {
      yaw: 0,
      pitch: 0,
      fov: 50
    },

    assets: {
      image: `assets/${panoramaPath}`
    },

    hotspots: [],
    actions: []
  };
}

function syncPanoramaScenes(files) {
  const projectPath = path.join(
    PROJECT_DIR,
    "project.json"
  );

  const scenesDirectory = path.join(
    PROJECT_DIR,
    "scenes"
  );

  fs.mkdirSync(scenesDirectory, {
    recursive: true
  });

  const project = readJsonFile(projectPath);

  if (!Array.isArray(project.scenes)) {
    throw new Error(
      'Поле "scenes" в project.json должно быть массивом.'
    );
  }

  const panoramaFiles = files.filter(file => {
    return (
      IMAGE_EXTENSIONS.has(file.extension) &&
      file.path.startsWith("panoramas/")
    );
  });

  const existingProjectScenes = new Set(
    project.scenes
  );

  const detectedSceneIds = new Set();

  const createdScenes = [];
  const registeredScenes = [];
  const existingScenes = [];

  let projectChanged = false;

  for (const panoramaFile of panoramaFiles) {
    const sceneId = createSceneIdFromPanoramaPath(
      panoramaFile.path
    );

    if (detectedSceneIds.has(sceneId)) {
      throw new Error(
        `Две панорамы получили одинаковый ID сцены: "${sceneId}".`
      );
    }

    detectedSceneIds.add(sceneId);

    const scenePath = path.join(
      scenesDirectory,
      `${sceneId}.json`
    );

    if (!fs.existsSync(scenePath)) {
      const scene = createPanoramaScene(
        sceneId,
        panoramaFile.path
      );

      writeJsonAtomic(scenePath, scene);
      createdScenes.push(sceneId);
    } else {
      existingScenes.push(sceneId);
    }

    /*
      Если JSON сцены уже существует,
      но сцена забыта в project.json,
      Builder добавит её в список.
    */
    if (!existingProjectScenes.has(sceneId)) {
      project.scenes.push(sceneId);
      existingProjectScenes.add(sceneId);

      registeredScenes.push(sceneId);
      projectChanged = true;
    }
  }

  if (projectChanged) {
    writeJsonAtomic(projectPath, project);
  }

  validatePanoramaAssets(
    project,
    panoramaFiles,
    scenesDirectory
  );

  return {
    found: panoramaFiles.length,
    createdScenes,
    registeredScenes,
    existingScenes
  };
}

function validatePanoramaAssets(
  project,
  panoramaFiles,
  scenesDirectory
) {
  const availablePanoramas = new Set(
    panoramaFiles.map(file => `assets/${file.path}`)
  );

  for (const sceneId of project.scenes) {
    const scenePath = path.join(
      scenesDirectory,
      `${sceneId}.json`
    );

    if (!fs.existsSync(scenePath)) {
      console.warn(
        `\nСцена "${sceneId}" указана в project.json, ` +
        `но файл сцены отсутствует.`
      );

      continue;
    }

    let scene;

    try {
      scene = readJsonFile(scenePath);
    } catch (error) {
      console.warn(`\n${error.message}`);
      continue;
    }

    if (scene.type !== "panorama") {
      continue;
    }

    const imagePath = scene.assets?.image;

    if (!imagePath) {
      console.warn(
        `\nВ панорамной сцене "${sceneId}" ` +
        `не указан assets.image.`
      );

      continue;
    }

    if (!availablePanoramas.has(imagePath)) {
      console.warn(
        `\nПанорама сцены "${sceneId}" не найдена:\n${imagePath}\n` +
        `Сцена сохранена и не была удалена.`
      );
    }
  }
}

function buildManifest() {
  validateProject();

  const files = scanDirectory(ASSETS_DIR);
  const panoramaSync = syncPanoramaScenes(files);

  const manifest = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    builderVersion: BUILDER_VERSION,
    projectId,
    generatedAt: new Date().toISOString(),

    images: files
      .filter(file => IMAGE_EXTENSIONS.has(file.extension))
      .map(file => ({
        path: file.path,
        size: file.size
      })),

    videos: files
      .filter(file => VIDEO_EXTENSIONS.has(file.extension))
      .map(file => ({
        path: file.path,
        size: file.size
      })),

    documents: files
      .filter(file => DOCUMENT_EXTENSIONS.has(file.extension))
      .map(file => ({
        path: file.path,
        size: file.size
      })),

    sequences: detectSequences(files)
  };

  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(manifest, null, 2),
    "utf8"
  );

  console.log("\nProject Builder завершил работу.");
  console.log(`Проект: ${projectId}`);
  console.log(`Изображений: ${manifest.images.length}`);
  console.log(`Секвенций: ${manifest.sequences.length}`);
  console.log(`Видео: ${manifest.videos.length}`);
  console.log(`Документов: ${manifest.documents.length}`);
  console.log(`\nСоздан файл:\n${OUTPUT_FILE}`);

  console.log("\nПанорамные сцены:");
console.log(`Найдено панорам: ${panoramaSync.found}`);
console.log(
  `Создано новых сцен: ${panoramaSync.createdScenes.length}`
);
console.log(
  `Добавлено в project.json: ${panoramaSync.registeredScenes.length}`
);

if (panoramaSync.createdScenes.length > 0) {
  console.log(
    `Новые сцены: ${panoramaSync.createdScenes.join(", ")}`
  );
}

  for (const sequence of manifest.sequences) {
    if (sequence.missingFrames.length > 0) {
      console.warn(
        `\nВ секвенции ${sequence.path}${sequence.filePrefix}* ` +
        `пропущены кадры: ${sequence.missingFrames.join(", ")}`
      );
    }
  }
}

try {
  buildManifest();
} catch (error) {
  console.error(`\nОшибка Project Builder:\n${error.message}`);
  process.exit(1);
}