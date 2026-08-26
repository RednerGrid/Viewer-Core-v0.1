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

  const debug = createDebugLabel(viewer);

  debug("1 — START");

  let assets;

  try {
    debug("2 — LOADING ASSET");

    assets = await loadAssets(
      [
        `${basePath}${path}`
      ],
      {
        title: "Загрузка перехода"
      }
    );

    debug("3 — ASSET LOADED");
  } catch (error) {
    debug(
      `ERROR ASSET: ${error.name}`
    );

    console.error(error);

    return;
  }

  const video =
    document.createElement("video");

  video.muted = true;
  video.defaultMuted = true;

  video.playsInline = true;
  video.autoplay = true;
  video.preload = "auto";

  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  video.setAttribute(
    "webkit-playsinline",
    ""
  );

  video.style.position = "absolute";
  video.style.inset = "0";
  video.style.width = "100%";
  video.style.height = "100%";
  video.style.objectFit = "cover";
  video.style.zIndex = "20";

  viewer.appendChild(video);

  debug("4 — VIDEO CREATED");

  video.src = assets.urls[0];

  debug("5 — SRC ASSIGNED");

  try {
    await waitForVideo(
      video,
      status => {
        debug(status);
      }
    );
  } catch (error) {
    debug(
      `VIDEO ERROR: ${error.name}`
    );

    console.error(error);

    return;
  }

  debug(
    `7 — READY ${video.readyState}`
  );

  try {
    debug("8 — TRY PLAY");

    await video.play();

    debug("9 — PLAY OK");
  } catch (error) {
    debug(
      `PLAY BLOCKED: ${error.name}`
    );

    console.warn(
      "Autoplay blocked:",
      error.name,
      error.message
    );

    await waitForUserPlay(
      video,
      viewer,
      debug
    );
  }

  debug("10 — PLAYING");

  await new Promise(resolve => {
    video.addEventListener(
      "ended",
      resolve,
      { once: true }
    );
  });

  debug("11 — ENDED");

  video.pause();

  return {
    coversSceneChange: true,
    cleanup: () => {
      removeDebugLabel();

      assets.revoke();
    }
  };
}

function waitForVideo(
  video,
  onStatus
) {
  return new Promise(
    (resolve, reject) => {

      if (video.readyState >= 3) {
        onStatus?.(
          `6 — ALREADY READY ${video.readyState}`
        );

        resolve();
        return;
      }

      const onLoadedMetadata = () => {
        onStatus?.(
          `6A — METADATA ${video.readyState}`
        );
      };

      const onLoadedData = () => {
        onStatus?.(
          `6B — DATA ${video.readyState}`
        );
      };

      const onCanPlay = () => {
        onStatus?.(
          `6C — CANPLAY ${video.readyState}`
        );

        cleanup();
        resolve();
      };

      const onError = () => {
        const mediaError =
          video.error;

        onStatus?.(
          `ERROR VIDEO CODE ${
            mediaError?.code ?? "?"
          }`
        );

        cleanup();

        reject(
          mediaError ??
          new Error(
            "Video loading failed"
          )
        );
      };

      const cleanup = () => {
        video.removeEventListener(
          "loadedmetadata",
          onLoadedMetadata
        );

        video.removeEventListener(
          "loadeddata",
          onLoadedData
        );

        video.removeEventListener(
          "canplay",
          onCanPlay
        );

        video.removeEventListener(
          "error",
          onError
        );
      };

      video.addEventListener(
        "loadedmetadata",
        onLoadedMetadata
      );

      video.addEventListener(
        "loadeddata",
        onLoadedData
      );

      video.addEventListener(
        "canplay",
        onCanPlay
      );

      video.addEventListener(
        "error",
        onError
      );

      onStatus?.("6 — VIDEO LOAD");

      video.load();
    }
  );
}

function waitForUserPlay(
  video,
  viewer,
  debug
) {
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

    button.style.zIndex = "100001";

    button.style.padding =
      "14px 22px";

    button.style.border = "0";

    button.style.borderRadius =
      "12px";

    button.style.background =
      "rgba(20, 20, 20, 0.9)";

    button.style.color = "#fff";
    button.style.fontSize = "16px";

    viewer.appendChild(button);

    debug("WAITING FOR TAP");

    button.addEventListener(
      "click",
      async () => {
        try {
          debug("USER TAP");

          await video.play();

          debug("USER PLAY OK");

          button.remove();

          resolve();
        } catch (error) {
          debug(
            `USER PLAY ERROR: ${error.name}`
          );

          console.error(error);
        }
      }
    );
  });
}


/*
  ВРЕМЕННАЯ MOBILE DEBUG ПАНЕЛЬ
*/

let debugLabel = null;

function createDebugLabel(viewer) {
  removeDebugLabel();

  debugLabel =
    document.createElement("div");

  debugLabel.style.position = "fixed";
  debugLabel.style.left = "10px";
  debugLabel.style.top = "10px";

  debugLabel.style.zIndex = "999999";

  debugLabel.style.padding =
    "8px 10px";

  debugLabel.style.background =
    "rgba(0, 0, 0, 0.85)";

  debugLabel.style.color = "#fff";

  debugLabel.style.fontFamily =
    "monospace";

  debugLabel.style.fontSize = "12px";

  debugLabel.style.borderRadius =
    "6px";

  debugLabel.style.pointerEvents =
    "none";

  debugLabel.textContent =
    "VIDEO DEBUG";

  viewer.appendChild(debugLabel);

  return text => {
    if (!debugLabel) return;

    debugLabel.textContent = text;

    console.log(
      "[VIDEO DEBUG]",
      text
    );
  };
}

function removeDebugLabel() {
  if (debugLabel) {
    debugLabel.remove();
  }

  debugLabel = null;
}