/**
 * Browser-side video derivation.
 * The Worker runtime has no ffmpeg, so the audio track and sampled frames are
 * produced here and uploaded to the private `video-derived` bucket. The server
 * pipeline then sends the audio to Sarvam STT and the frames to vision/OCR.
 */

export type DerivedFrame = { index: number; timestamp: number; blob: Blob };

export type VideoDerivation = {
  durationSeconds: number | null;
  audio: Blob | null;
  frames: DerivedFrame[];
  warnings: string[];
};

const MAX_FRAMES = 12;

function encodeWav(channel: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + channel.length * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + channel.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, channel.length * 2, true);
  let offset = 44;
  for (let i = 0; i < channel.length; i++) {
    const s = Math.max(-1, Math.min(1, channel[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

async function extractAudio(file: File): Promise<{ blob: Blob | null; duration: number | null; warning?: string }> {
  try {
    const bytes = await file.arrayBuffer();
    const Ctx: typeof AudioContext =
      (window as any).AudioContext ?? (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const decoded = await ctx.decodeAudioData(bytes.slice(0));
    await ctx.close();

    const targetRate = 16000;
    const ratio = decoded.sampleRate / targetRate;
    const outLength = Math.floor(decoded.length / ratio);
    const out = new Float32Array(outLength);
    const channels: Float32Array[] = [];
    for (let c = 0; c < decoded.numberOfChannels; c++) channels.push(decoded.getChannelData(c));
    for (let i = 0; i < outLength; i++) {
      const srcIndex = Math.floor(i * ratio);
      let sum = 0;
      for (const ch of channels) sum += ch[srcIndex] ?? 0;
      out[i] = sum / channels.length;
    }
    return { blob: encodeWav(out, targetRate), duration: decoded.duration };
  } catch {
    return { blob: null, duration: null, warning: "Audio track could not be decoded in the browser." };
  }
}

async function extractFrames(file: File): Promise<{ frames: DerivedFrame[]; duration: number | null; warning?: string }> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;

  try {
    const duration = await new Promise<number>((resolve, reject) => {
      video.onloadedmetadata = () => resolve(video.duration);
      video.onerror = () => reject(new Error("Video metadata could not be read."));
    });
    if (!Number.isFinite(duration) || duration <= 0) {
      return { frames: [], duration: null, warning: "Video duration is unavailable; frames were not sampled." };
    }

    const count = Math.max(1, Math.min(MAX_FRAMES, Math.ceil(duration / 10)));
    const canvas = document.createElement("canvas");
    const frames: DerivedFrame[] = [];

    for (let i = 0; i < count; i++) {
      const timestamp = Math.min(duration - 0.05, (duration / (count + 1)) * (i + 1));
      await new Promise<void>((resolve, reject) => {
        const onSeeked = () => {
          video.removeEventListener("seeked", onSeeked);
          resolve();
        };
        video.addEventListener("seeked", onSeeked);
        video.onerror = () => reject(new Error("Seek failed."));
        video.currentTime = timestamp;
      });

      const scale = Math.min(1, 1280 / (video.videoWidth || 1280));
      canvas.width = Math.round((video.videoWidth || 1280) * scale);
      canvas.height = Math.round((video.videoHeight || 720) * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) break;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
      if (blob) frames.push({ index: i, timestamp, blob });
    }
    return { frames, duration };
  } catch {
    return { frames: [], duration: null, warning: "Frames could not be sampled from this video." };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function deriveVideoArtifacts(file: File): Promise<VideoDerivation> {
  const warnings: string[] = [];
  const [audio, frameResult] = await Promise.all([extractAudio(file), extractFrames(file)]);
  if (audio.warning) warnings.push(audio.warning);
  if (frameResult.warning) warnings.push(frameResult.warning);
  return {
    durationSeconds: audio.duration ?? frameResult.duration,
    audio: audio.blob,
    frames: frameResult.frames,
    warnings,
  };
}
