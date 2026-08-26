import {
  showLoading,
  updateLoading,
  hideLoading
} from "../ui/loading.js";

import {
  fetchBlobWithProgress
} from "./loaders/fetchWithProgress.js";

const LOADER_DELAY = 150;

export async function loadAssets(
  urls,
  {
    title = "Загрузка"
  } = {}
) {
  if (!Array.isArray(urls) || urls.length === 0) {
    return {
      blobs: [],
      urls: [],
      revoke() {}
    };
  }

  const loadedBytes =
    new Array(urls.length).fill(0);

  const totalBytes =
    new Array(urls.length).fill(0);

  let loaderVisible = false;
  let finished = false;

  const showTimer = setTimeout(() => {
    if (finished) return;

    loaderVisible = true;

    showLoading(title);
    renderProgress();
  }, LOADER_DELAY);

  function renderProgress() {
    if (!loaderVisible) return;

    const loaded = loadedBytes.reduce(
      (sum, value) => sum + value,
      0
    );

    const knownTotal = totalBytes.reduce(
      (sum, value) => sum + value,
      0
    );

    let progress = 0;

    if (knownTotal > 0) {
      progress = Math.min(
        1,
        loaded / knownTotal
      );
    }

    updateLoading({
      loaded: formatBytes(loaded),
      total:
        knownTotal > 0
          ? formatBytes(knownTotal)
          : "...",
      progress
    });
  }

  try {
    const blobs = await Promise.all(
      urls.map((url, index) =>
        fetchBlobWithProgress(
          url,
          ({
            loaded,
            total
          }) => {
            loadedBytes[index] = loaded;

            if (total > 0) {
              totalBytes[index] = total;
            }

            renderProgress();
          }
        )
      )
    );

    /*
      На случай отсутствующего Content-Length.
    */
    blobs.forEach((blob, index) => {
      loadedBytes[index] = blob.size;

      if (!totalBytes[index]) {
        totalBytes[index] = blob.size;
      }
    });

    if (loaderVisible) {
      renderProgress();
    }

    const objectUrls =
      blobs.map(blob =>
        URL.createObjectURL(blob)
      );

    return {
      blobs,
      urls: objectUrls,

      revoke() {
        objectUrls.forEach(url => {
          URL.revokeObjectURL(url);
        });
      }
    };
  } finally {
    finished = true;

    clearTimeout(showTimer);

    if (loaderVisible) {
      hideLoading();
    }
  }
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) {
    return "0 MB";
  }

  return `${
    (bytes / 1024 / 1024).toFixed(1)
  } MB`;
}