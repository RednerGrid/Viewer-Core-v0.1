import * as MP4Box from "../libs/mp4box/dist/mp4box.all.mjs";

export async function loadMp4Samples(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`MP4 load failed: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();

  return new Promise((resolve, reject) => {
    const file = MP4Box.createFile();

    let trackInfo = null;
    let samples = [];

    file.onError = error => reject(new Error(error));

    file.onReady = info => {
      trackInfo = info.videoTracks[0];

      if (!trackInfo) {
        reject(new Error("Video track not found."));
        return;
      }

      file.setExtractionOptions(trackInfo.id, null, {
        nbSamples: trackInfo.nb_samples
      });

      file.start();
    };

    file.onSamples = (id, user, extracted) => {
      samples.push(...extracted);

      if (samples.length < trackInfo.nb_samples) return;

      const track = file.getTrackById(trackInfo.id);

      resolve({
        samples,
        config: {
          codec: trackInfo.codec,
          codedWidth: trackInfo.video.width,
          codedHeight: trackInfo.video.height,
          description: getAvcDescription(track)
        }
      });
    };

    buffer.fileStart = 0;

    file.appendBuffer(buffer);
    file.flush();
  });
}


function getAvcDescription(track) {
  const avcC =
    track.mdia?.minf?.stbl?.stsd?.entries?.[0]?.avcC;

  if (!avcC) {
    throw new Error("avcC box not found.");
  }

  const stream = new MP4Box.DataStream(
    undefined,
    0,
    MP4Box.DataStream.BIG_ENDIAN
  );

  avcC.write(stream);

  return new Uint8Array(stream.buffer, 8);
}