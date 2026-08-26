let containerEl = null;
let sliderEl = null;

export function showRouteSlider({
  progress = 0,
  onInput
} = {}) {
  hideRouteSlider();

  containerEl = document.createElement("div");
  containerEl.className = "route-slider";

  sliderEl = document.createElement("input");
  sliderEl.className = "route-slider__input";
  sliderEl.type = "range";
  sliderEl.min = "0";
  sliderEl.max = "1";
  sliderEl.step = "0.001";
  sliderEl.value = String(progress);

  sliderEl.addEventListener("input", () => {
    onInput?.(Number(sliderEl.value));
  });

  containerEl.appendChild(sliderEl);
  document.body.appendChild(containerEl);
}

export function updateRouteSlider(progress) {
  if (!sliderEl) return;

  sliderEl.value = String(
    Math.max(0, Math.min(1, progress))
  );
}

export function hideRouteSlider() {
  if (containerEl) {
    containerEl.remove();
  }

  containerEl = null;
  sliderEl = null;
}