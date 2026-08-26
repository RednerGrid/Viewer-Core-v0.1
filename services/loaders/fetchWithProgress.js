export async function fetchBlobWithProgress(
  url,
  onProgress = null
) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Не удалось загрузить ассет: ${url}`
    );
  }

  const contentType =
    response.headers.get("content-type") ||
    "application/octet-stream";

  const total =
    Number(
      response.headers.get("content-length")
    ) || 0;

  if (!response.body) {
    const blob = await response.blob();

    onProgress?.({
      loaded: blob.size,
      total: blob.size,
      progress: 1
    });

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

    onProgress?.({
      loaded,
      total,
      progress:
        total > 0
          ? Math.min(1, loaded / total)
          : 0
    });
  }

  const blob = new Blob(
    chunks,
    {
      type: contentType
    }
  );

  /*
    Если сервер не прислал Content-Length,
    хотя бы на завершении получаем честные 100%.
  */
  onProgress?.({
    loaded: blob.size,
    total: total || blob.size,
    progress: 1
  });

  return blob;
}