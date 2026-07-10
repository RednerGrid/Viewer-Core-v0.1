export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Не удалось загрузить изображение: ${src}`));

    img.src = src;
  });
}

export function buildSequenceFramePath({
  basePath,
  filePrefix,
  fileExtension,
  padding,
  frameNumber
}) {
  const number = String(frameNumber).padStart(padding, "0");

  return `${basePath}${filePrefix}${number}.${fileExtension}`;
}

export async function loadSequenceProgressive({
  basePath,
  frameCount,
  firstFrameNumber = 1,
  filePrefix = "frame_",
  fileExtension = "jpg",
  padding = 4,
  startIndex = 0,
  concurrency = 6,
  onFirstFrame = null,
  onFrameLoaded = null,
  onProgress = null
}) {
  const images = new Array(frameCount).fill(null);
  const failedFrames = [];

  let loadedCount = 0;

  function getFramePath(index) {
    return buildSequenceFramePath({
      basePath,
      filePrefix,
      fileExtension,
      padding,
      frameNumber: firstFrameNumber + index
    });
  }

  async function loadFrame(index) {
    if (images[index]) {
      return images[index];
    }

    try {
      const image = await loadImage(getFramePath(index));

      images[index] = image;
      loadedCount++;

      const progressData = {
        index,
        loaded: loadedCount,
        total: frameCount,
        progress: loadedCount / frameCount,
        image
      };

      if (onFrameLoaded) {
        onFrameLoaded(progressData);
      }

      if (onProgress) {
        onProgress(progressData);
      }

      return image;
    } catch (error) {
      failedFrames.push(index);

      console.error(
        `Не удалось загрузить кадр ${index}:`,
        error
      );

      return null;
    }
  }

  // Первый кадр ждём обязательно.
  const firstImage = await loadFrame(startIndex);

  if (!firstImage) {
    throw new Error(
      `Не удалось загрузить стартовый кадр секвенции: ${startIndex}`
    );
  }

  if (onFirstFrame) {
    onFirstFrame({
      index: startIndex,
      image: firstImage,
      images
    });
  }

  /*
    Приоритет:
    стартовый кадр,
    сосед справа,
    сосед слева,
    ещё один справа,
    ещё один слева и т.д.
  */
  const queue = [];

  for (let offset = 1; offset < frameCount; offset++) {
    const forwardIndex =
      (startIndex + offset) % frameCount;

    const backwardIndex =
      (startIndex - offset + frameCount) % frameCount;

    if (!queue.includes(forwardIndex)) {
      queue.push(forwardIndex);
    }

    if (!queue.includes(backwardIndex)) {
      queue.push(backwardIndex);
    }
  }

  let queueIndex = 0;

  async function worker() {
    while (queueIndex < queue.length) {
      const index = queue[queueIndex];
      queueIndex++;

      await loadFrame(index);
    }
  }

  const workers = Array.from(
    {
      length: Math.min(concurrency, queue.length)
    },
    () => worker()
  );

  const complete = Promise.all(workers).then(() => ({
    images,
    failedFrames
  }));

  return {
    images,
    firstImage,
    complete
  };
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