export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Не удалось загрузить изображение: ${src}`));

    img.src = src;
  });
}

export async function loadFrames({
  basePath,
  frameCount,
  filePrefix = "frame_",
  fileExtension = "jpg",
  padding = 4,
  onProgress = null
}) {
  const images = [];

  for (let i = 0; i < frameCount; i++) {
    const number = String(i + 1).padStart(padding, "0");
    const src = `${basePath}${filePrefix}${number}.${fileExtension}`;

    const img = await loadImage(src);
    images.push(img);

    if (onProgress) {
      onProgress({
        loaded: i + 1,
        total: frameCount,
        progress: (i + 1) / frameCount
      });
    }
  }

  return images;
}