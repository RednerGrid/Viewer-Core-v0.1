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

const ACCELERATION_TIME = 0;
const DECELERATION_TIME = 0;

let speedAnimationId = null;


export async function playRouteEdge({
  project,
  edge,
  sourcePanorama,
  targetPanorama,
  setTexture,
  textureLoader
}) {
  if (!edge?.edge) {
    throw new Error(
      "RouteEdgePlayer: edge отсутствует."
    );
  }

const graphEdge =
  edge.edge;

const isReverseEntry =
  edge.direction === "reverse";


/*
  Физическое направление маршрута
  относительно текущей panorama.

  forwardVideo всегда ведёт:
  sourcePanorama → targetPanorama

  reverseVideo всегда ведёт:
  targetPanorama → sourcePanorama
*/

const forwardVideoPath =
  isReverseEntry
    ? graphEdge.videos?.reverse
    : graphEdge.videos?.forward;

const reverseVideoPath =
  isReverseEntry
    ? graphEdge.videos?.forward
    : graphEdge.videos?.reverse;


if (
  !forwardVideoPath ||
  !reverseVideoPath
) {
  throw new Error(
    `RouteEdgePlayer: отсутствует video для edge "${edge.id}".`
  );
}


const forwardPath =
  `${project.basePath}${forwardVideoPath}`;

const reversePath =
  `${project.basePath}${reverseVideoPath}`;

const sourcePanoramaPath =
  `${project.basePath}${sourcePanorama.image}`;

const targetPanoramaPath =
  `${project.basePath}${targetPanorama.image}`;


  /*
    Загружаем сразу:
    forward
    reverse
    source panorama
    target panorama

    assetLoader сам использует cache.
  */

  const assets =
    await loadAssets(
      [
        forwardPath,
        reversePath,
        sourcePanoramaPath,
        targetPanoramaPath
      ],
      {
        title: "Загрузка маршрута"
      }
    );


  /*
    Панорамы готовим заранее.
  */

  const [
    sourceTexture,
    targetTexture
  ] = await Promise.all([
    textureLoader.loadAsync(
      assets.urls[2]
    ),

    textureLoader.loadAsync(
      assets.urls[3]
    )
  ]);


  /*
    Видео
  */

  const forwardVideo =
    createVideo(
      assets.urls[0]
    );

  const reverseVideo =
    createVideo(
      assets.urls[1]
    );

  await Promise.all([
    waitForVideo(forwardVideo),
    waitForVideo(reverseVideo)
  ]);

  await primeVideo(
    forwardVideo
  );

  await primeVideo(
    reverseVideo
  );


  const forwardTexture =
    new THREE.VideoTexture(
      forwardVideo
    );

  const reverseTexture =
    new THREE.VideoTexture(
      reverseVideo
    );

  forwardTexture.needsUpdate =
    true;

  reverseTexture.needsUpdate =
    true;


/*
  Route progress:
  0 = sourcePanorama
  1 = targetPanorama
*/

  let activeDirection = null;

  let sliderAnimationId = null;


  /*
    Начинаем маршрут
    в исходной точке.
  */

  forwardVideo.currentTime = 0;

  setTexture(
    forwardTexture,
    {
      disposePrevious: false
    }
  );


  const getRouteProgress = () => {
    if (
      activeDirection === "reverse"
    ) {
      if (!reverseVideo.duration) {
        return 0;
      }

      return (
        1 -
        reverseVideo.currentTime /
          reverseVideo.duration
      );
    }

    if (!forwardVideo.duration) {
      return 0;
    }

    return (
      forwardVideo.currentTime /
      forwardVideo.duration
    );
  };


  return new Promise(resolve => {

    const playForward =
      async () => {

        if (
          getRouteProgress() >=
          0.999
        ) {
          return;
        }

        if (
          activeDirection ===
            "forward" &&
          !forwardVideo.paused
        ) {
          return;
        }

        reverseVideo.pause();


        /*
          При переключении
          reverse → forward
          синхронизируем позицию.
        */

        if (
          activeDirection ===
          "reverse"
        ) {
          const progress =
            reverseVideo.currentTime /
            reverseVideo.duration;

          forwardVideo.currentTime =
            (
              1 - progress
            ) *
            forwardVideo.duration;

          await waitForSeek(
            forwardVideo
          );
        }

        setTexture(
          forwardTexture,
          {
            disposePrevious: false
          }
        );

        forwardVideo.playbackRate =
          START_SPEED;

        activeDirection =
          "forward";

        try {
          await forwardVideo.play();

          animatePlaybackRate(
            forwardVideo,
            MOVE_SPEED,
            ACCELERATION_TIME
          );
        } catch (error) {
          console.warn(
            "Route forward play failed:",
            error
          );
        }
      };


    const playReverse =
      async () => {

        if (
          getRouteProgress() <=
          0.001
        ) {
          return;
        }

        if (
          activeDirection ===
            "reverse" &&
          !reverseVideo.paused
        ) {
          return;
        }

        forwardVideo.pause();


        /*
          forward → reverse
        */

        if (
          activeDirection ===
          "forward"
        ) {
          const progress =
            forwardVideo.currentTime /
            forwardVideo.duration;

          reverseVideo.currentTime =
            (
              1 - progress
            ) *
            reverseVideo.duration;

          await waitForSeek(
            reverseVideo
          );
        }

        setTexture(
          reverseTexture,
          {
            disposePrevious: false
          }
        );

        reverseVideo.playbackRate =
          START_SPEED;

        activeDirection =
          "reverse";

        try {
          await reverseVideo.play();

          animatePlaybackRate(
            reverseVideo,
            MOVE_SPEED,
            ACCELERATION_TIME
          );
        } catch (error) {
          console.warn(
            "Route reverse play failed:",
            error
          );
        }
      };


    const stop = () => {
      const activeVideo =
        activeDirection ===
        "forward"
          ? forwardVideo
          : activeDirection ===
            "reverse"
            ? reverseVideo
            : null;

      if (
        !activeVideo ||
        activeVideo.paused
      ) {
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


    /*
      Slider
    */

    showRouteSlider({
      progress: 0,

      onInput:
        async progress => {

          forwardVideo.pause();
          reverseVideo.pause();

          forwardVideo.currentTime =
            progress *
            forwardVideo.duration;

          activeDirection =
            "forward";

          await waitForSeek(
            forwardVideo
          );

          setTexture(
            forwardTexture,
            {
              disposePrevious:
                false
            }
          );
        }
    });


    const updateSlider =
      () => {

        updateRouteSlider(
          getRouteProgress()
        );

        sliderAnimationId =
          requestAnimationFrame(
            updateSlider
          );
      };

    updateSlider();


    /*
      Keyboard
    */

    const onKeyDown =
      event => {

        if (event.repeat) {
          return;
        }

        if (
          event.code === "KeyW"
        ) {
          playForward();
        }

        if (
          event.code === "KeyS"
        ) {
          playReverse();
        }
      };


    const onKeyUp =
      event => {

        if (
          event.code === "KeyW" ||
          event.code === "KeyS"
        ) {
          stop();
        }
      };


    /*
      Концы маршрута
    */

    const finishForward = () => {
      setTexture(
        targetTexture,
        {
          disposePrevious: false
        }
      );

      console.log(
        "FINISH FORWARD",
        targetPanorama.id
      );

      cleanup();

      resolve({
        panorama:
          targetPanorama,

        direction:
          "forward"
      });
    };


    const finishReverse = () => {
      setTexture(
        sourceTexture,
        {
          disposePrevious: false
        }
      );

      console.log(
        "FINISH REVERSE",
        sourcePanorama.id
      );

      cleanup();

      resolve({
        panorama:
          sourcePanorama,

        direction:
          "reverse"
      });
    };


    const cleanup = () => {
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

      if (sliderAnimationId) {
        cancelAnimationFrame(
          sliderAnimationId
        );
      }

      sliderAnimationId =
        null;

      hideRouteSlider();

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
  const video =
    document.createElement(
      "video"
    );

  video.src = src;
  video.muted = true;
  video.defaultMuted = true;

  video.playsInline = true;
  video.preload = "auto";

  video.setAttribute(
    "playsinline",
    ""
  );

  video.setAttribute(
    "webkit-playsinline",
    ""
  );

  video.load();

  return video;
}


function waitForVideo(video) {
  return new Promise(
    (resolve, reject) => {

      if (
        video.readyState >= 3
      ) {
        resolve();
        return;
      }

      video.addEventListener(
        "canplay",
        resolve,
        {
          once: true
        }
      );

      video.addEventListener(
        "error",
        reject,
        {
          once: true
        }
      );
    }
  );
}


async function primeVideo(
  video
) {
  try {
    await video.play();

    video.pause();
    video.currentTime = 0;
  } catch (error) {
    console.warn(
      "Route video prime failed:",
      error
    );
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
      {
        once: true
      }
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
    cancelAnimationFrame(
      speedAnimationId
    );
  }

  const startRate =
    video.playbackRate;

  const startTime =
    performance.now();


  const step = now => {
    const progress =
      Math.min(
        1,
        (
          now - startTime
        ) /
        duration
      );

    const eased =
      1 -
      Math.pow(
        1 - progress,
        3
      );

    video.playbackRate =
      startRate +
      (
        targetRate -
        startRate
      ) *
      eased;

    if (progress < 1) {
      speedAnimationId =
        requestAnimationFrame(
          step
        );

      return;
    }

    speedAnimationId =
      null;

    onComplete?.();
  };


  speedAnimationId =
    requestAnimationFrame(
      step
    );
}