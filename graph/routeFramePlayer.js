import { loadMp4Samples } from "./mp4Demuxer.js";

const DEFAULT_FPS = 25;

export class RouteFramePlayer {
  constructor() {
    this.samples = [];
    this.decoder = null;

    this.currentFrame = 0;
    this.frameCount = 0;
    this.fps = DEFAULT_FPS;

    this.playing = false;
    this.direction = 1;

    this.onFrame = null;
  }


  async load(url, {
    fps = DEFAULT_FPS,
    onFrame
  } = {}) {
    this.destroy();

    this.fps = fps;
    this.onFrame = onFrame;

    const { samples, config } =
      await loadMp4Samples(url);

    const support =
      await VideoDecoder.isConfigSupported(config);

    if (!support.supported) {
      throw new Error(
        `RouteFramePlayer: codec "${config.codec}" not supported.`
      );
    }

    this.samples = samples;
    this.frameCount = samples.length;

    this.decoder = new VideoDecoder({
      output: frame => this.handleFrame(frame),
      error: error => console.error(
        "RouteFramePlayer decoder:",
        error
      )
    });

    this.decoder.configure(support.config);

    await this.seek(0);
  }


  async seek(index) {
    if (!this.decoder || !this.samples.length) return;

    index = Math.max(
      0,
      Math.min(this.frameCount - 1, index)
    );

    const sample = this.samples[index];

    const chunk = new EncodedVideoChunk({
      type: sample.is_sync ? "key" : "delta",

      timestamp: Math.round(
        sample.cts * 1_000_000 / sample.timescale
      ),

      duration: Math.round(
        sample.duration * 1_000_000 / sample.timescale
      ),

      data: sample.data
    });

    this.decoder.decode(chunk);
    await this.decoder.flush();

    this.currentFrame = index;
  }


  async play(direction = 1) {
    if (this.playing) {
      this.direction = direction;
      return;
    }

    this.direction = direction;
    this.playing = true;

    const frameTime = 1000 / this.fps;

    while (this.playing) {
      const next =
        this.currentFrame + this.direction;

      if (
        next < 0 ||
        next >= this.frameCount
      ) {
        this.playing = false;
        break;
      }

      const start = performance.now();

      await this.seek(next);

      const elapsed =
        performance.now() - start;

      const wait =
        Math.max(0, frameTime - elapsed);

      if (wait > 0) {
        await new Promise(
          resolve => setTimeout(resolve, wait)
        );
      }
    }
  }


  playForward() {
    return this.play(1);
  }


  playBackward() {
    return this.play(-1);
  }


  stop() {
    this.playing = false;
  }


  getProgress() {
    if (this.frameCount <= 1) return 0;

    return (
      this.currentFrame /
      (this.frameCount - 1)
    );
  }


  seekProgress(progress) {
    const value =
      Math.max(0, Math.min(1, progress));

    return this.seek(
      Math.round(
        value *
        (this.frameCount - 1)
      )
    );
  }


  handleFrame(frame) {
    if (!this.onFrame) {
      frame.close();
      return;
    }

    this.onFrame(frame);
  }


  destroy() {
    this.playing = false;

    if (this.decoder) {
      this.decoder.close();
      this.decoder = null;
    }

    this.samples = [];
    this.frameCount = 0;
    this.currentFrame = 0;
    this.onFrame = null;
  }
}