import {
  loadAssets
} from "../services/assetLoader.js";

export async function playVideoTransition({
  basePath,
  path
}) {
  if (!path) return;

  const viewer =
    document.getElementById("viewer");

  if (!viewer) return;

  const assets = await loadAssets(
    [
      `${basePath}${path}`
    ],
    {
      title: "Загрузка перехода"
    }
  );

  const video =
    document.createElement("video");

  video.src = assets.urls[0];
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  video.style.position = "absolute";
  video.style.inset = "0";
  video.style.width = "100%";
  video.style.height = "100%";
  video.style.objectFit = "cover";
  video.style.zIndex = "20";

  viewer.appendChild(video);

  await waitForVideo(video);

  await video.play();

  await new Promise(resolve => {
    video.addEventListener(
      "ended",
      resolve,
      { once: true }
    );
  });

  video.pause();

  /*
    Пока НЕ revoke().
    Последний кадр должен оставаться видимым
    до закрытия текущей сцены Router'ом.
  */

  return {
    coversSceneChange: true,
    cleanup: assets.revoke
  };
}

function waitForVideo(video) {
  return new Promise((resolve, reject) => {
    if (video.readyState >= 3) {
      resolve();
      return;
    }

    video.addEventListener(
      "canplay",
      resolve,
      { once: true }
    );

    video.addEventListener(
      "error",
      reject,
      { once: true }
    );

    video.load();
  });
}