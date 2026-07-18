import { loadTextures } from "../services/textureLoader.js";

export async function playPanoramaSequence({
  textures,
  fps = 20,
  reverse = false,
  setTexture
}) {
  if (!Array.isArray(textures) || textures.length === 0) return;
  if (typeof setTexture !== "function") return;

  const frameDuration = 1000 / fps;
  const frames = reverse ? [...textures].reverse() : textures;

  for (const texture of frames) {
    setTexture(texture);

    await new Promise(resolve => {
      setTimeout(resolve, frameDuration);
    });
  }
}

function wait(duration) {
  return new Promise(resolve => {
    setTimeout(resolve, duration);
  });
}

export async function playPanoramaTransition({
  framePaths,
  fps = 20,
  reverse = false,
  setTexture
}) {
  const textures = await loadTextures(framePaths);

  playPanoramaSequence({
    textures,
    fps,
    reverse,
    setTexture
  });
}

function buildFramePaths({
  basePath,
  path,
  framePrefix = "frame_",
  frameCount,
  extension = "jpg",
  startFrame = 0,
  padding = 4
}) {
  const framePaths = [];

  for (let i = 0; i < frameCount; i++) {
    const frameNumber = String(startFrame + i).padStart(padding, "0");

    framePaths.push(
      `${basePath}${path}${framePrefix}${frameNumber}.${extension}`
    );
  }

  return framePaths;
}