export async function playVideoTransition({
  basePath,
  path
}) {
  if (!path) return;

  const viewer = document.getElementById("viewer");

  if (!viewer) return;

  const video = document.createElement("video");

  video.src = `${basePath}${path}`;
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

  await new Promise((resolve, reject) => {
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

  await video.play();

  await new Promise(resolve => {
    video.addEventListener(
      "ended",
      resolve,
      { once: true }
    );
  });

  video.pause();
}