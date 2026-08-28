let containerEl = null;
let sliderEl = null;
let animationId = null;

let currentProgress = 0;
let targetProgress = 0;

let isPointerDown = false;
let isScrubbing = false;

let lastTime = 0;
let lastSeekTime = 0;

let inputCallback = null;

const MAX_PROGRESS_SPEED = 1.00;
const SEEK_INTERVAL = 40;

export function showRouteSlider({
  progress = 0,
  onInput
} = {}) {
  hideRouteSlider();

  currentProgress = clamp01(progress);
  targetProgress = currentProgress;

  inputCallback = onInput ?? null;

  lastTime = performance.now();
  lastSeekTime = 0;

  containerEl = document.createElement("div");
  containerEl.className = "route-slider";

  sliderEl = document.createElement("input");
  sliderEl.className = "route-slider__input";

  sliderEl.type = "range";
  sliderEl.min = "0";
  sliderEl.max = "1";
  sliderEl.step = "0.001";
  sliderEl.value = String(currentProgress);

  sliderEl.addEventListener(
    "pointerdown",
    onPointerDown
  );

  sliderEl.addEventListener(
    "pointerup",
    onPointerUp
  );

  sliderEl.addEventListener(
    "pointercancel",
    onPointerUp
  );

  sliderEl.addEventListener(
    "input",
    onSliderInput
  );

  containerEl.appendChild(sliderEl);
  document.body.appendChild(containerEl);

  animationId =
    requestAnimationFrame(animate);
}

function onPointerDown() {
  isPointerDown = true;
  isScrubbing = true;
}

function onPointerUp() {
  isPointerDown = false;

  /*
    Останавливаем маршрут там,
    где он реально находится сейчас.
  */
  targetProgress = currentProgress;
  isScrubbing = false;

  if (sliderEl) {
    sliderEl.value =
      String(currentProgress);
  }

  /*
    Гарантируем последний seek
    точно в текущую позицию.
  */
  inputCallback?.(
    currentProgress
  );
}

function onSliderInput() {
  if (!sliderEl || !isPointerDown) {
    return;
  }

  targetProgress =
    clamp01(Number(sliderEl.value));

  /*
    Thumb показывает реальное положение,
    а не мгновенное положение мыши.
  */
  sliderEl.value =
    String(currentProgress);
}

function animate(now) {
  const deltaTime = Math.min(
    0.1,
    (now - lastTime) / 1000
  );

  lastTime = now;

  if (isScrubbing && isPointerDown) {
    const difference =
      targetProgress - currentProgress;

    const maxStep =
      MAX_PROGRESS_SPEED * deltaTime;

    if (Math.abs(difference) <= maxStep) {
      currentProgress = targetProgress;
    } else {
      currentProgress +=
        Math.sign(difference) * maxStep;
    }

    if (sliderEl) {
      sliderEl.value =
        String(currentProgress);
    }

    if (
      now - lastSeekTime >= SEEK_INTERVAL
    ) {
      lastSeekTime = now;

      inputCallback?.(
        currentProgress
      );
    }
  }

  animationId =
    requestAnimationFrame(animate);
}

export function updateRouteSlider(progress) {
  /*
    Пока пользователь держит slider,
    W/S не перезаписывают его состояние.
  */
  if (isPointerDown) {
    return;
  }

  const value = clamp01(progress);

  currentProgress = value;
  targetProgress = value;

  if (sliderEl) {
    sliderEl.value =
      String(value);
  }
}

export function hideRouteSlider() {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  animationId = null;

  if (sliderEl) {
    sliderEl.removeEventListener(
      "pointerdown",
      onPointerDown
    );

    sliderEl.removeEventListener(
      "pointerup",
      onPointerUp
    );

    sliderEl.removeEventListener(
      "pointercancel",
      onPointerUp
    );

    sliderEl.removeEventListener(
      "input",
      onSliderInput
    );
  }

  if (containerEl) {
    containerEl.remove();
  }

  containerEl = null;
  sliderEl = null;

  currentProgress = 0;
  targetProgress = 0;

  isPointerDown = false;
  isScrubbing = false;

  lastTime = 0;
  lastSeekTime = 0;

  inputCallback = null;
}

function clamp01(value) {
  return Math.max(
    0,
    Math.min(
      1,
      Number(value) || 0
    )
  );
}