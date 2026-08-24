

export async function playPanoramaVideoTransition({
  basePath,
  path,
  reversePath,
  setTexture
}) {
    console.log("PANORAMA VIDEO", {
  path,
  reversePath
});
  if (!path || !reversePath) return;
  if (typeof setTexture !== "function") return;

  const forwardVideo = createVideo(`${basePath}${path}`);
  const reverseVideo = createVideo(`${basePath}${reversePath}`);

  await Promise.all([
    waitForVideo(forwardVideo),
    waitForVideo(reverseVideo)
  ]);

  console.log("VIDEOS READY", {
  forwardDuration: forwardVideo.duration,
  reverseDuration: reverseVideo.duration,
  forwardReadyState: forwardVideo.readyState,
  reverseReadyState: reverseVideo.readyState
});

  const forwardTexture =
    new THREE.VideoTexture(forwardVideo);

  const reverseTexture =
    new THREE.VideoTexture(reverseVideo);
  await primeVideo(forwardVideo);
  await primeVideo(reverseVideo);

  forwardTexture.needsUpdate = true;
  reverseTexture.needsUpdate = true;

  let activeDirection = null;

  setTexture(forwardTexture);

  return new Promise(resolve => {

    const playForward = async () => {
      if (
        activeDirection === "forward" &&
        !forwardVideo.paused
      ) {
        return;
      }

      reverseVideo.pause();

      if (activeDirection === "reverse") {
        const progress =
          reverseVideo.currentTime / reverseVideo.duration;

        forwardVideo.currentTime =
          (1 - progress) * forwardVideo.duration;
          await waitForSeek(forwardVideo);
      }

      setTexture(forwardTexture);

      activeDirection = "forward";

      try {
        await forwardVideo.play();
      } catch (error) {
        console.warn("Не удалось запустить видео:", error);
      }
    };

    const playReverse = async () => {
      if (
        activeDirection === "reverse" &&
        !reverseVideo.paused
      ) {
        return;
      }

      forwardVideo.pause();

    if (activeDirection === "forward") {
      const progress =
        forwardVideo.currentTime / forwardVideo.duration;

      reverseVideo.currentTime =
        (1 - progress) * reverseVideo.duration;
        await waitForSeek(reverseVideo);
    }

      setTexture(reverseTexture);

      activeDirection = "reverse";

      try {
        await reverseVideo.play();
      } catch (error) {
        console.warn(
          "Не удалось запустить reverse video:",
          error
        );
      }
    };

    const stop = () => {
      forwardVideo.pause();
      reverseVideo.pause();      
    };

    const onKeyDown = event => {
        console.log("KEY DOWN:", event.code);
      if (event.repeat) return;

      if (event.code === "KeyW") {
        playForward();
      }

      if (event.code === "KeyS") {
        playReverse();
      }
    };

    const onKeyUp = event => {
      if (
        event.code === "KeyW" ||
        event.code === "KeyS"
      ) {
        stop();
      }
    };

    const finishForward = () => {
      cleanup();
      resolve("forward");
    };

    const finishReverse = () => {
      cleanup();
      resolve("backward");
    };

    const cleanup = () => {
      stop();

      window.removeEventListener(
        "keydown",
        onKeyDown
      );

      window.removeEventListener(
        "keyup",
        onKeyUp
      );

      forwardVideo.removeEventListener(
        "ended",
        finishForward
      );

      reverseVideo.removeEventListener(
        "ended",
        finishReverse
      );

      forwardVideo.pause();
      reverseVideo.pause();
    };

    window.addEventListener(
      "keydown",
      onKeyDown
    );

    window.addEventListener(
      "keyup",
      onKeyUp
    );

    forwardVideo.addEventListener(
      "ended",
      finishForward
    );

    reverseVideo.addEventListener(
      "ended",
      finishReverse
    );
  });
}

function createVideo(src) {
  const video = document.createElement("video");

  video.src = src;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  video.load();

  return video;
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
  });
}

async function primeVideo(video) {
  try {
    await video.play();
    video.pause();
    video.currentTime = 0;
  } catch (error) {
    console.warn("Не удалось подготовить video frame:", error);
  }
}

function waitForSeek(video) {
  return new Promise(resolve => {
    if (!video.seeking) {
      resolve();
      return;
    }

    video.addEventListener(
      "seeked",
      resolve,
      { once: true }
    );
  });
}