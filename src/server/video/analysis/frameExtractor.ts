/**
 * Frame extractor — pulls keyframe images from a video at given timestamps.
 *
 * Uses ffmpeg to seek to specific timestamps and extract single JPEG frames.
 */

import { type ExtractedKeyframe } from './types';

/**
 * Extract keyframe images at the given timestamps.
 *
 * @param videoPath - Local file path or HTTP URL of the video.
 * @param timestampsMs - Array of timestamps in milliseconds.
 * @returns Array of extracted keyframes with base64-encoded JPEG data.
 */
export async function extractKeyframes(
  videoPath: string,
  timestampsMs: number[]
): Promise<ExtractedKeyframe[]> {
  if (timestampsMs.length === 0) return [];

  try {
    return await extractWithFfmpeg(videoPath, timestampsMs);
  } catch {
    // Return empty array when ffmpeg is not available.
    return [];
  }
}

async function extractWithFfmpeg(
  videoPath: string,
  timestampsMs: number[]
): Promise<ExtractedKeyframe[]> {
  const ffmpeg = await import('fluent-ffmpeg').then((m) => m.default ?? m);
  const { Writable } = await import('stream');

  const results: ExtractedKeyframe[] = [];

  for (const ts of timestampsMs) {
    const seekSeconds = ts / 1000;
    try {
      const buffer = await captureFrame(ffmpeg, Writable, videoPath, seekSeconds);
      const base64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;
      results.push({ timestampMs: ts, imageData: base64 });
    } catch {
      // Skip frames that fail to extract.
    }
  }

  return results;
}

function captureFrame(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ffmpeg: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Writable: any,
  videoPath: string,
  seekSeconds: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    const writable = new Writable({
      write(chunk: Buffer, _encoding: string, callback: () => void) {
        chunks.push(chunk);
        callback();
      },
    });

    ffmpeg(videoPath)
      .seekInput(seekSeconds)
      .frames(1)
      .outputOptions('-f', 'image2pipe', '-vcodec', 'mjpeg')
      .pipe(writable);

    writable.on('finish', () => {
      if (chunks.length === 0) {
        reject(new Error(`No frame data at ${seekSeconds}s`));
        return;
      }
      resolve(Buffer.concat(chunks));
    });

    writable.on('error', reject);
  });
}
