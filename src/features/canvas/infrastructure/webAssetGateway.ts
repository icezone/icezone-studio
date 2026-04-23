import type { AssetGateway, UploadVideoParams } from '../application/ports';

export class WebAssetGateway implements AssetGateway {
  async uploadVideo(
    params: UploadVideoParams
  ): Promise<{ videoUrl: string; videoFileName: string }> {
    const { file, projectId, onProgress, signal } = params;

    const signRes = await fetch('/api/assets/video-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, fileName: file.name, mimeType: file.type }),
      signal,
    });
    if (!signRes.ok) {
      const err = await signRes.json().catch(() => ({ error: 'sign failed' }));
      throw new Error(err.error || `sign failed (${signRes.status})`);
    }
    const { uploadUrl, objectPath } = (await signRes.json()) as {
      uploadUrl: string;
      objectPath: string;
    };

    await this.putWithProgress(uploadUrl, file, onProgress, signal);

    return { videoUrl: objectPath, videoFileName: file.name };
  }

  private putWithProgress(
    url: string,
    file: File,
    onProgress: ((pct: number) => void) | undefined,
    signal: AbortSignal | undefined
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) onProgress((e.loaded / e.total) * 100);
      };
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new Error(`upload ${xhr.status}`));
      xhr.onerror = () => reject(new Error('network error'));
      xhr.onabort = () => reject(new Error('aborted'));
      if (signal) signal.addEventListener('abort', () => xhr.abort());
      xhr.send(file);
    });
  }
}

export const webAssetGateway = new WebAssetGateway();
