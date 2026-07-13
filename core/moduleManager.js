let currentModule = null;

export async function loadModule(type) {
  const modules = {
    overview: () => import("../modules/overviewIdpass.js"),
    overviewParallax: () => import("../modules/overviewParallaxViewer.js"),
    panorama: () => import("../modules/panoramaViewer.js"),
    object360: () => import("../modules/object360Viewer.js"),
    scrollAnimation: () => import("../modules/scrollAnimationViewer.js"),
    video: () => import("../modules/videoViewer.js"),
    document: () => import("../modules/documentViewer.js")
  };

  if (!modules[type]) {
    throw new Error(`Неизвестный тип модуля: ${type}`);
  }

  return await modules[type]();
}

export async function openModule(context) {
  if (currentModule?.destroy) {
    currentModule.destroy();
  }

  const module = await loadModule(context.scene.type);

  currentModule = module;

  if (!module.init) {
    throw new Error(`У модуля ${context.scene.type} нет init()`);
  }

  await module.init(context);
}

export function resizeModule() {
  if (currentModule?.resize) {
    currentModule.resize();
  }
}

export function updateModule(deltaTime) {
  if (currentModule?.update) {
    currentModule.update(deltaTime);
  }
}