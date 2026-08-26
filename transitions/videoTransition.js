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

  video.muted = true;
  video.defaultMuted = true;

  video.playsInline = true;
  video.autoplay = true;
  video.preload = "auto";

  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");

  video.style.position = "absolute";
  video.style.inset = "0";
  video.style.width = "100%";
  video.style.height = "100%";
  video.style.objectFit = "cover";
  video.style.zIndex = "20";

  viewer.appendChild(video);

  /*
    src задаём уже после того,
    как video настроено и находится в DOM.
  */
  video.src = assets.urls[0];

  await waitForVideo(video);

  try {
    await video.play();
  } catch (error) {
    console.warn(
      "Autoplay blocked:",
      error.name,
      error.message
    );

    await waitForUserPlay(video, viewer);
  }

  await new Promise(resolve => {
    video.addEventListener(
      "ended",
      resolve,
      { once: true }
    );
  });

  video.pause();

  return {
    coversSceneChange: true,
    cleanup: assets.revoke
  };
}

function waitForUserPlay(video, viewer) {
  return new Promise(resolve => {
    const button =
      document.createElement("button");

    button.type = "button";
    button.textContent = "Продолжить";

    button.style.position = "absolute";
    button.style.left = "50%";
    button.style.top = "50%";
    button.style.transform =
      "translate(-50%, -50%)";

    button.style.zIndex = "21";

    button.style.padding = "14px 22px";
    button.style.border = "0";
    button.style.borderRadius = "12px";

    button.style.background =
      "rgba(20, 20, 20, 0.8)";

    button.style.color = "#fff";
    button.style.fontSize = "16px";

    viewer.appendChild(button);

    button.addEventListener(
      "click",
      async () => {
        try {
          await video.play();

          button.remove();
          resolve();
        } catch (error) {
          console.error(
            "VIDEO PLAY FAILED:",
            error
          );
        }
      },
      { once: true }
    );
  });
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