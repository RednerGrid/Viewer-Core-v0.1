import {
  showLoading,
  updateLoading,
  hideLoading
} from "../ui/loading.js";

export async function loadVideosWithProgress(
  urls,
  {
    title = "Загрузка"
  } = {}
) {
  if (!Array.isArray(urls) || urls.length === 0) {
    return [];
  }

  showLoading(title);

  const loadedBytes = new Array(urls.length).fill(0);
  const totalBytes = new Array(urls.length).fill(0);

  const updateProgress = () => {
    const loaded = loadedBytes.reduce(
      (sum, value) => sum + value,
      0
    );

    const total = totalBytes.reduce(
      (sum, value) => sum + value,
      0
    );

    const progress =
      total > 0
        ? Math.min(1, loaded / total)
        : 0;

    updateLoading({
      loaded: formatBytes(loaded),
      total: total > 0
        ? formatBytes(total)
        : "...",
      progress
    });
  };

  try {
    const blobs = await Promise.all(
      urls.map((url, index) =>
        loadVideoBlob(
          url,
          (loaded, total) => {
            loadedBytes[index] = loaded;
            totalBytes[index] = total;

            updateProgress();
          }
        )
      )
    );

    updateLoading({
      loaded: "Готово",
      total: "",
      progress: 1
    });

    return blobs.map(blob =>
      URL.createObjectURL(blob)
    );
  } finally {
    hideLoading();
  }
}

async function loadVideoBlob(
  url,
  onProgress
) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Не удалось загрузить видео: ${url}`
    );
  }

  const total = Number(
    response.headers.get("content-length")
  ) || 0;

  if (!response.body) {
    const blob = await response.blob();

    onProgress(blob.size, blob.size);

    return blob;
  }

  const reader = response.body.getReader();

  const chunks = [];
  let loaded = 0;

  while (true) {
    const {
      done,
      value
    } = await reader.read();

    if (done) break;

    chunks.push(value);
    loaded += value.byteLength;

    onProgress(loaded, total);
  }

  const contentType =
    response.headers.get("content-type") ||
    "video/mp4";

  return new Blob(
    chunks,
    {
      type: contentType
    }
  );
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) {
    return "0 MB";
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}