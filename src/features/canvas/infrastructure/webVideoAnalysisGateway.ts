import type {
  VideoAnalysisGateway,
  VideoAnalyzeParams,
  VideoAnalyzeResponse,
} from '../application/ports';

export class WebVideoAnalysisGateway implements VideoAnalysisGateway {
  async analyze(params: VideoAnalyzeParams): Promise<VideoAnalyzeResponse> {
    const res = await fetch('/api/video/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoUrl: params.videoUrl,
        projectId: params.projectId,
        sensitivityThreshold: params.sensitivityThreshold,
        minSceneDurationMs: params.minSceneDurationMs,
        maxKeyframes: params.maxKeyframes,
      }),
      signal: params.signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'analyze failed' }));
      throw new Error(err.error || `analyze failed (${res.status})`);
    }
    return res.json() as Promise<VideoAnalyzeResponse>;
  }
}

export const webVideoAnalysisGateway = new WebVideoAnalysisGateway();
