import { loadMp4Samples } from "../graph/mp4Demuxer.js";
import {
  showRouteTouchControl,
  hideRouteTouchControl
} from "../ui/routeTouchControl.js";

import {
  showRouteSlider,
  updateRouteSlider,
  hideRouteSlider
} from "../ui/routeSlider.js";

const MIN_SPEED = 0.1;
const DEFAULT_FPS = 25;

export async function playRouteFrameEdge({
  project,
  edge,
  sourcePanorama,
  targetPanorama,
  setTexture,
  textureLoader,
  getViewYaw
}) {
  if (!edge?.edge) {
    throw new Error("RouteFrameEdgePlayer: edge отсутствует.");
  }

  if (!("VideoDecoder" in window)) {
    throw new Error("RouteFrameEdgePlayer: WebCodecs не поддерживается.");
  }

  const graphEdge = edge.edge;
  const isReverseEntry = edge.direction === "reverse";
  const entryViewYaw =
  Number(
    getViewYaw?.() ?? 0
  );

  const motion = graphEdge.motion;

  if (!motion?.src) {
    throw new Error(
      `RouteFrameEdgePlayer: отсутствует motion.src для edge "${edge.id}".`
    );
  }

  const videoPath = `${project.basePath}${motion.src}`;
  const sourcePanoramaPath = `${project.basePath}${sourcePanorama.image}`;
  const targetPanoramaPath = `${project.basePath}${targetPanorama.image}`;

  /*
    Панорамы.
  */

  const [
    sourceTexture,
    targetTexture
  ] = await Promise.all([
    textureLoader.loadAsync(sourcePanoramaPath),
    textureLoader.loadAsync(targetPanoramaPath)
  ]);

  /*
    All-Intra MP4.
  */

  const {
    samples,
    config
  } = await loadMp4Samples(videoPath);

  const support =
    await VideoDecoder.isConfigSupported(config);

  if (!support.supported) {
    throw new Error(
      `RouteFrameEdgePlayer: codec "${config.codec}" не поддерживается.`
    );
  }

  const frameCount = samples.length;
  const fps = Number(motion.fps ?? DEFAULT_FPS);
  const frameTime = 1000 / fps;

  /*
    Один canvas / одна texture
    на весь маршрут.
  */

  const canvas =
    document.createElement("canvas");

  canvas.width = config.codedWidth;
  canvas.height = config.codedHeight;

  const ctx =
    canvas.getContext("2d");

  const frameTexture =
    new THREE.CanvasTexture(canvas);

  frameTexture.needsUpdate = true;

  let currentFrame =
    isReverseEntry
      ? frameCount - 1
      : 0;

  let displayedFrame = -1;

  let playing = false;
  let direction = 0;
  let speed = 0;
  let keyboardDirection = 0;

  let speedAnimationId = null;
  let sliderAnimationId = null;

  let destroyed = false;
  let resolveRoute = null;

  const pendingFrames = new Map();


/*
  Decoder.
*/

const decoder =
  new VideoDecoder({
    output: frame => {
      if (destroyed) {
        frame.close();
        return;
      }

      const pending =
        pendingFrames.get(
          frame.timestamp
        );

      ctx.drawImage(
        frame,
        0,
        0,
        canvas.width,
        canvas.height
      );

      frame.close();

      frameTexture.needsUpdate = true;

      if (pending) {
        displayedFrame = pending.index;

        pendingFrames.delete(
          frame.timestamp
        );

        pending.resolve();
      }
    },

    error: error => {
      console.error(
        "RouteFrameEdgePlayer decoder:",
        error
      );
    }
  });

decoder.configure(support.config);


/*
  Decode конкретного кадра.
*/

  const showFrame =
    async index => {

      if (destroyed) return;

      index = Math.max(
        0,
        Math.min(
          frameCount - 1,
          index
        )
      );

      if (displayedFrame === index) {
        currentFrame = index;
        return;
      }

      const sample = samples[index];

      if (!sample) return;

      const timestamp =
        Math.round(
          sample.cts *
          1_000_000 /
          sample.timescale
        );

      const chunk =
        new EncodedVideoChunk({
          type:
            sample.is_sync
              ? "key"
              : "delta",

          timestamp,

          duration:
            Math.round(
              sample.duration *
              1_000_000 /
              sample.timescale
            ),

          data:
            sample.data
        });

      currentFrame = index;

      await new Promise(resolve => {
        pendingFrames.set(
          timestamp,
          {
            index,
            resolve
          }
        );

        decoder.decode(chunk);
      });
    };


  /*
    Первый кадр.
  */

  await showFrame(currentFrame);

  setTexture(
    frameTexture,
    {
      disposePrevious: false
    }
  );


  /*
    Route progress всегда:
    source = 0
    target = 1

    Независимо от физического
    направления файла.
  */

  const getRouteProgress = () => {
    if (frameCount <= 1) return 0;

    const fileProgress =
      currentFrame /
      (frameCount - 1);

    return isReverseEntry
      ? 1 - fileProgress
      : fileProgress;
  };


  const progressToFrame =
    progress => {

      const fileProgress =
        isReverseEntry
          ? 1 - progress
          : progress;

      return Math.round(
        fileProgress *
        (frameCount - 1)
      );
    };


  /*
    Направление относительно
    текущего маршрута.

    +1 = к targetPanorama
    -1 = обратно к sourcePanorama
  */

  const routeDirectionToFrameDirection =
    routeDirection => {

      return isReverseEntry
        ? -routeDirection
        : routeDirection;
    };


  /*
    Скорость.
  */

  const animateSpeed =
    (
      targetSpeed,
      duration,
      onComplete = null
    ) => {

      if (speedAnimationId) {
        cancelAnimationFrame(
          speedAnimationId
        );
      }

      const startSpeed = speed;
      const startTime = performance.now();

      const step = now => {
        const progress =
          Math.min(
            1,
            (now - startTime) /
            duration
          );

        const eased =
          1 -
          Math.pow(
            1 - progress,
            3
          );

        speed =
          startSpeed +
          (
            targetSpeed -
            startSpeed
          ) *
          eased;

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
    };

  const getViewDirection = () => {
    const viewYaw =
      Number(
        getViewYaw?.() ??
        entryViewYaw
      );

    const delta =
      normalizeAngle(
        viewYaw -
        entryViewYaw
      );

    return Math.abs(delta) <= 90
      ? 1
      : -1;
  };
   
    /*
    Playback loop.

    MOVE_SPEED = коэффициент
    относительно fps.
  */

  const playbackLoop = async () => {
    while (playing && !destroyed) {
      const routeDirection =
        keyboardDirection !== 0
          ? keyboardDirection * getViewDirection()
          : direction;

      const frameDirection =
        routeDirectionToFrameDirection(
          routeDirection
        );

      const nextFrame =
        currentFrame +
        frameDirection;

      if (
        nextFrame < 0 ||
        nextFrame >= frameCount
      ) {
        playing = false;

      if (routeDirection > 0) {
        finishTarget();
      } else {
        finishSource();
      }

        return;
      }

      const start =
        performance.now();

      await showFrame(
        nextFrame
      );

      const elapsed =
        performance.now() -
        start;

      const effectiveSpeed =
        Math.max(
          MIN_SPEED,
          speed
        );

      const wait =
        Math.max(
          0,
          frameTime /
            effectiveSpeed -
            elapsed
        );

      if (wait > 0) {
        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              wait
            )
        );
      }
    }
  };


  const play = (routeDirection, targetSpeed = 1) => {
    direction = routeDirection;
    speed = targetSpeed;

    if (playing) return;

    playing = true;
    playbackLoop();
  };


  const stop = () => {
    playing = false;
  };


  /*
    Slider.
  */

  showRouteSlider({
    progress:
      getRouteProgress(),

    onInput:
      async progress => {

        playing = false;

        if (speedAnimationId) {
          cancelAnimationFrame(
            speedAnimationId
          );

          speedAnimationId = null;
        }

        const frame =
          progressToFrame(
            progress
          );

        await showFrame(frame);

        setTexture(
          frameTexture,
          {
            disposePrevious: false
          }
        );
      }
  });

  showRouteTouchControl({
    onMove(direction, touchSpeed) {
      if (!direction || touchSpeed <= 0) {
        stop();
        return;
      }

      const viewDirection =
        getViewDirection();

      const inputDirection =
        direction === "forward"
          ? 1
          : -1;

      play(
        inputDirection * viewDirection,
        touchSpeed
      );
    },

    onStop() {
      stop();
    }
  });


  const updateSlider =
    () => {

      if (destroyed) return;

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
    Keyboard.
  */

  const onKeyDown = event => {
    if (event.repeat) return;

    if (event.code === "KeyW") {
      keyboardDirection = 1;
      speed = 1;

      if (!playing) {
        playing = true;
        playbackLoop();
      }
    }

    if (event.code === "KeyS") {
      keyboardDirection = -1;
      speed = 1;

      if (!playing) {
        playing = true;
        playbackLoop();
      }
    }
  };
  const onKeyUp = event => {
    if (
      event.code !== "KeyW" &&
      event.code !== "KeyS"
    ) {
      return;
    }

    keyboardDirection = 0;
    stop();
  };


  /*
    Finish.
  */

  const finishTarget = () => {
    if (destroyed) return;

    setTexture(
      targetTexture,
      {
        disposePrevious: false
      }
    );

    cleanup();

    resolveRoute?.({
      panorama:
        targetPanorama,

      direction:
        "forward"
    });
  };


  const finishSource = () => {
    if (destroyed) return;

    setTexture(
      sourceTexture,
      {
        disposePrevious: false
      }
    );

    cleanup();

    resolveRoute?.({
      panorama:
        sourcePanorama,

      direction:
        "reverse"
    });
  };


  const cleanup = () => {
    if (destroyed) return;

    destroyed = true;
    playing = false;

    window.removeEventListener(
      "keydown",
      onKeyDown
    );

    window.removeEventListener(
      "keyup",
      onKeyUp
    );

    if (speedAnimationId) {
      cancelAnimationFrame(
        speedAnimationId
      );
    }

    if (sliderAnimationId) {
      cancelAnimationFrame(
        sliderAnimationId
      );
    }

    speedAnimationId = null;
    sliderAnimationId = null;

    hideRouteSlider();
    hideRouteTouchControl();

    for (const pending of pendingFrames.values()) {
      pending.resolve();
    }

    pendingFrames.clear();

    if (
      decoder.state !==
      "closed"
    ) {
      decoder.close();
    }

    frameTexture.dispose();
  };


  window.addEventListener(
    "keydown",
    onKeyDown
  );

  window.addEventListener(
    "keyup",
    onKeyUp
  );


  return new Promise(resolve => {
    resolveRoute = resolve;
  });
}
function normalizeAngle(angle) {
  return (
    (
      (angle + 180) %
      360 +
      360
    ) %
    360
  ) - 180;
}