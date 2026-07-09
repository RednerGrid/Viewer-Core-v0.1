const CONFIG = {
  duration: 350,
  easing: "ease"
};

let transitionEl = null;

export function initTransition() {
  if (transitionEl) return;

  transitionEl = document.createElement("div");
  transitionEl.className = "transition-layer";

  transitionEl.style.transition = `opacity ${CONFIG.duration}ms ${CONFIG.easing}`;

  document.body.appendChild(transitionEl);
}

export function setTransitionConfig(options = {}) {
  if (options.duration !== undefined) {
    CONFIG.duration = options.duration;
  }

  if (options.easing !== undefined) {
    CONFIG.easing = options.easing;
  }

  if (transitionEl) {
    transitionEl.style.transition = `opacity ${CONFIG.duration}ms ${CONFIG.easing}`;
  }
}

export function fadeOut() {
  initTransition();

  return new Promise(resolve => {
    transitionEl.classList.add("active");
    setTimeout(resolve, CONFIG.duration);
  });
}

export function fadeIn() {
  initTransition();

  return new Promise(resolve => {
    transitionEl.classList.remove("active");
    setTimeout(resolve, CONFIG.duration);
  });
}