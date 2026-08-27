import {
  loadAssets
} from "../services/assetLoader.js";

import {
  showRouteSlider,
  updateRouteSlider,
  hideRouteSlider
} from "../ui/routeSlider.js";

const MOVE_SPEED = 1;
const START_SPEED = 1;

const ACCELERATION_TIME = 300;
const DECELERATION_TIME = 180;

  let speedAnimationId = null;

export async function playPanoramaVideoTransition({
  basePath,
  path,
  reversePath,
  setTexture
}) {
  if (!path || !reversePath) return;
  if (typeof setTexture !== "function") return;

  const assets = await loadAssets(
    [
      `${basePath}${path}`,
      `${basePath}${reversePath}`
    ],
    {
      title: "Загрузка маршрута"
    }
  );

  const forwardVideo =
    createVideo(assets.urls[0]);

  const reverseVideo =
    createVideo(assets.urls[1]);

  await Promise.all([
    waitForVideo(forwardVideo),
    waitForVideo(reverseVideo)
  ]);

  await primeVideo(forwardVideo);
  await primeVideo(reverseVideo);

  const forwardTexture =
    new THREE.VideoTexture(forwardVideo);

  const reverseTexture =
    new THREE.VideoTexture(reverseVideo);

  forwardTexture.needsUpdate = true;
  reverseTexture.needsUpdate = true;

  let activeDirection = null;


  setTexture(forwardTexture);

  const getRouteProgress = () => {
    if (activeDirection === "reverse") {
      if (!reverseVideo.duration) return 0;

      return (
        1 -
        reverseVideo.currentTime /
          reverseVideo.duration
      );
    }

    if (!forwardVideo.duration) return 0;

    return (
      forwardVideo.currentTime /
      forwardVideo.duration
    );
  };

  showRouteSlider({
    progress: 0,

    onInput: async progress => {
      forwardVideo.pause();
      reverseVideo.pause();

      forwardVideo.currentTime =
        progress * forwardVideo.duration;

      activeDirection = "forward";

      await waitForSeek(forwardVideo);

      setTexture(forwardTexture);
    }
  });

  let sliderAnimationId = null;

  const updateSlider = () => {
    let progress = 0;

    if (activeDirection === "reverse") {
      progress =
        1 -
        reverseVideo.currentTime /
          reverseVideo.duration;
    } else {
      progress =
        forwardVideo.currentTime /
          forwardVideo.duration;
    }

    updateRouteSlider(progress);

    sliderAnimationId =
      requestAnimationFrame(updateSlider);
  };

  updateSlider();

  return new Promise(resolve => {

    const playForward = async () => {
      if (getRouteProgress() >= 0.999) {
      return;
      }
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

      forwardVideo.playbackRate = START_SPEED;
      activeDirection = "forward";

      try {
        await forwardVideo.play();

        animatePlaybackRate(
          forwardVideo,
          MOVE_SPEED,
          ACCELERATION_TIME
        );
      } catch (error) {
        console.warn(
          "Не удалось запустить видео:",
          error
        );
      }
    };

    const playReverse = async () => {
      if (getRouteProgress() <= 0.001) {
        return;
      }

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

      reverseVideo.playbackRate = START_SPEED;
      activeDirection = "reverse";

      try {
        await reverseVideo.play();

        animatePlaybackRate(
          reverseVideo,
          MOVE_SPEED,
          ACCELERATION_TIME
        );
      } catch (error) {
        console.warn(
          "Не удалось запустить reverse video:",
          error
        );
      }
    };

    const stop = () => {
      const activeVideo =
        activeDirection === "forward"
          ? forwardVideo
          : activeDirection === "reverse"
            ? reverseVideo
            : null;

      if (!activeVideo || activeVideo.paused) {
        return;
      }

      animatePlaybackRate(
        activeVideo,
        START_SPEED,
        DECELERATION_TIME,
        () => {
          activeVideo.pause();
        }
      );
    };

    const onKeyDown = event => {
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

      if (sliderAnimationId) {
        cancelAnimationFrame(sliderAnimationId);
        sliderAnimationId = null;
      }

      hideRouteSlider();

      window.removeEventListener(
        "keydown",
        onKeyDown
      );

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

      forwardTexture.dispose();
      reverseTexture.dispose();

      assets.revoke();
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

function animatePlaybackRate(
  video,
  targetRate,
  duration,
  onComplete = null
) {
  if (speedAnimationId) {
    cancelAnimationFrame(speedAnimationId);
  }

  const startRate = video.playbackRate;
  const startTime = performance.now();

  const step = now => {
    const progress = Math.min(
      1,
      (now - startTime) / duration
    );

    // плавное ease-out
    const eased =
      1 - Math.pow(1 - progress, 3);

    video.playbackRate =
      startRate +
      (targetRate - startRate) * eased;

    if (progress < 1) {
      speedAnimationId =
        requestAnimationFrame(step);

      return;
    }

    speedAnimationId = null;

    onComplete?.();
  };

  speedAnimationId =
    requestAnimationFrame(step);
}