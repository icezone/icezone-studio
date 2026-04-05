import type { LlmAnalysisGateway, ShotAnalysisPayload, ShotAnalysisResult } from '../application/ports';

class WebLlmAnalysisGateway implements LlmAnalysisGateway {
  async analyzeShot(payload: ShotAnalysisPayload): Promise<ShotAnalysisResult> {
    const response = await fetch('/api/ai/shot-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: payload.imageUrl,
        additionalFrameUrls: payload.additionalFrameUrls,
        language: payload.language,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Shot analysis failed' }));
      throw new Error(errorData.error || `Shot analysis failed (${response.status})`);
    }

    return response.json();
  }
}

export const webLlmAnalysisGateway = new WebLlmAnalysisGateway();
