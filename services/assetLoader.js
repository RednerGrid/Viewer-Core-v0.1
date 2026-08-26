import {
  showLoading,
  updateLoading,
  hideLoading
} from "../ui/loading.js";

import {
  fetchBlobWithProgress
} from "./loaders/fetchWithProgress.js";

const LOADER_DELAY = 150;

const CACHE_LIMIT_BYTES =
  300 * 1024 * 1024;

const assetCache = new Map();

let cacheSize = 0;

/*
  cache entry:

  {
    blob,
    objectUrl,
    size,
    lastUsed,
    references
  }
*/

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

  /*
    Сначала смотрим, что уже есть в cache.
  */

  const results =
    new Array(urls.length);

  const missing = [];

  urls.forEach((url, index) => {
    const cached = assetCache.get(url);

    if (cached) {
      cached.lastUsed = performance.now();
      cached.references++;

      results[index] = cached;

      loadedBytes[index] = cached.size;
      totalBytes[index] = cached.size;
    } else {
      missing.push({
        url,
        index
      });
    }
  });

  /*
    Если всё уже в cache,
    loader вообще не показываем.
  */

  if (missing.length === 0) {
    return createResult(
      urls,
      results
    );
  }

  const showTimer = setTimeout(() => {
    if (finished) return;

    loaderVisible = true;

    showLoading(title);
    renderProgress();
  }, LOADER_DELAY);

  function renderProgress() {
    if (!loaderVisible) return;

    const loaded =
      loadedBytes.reduce(
        (sum, value) => sum + value,
        0
      );

    const total =
      totalBytes.reduce(
        (sum, value) => sum + value,
        0
      );

    const progress =
      total > 0
        ? Math.min(1, loaded / total)
        : 0;

    updateLoading({
      loaded: formatBytes(loaded),

      total:
        total > 0
          ? formatBytes(total)
          : "...",

      progress
    });
  }

  try {
    await Promise.all(
      missing.map(
        async ({
          url,
          index
        }) => {
          const blob =
            await fetchBlobWithProgress(
              url,
              ({
                loaded,
                total
              }) => {
                loadedBytes[index] =
                  loaded;

                if (total > 0) {
                  totalBytes[index] =
                    total;
                }

                renderProgress();
              }
            );

          loadedBytes[index] =
            blob.size;

          if (!totalBytes[index]) {
            totalBytes[index] =
              blob.size;
          }

          const entry = {
            blob,

            objectUrl:
              URL.createObjectURL(blob),

            size: blob.size,

            lastUsed:
              performance.now(),

            references: 1
          };

          assetCache.set(
            url,
            entry
          );

          cacheSize += entry.size;

          results[index] = entry;
        }
      )
    );

    if (loaderVisible) {
      renderProgress();
    }

    enforceCacheLimit();

    return createResult(
      urls,
      results
    );
  } finally {
    finished = true;

    clearTimeout(showTimer);

    if (loaderVisible) {
      hideLoading();
    }
  }
}

function createResult(
  sourceUrls,
  entries
) {
  let released = false;

  return {
    blobs:
      entries.map(
        entry => entry.blob
      ),

    urls:
      entries.map(
        entry => entry.objectUrl
      ),

    /*
      Старые Viewer-модули уже вызывают
      assets.revoke().

      Теперь revoke означает:
      "этот consumer больше не использует asset".

      Сам Blob URL здесь НЕ уничтожаем.
      Его lifecycle контролирует cache.
    */
    revoke() {
      if (released) return;

      released = true;

      sourceUrls.forEach(url => {
        const entry =
          assetCache.get(url);

        if (!entry) return;

        entry.references = Math.max(
          0,
          entry.references - 1
        );

        entry.lastUsed =
          performance.now();
      });

      enforceCacheLimit();
    }
  };
}

function enforceCacheLimit() {
  if (cacheSize <= CACHE_LIMIT_BYTES) {
    return;
  }

  /*
    Удалять можно только assets,
    которые сейчас никто не использует.
  */

  const candidates =
    [...assetCache.entries()]
      .filter(
        ([, entry]) =>
          entry.references === 0
      )
      .sort(
        (a, b) =>
          a[1].lastUsed -
          b[1].lastUsed
      );

  for (const [url, entry] of candidates) {
    if (cacheSize <= CACHE_LIMIT_BYTES) {
      break;
    }

    URL.revokeObjectURL(
      entry.objectUrl
    );

    assetCache.delete(url);

    cacheSize -= entry.size;
  }
}

export function clearAssetCache() {
  for (
    const entry
    of assetCache.values()
  ) {
    URL.revokeObjectURL(
      entry.objectUrl
    );
  }

  assetCache.clear();

  cacheSize = 0;
}

export function getAssetCacheInfo() {
  return {
    entries: assetCache.size,
    bytes: cacheSize,
    megabytes:
      cacheSize / 1024 / 1024
  };
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) {
    return "0 MB";
  }

  return `${
    (bytes / 1024 / 1024).toFixed(1)
  } MB`;
}