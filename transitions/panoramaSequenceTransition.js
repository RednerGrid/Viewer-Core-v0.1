import { loadTextures } from "../services/textureLoader.js";

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

async function playPanoramaSequence({
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

export async function playPanoramaSequenceTransition({
  basePath,
  path,
  framePrefix = "frame_",
  frameCount,
  extension = "jpg",
  startFrame = 0,
  padding = 4,
  fps = 20,
  reverse = false,
  setTexture
}) {
  const framePaths = buildFramePaths({
    basePath,
    path,
    framePrefix,
    frameCount,
    extension,
    startFrame,
    padding
  });

  const textures = await loadTextures(framePaths);

  return playPanoramaSequence({
    textures,
    fps,
    reverse,
    setTexture
  });
}
