'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, Sparkles, ArrowDownToLine } from 'lucide-react';

import { UiButton, UiModal, UiTextArea } from '@/components/ui';
import { canvasEventBus, canvasLlmAnalysisGateway } from '@/features/canvas/application/canvasServices';
import type { ReversePromptResult, ReversePromptStyle } from '@/features/canvas/application/ports';
import { useCanvasStore } from '@/stores/canvasStore';
import { useReactFlow } from '@xyflow/react';

interface ReversePromptDialogState {
  isOpen: boolean;
  nodeId: string | null;
  imageUrl: string | null;
}

export const ReversePromptDialog = memo(() => {
  const { t } = useTranslation();
  const [dialogState, setDialogState] = useState<ReversePromptDialogState>({
    isOpen: false,
    nodeId: null,
    imageUrl: null,
  });
  const [style, setStyle] = useState<ReversePromptStyle>('generic');
  const [additionalContext, setAdditionalContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<ReversePromptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isFilled, setIsFilled] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const { getEdges, getNodes } = useReactFlow();

  // Subscribe to open event
  useEffect(() => {
    const unsubscribe = canvasEventBus.subscribe('reverse-prompt/open', (payload) => {
      setDialogState({
        isOpen: true,
        nodeId: payload.nodeId,
        imageUrl: payload.imageUrl,
      });
      setResult(null);
      setError(null);
      setAdditionalContext('');
      setIsCopied(false);
      setIsFilled(false);
    });
    return unsubscribe;
  }, []);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (fillTimerRef.current) clearTimeout(fillTimerRef.current);
    };
  }, []);

  const handleClose = useCallback(() => {
    setDialogState({ isOpen: false, nodeId: null, imageUrl: null });
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!dialogState.imageUrl) return;

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const generatedResult = await canvasLlmAnalysisGateway.reversePrompt({
        imageUrl: dialogState.imageUrl,
        style,
        additionalContext: additionalContext.trim() || undefined,
      });
      setResult(generatedResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  }, [dialogState.imageUrl, style, additionalContext]);

  const handleCopyPrompt = useCallback(async () => {
    if (!result?.prompt) return;
    try {
      await navigator.clipboard.writeText(result.prompt);
      setIsCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        setIsCopied(false);
        copyTimerRef.current = null;
      }, 1500);
    } catch {
      // clipboard API may fail in some contexts
    }
  }, [result]);

  // Find downstream connected nodes that have a prompt field
  const downstreamNodeIds = useMemo(() => {
    if (!dialogState.nodeId) return [];
    const edges = getEdges();
    return edges
      .filter((e) => e.source === dialogState.nodeId)
      .map((e) => e.target);
  }, [dialogState.nodeId, getEdges]);

  const handleFillDownstream = useCallback(() => {
    if (!result?.prompt || downstreamNodeIds.length === 0) return;
    const nodes = getNodes();
    for (const targetId of downstreamNodeIds) {
      const targetNode = nodes.find((n) => n.id === targetId);
      if (!targetNode) continue;
      const data = targetNode.data as Record<string, unknown>;
      // Only fill nodes that have a prompt-like field
      if ('prompt' in data || 'frames' in data) {
        updateNodeData(targetId, { prompt: result.prompt });
      }
    }
    setIsFilled(true);
    if (fillTimerRef.current) clearTimeout(fillTimerRef.current);
    fillTimerRef.current = setTimeout(() => {
      setIsFilled(false);
      fillTimerRef.current = null;
    }, 1500);
  }, [result, downstreamNodeIds, getNodes, updateNodeData]);

  const styleOptions: { value: ReversePromptStyle; labelKey: string }[] = [
    { value: 'generic', labelKey: 'reversePrompt.styleGeneric' },
    { value: 'chinese', labelKey: 'reversePrompt.styleChinese' },
  ];

  return (
    <UiModal
      isOpen={dialogState.isOpen}
      title={t('reversePrompt.title')}
      onClose={handleClose}
      widthClassName="w-[520px]"
      footer={
        <div className="flex w-full items-center justify-between">
          <div className="flex gap-2">
            {result && (
              <>
                <UiButton
                  size="sm"
                  variant="muted"
                  onClick={() => { void handleCopyPrompt(); }}
                  className="gap-1.5"
                >
                  {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {isCopied ? t('nodeToolbar.copied') : t('reversePrompt.copy')}
                </UiButton>
                {downstreamNodeIds.length > 0 && (
                  <UiButton
                    size="sm"
                    variant="muted"
                    onClick={handleFillDownstream}
                    className="gap-1.5"
                  >
                    {isFilled ? <Check className="h-3.5 w-3.5" /> : <ArrowDownToLine className="h-3.5 w-3.5" />}
                    {isFilled ? t('reversePrompt.filled') : t('reversePrompt.fillDownstream')}
                  </UiButton>
                )}
              </>
            )}
          </div>
          <UiButton size="sm" variant="ghost" onClick={handleClose}>
            {t('common.cancel')}
          </UiButton>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Image preview */}
        {dialogState.imageUrl && (
          <div className="flex justify-center">
            <img
              src={dialogState.imageUrl}
              alt={t('reversePrompt.imagePreview')}
              className="max-h-40 rounded-lg border border-[var(--canvas-node-border)] object-contain"
            />
          </div>
        )}

        {/* Style selector */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--canvas-node-fg)]">
            {t('reversePrompt.outputStyle')}
          </label>
          <div className="flex gap-2">
            {styleOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  style === opt.value
                    ? 'border-accent/45 bg-accent/15 text-accent'
                    : 'border-[var(--canvas-node-border)] text-[var(--canvas-node-fg-muted)] hover:bg-[var(--canvas-menu-item-hover)]'
                }`}
                onClick={() => setStyle(opt.value)}
              >
                {t(opt.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Additional context */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[var(--canvas-node-fg)]">
            {t('reversePrompt.additionalContext')}
          </label>
          <UiTextArea
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            placeholder={t('reversePrompt.contextPlaceholder')}
            rows={2}
            maxLength={500}
            className="rounded-lg text-xs"
          />
        </div>

        {/* Generate button */}
        <UiButton
          variant="primary"
          size="md"
          className="w-full gap-2"
          onClick={() => { void handleGenerate(); }}
          disabled={isGenerating || !dialogState.imageUrl}
        >
          <Sparkles className="h-4 w-4" />
          {isGenerating ? t('reversePrompt.generating') : t('reversePrompt.generate')}
        </UiButton>

        {/* Error display */}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Result display */}
        {result && (
          <div className="space-y-3">
            {/* Main prompt */}
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--canvas-node-fg)]">
                {t('reversePrompt.resultPrompt')}
              </label>
              <div className="max-h-32 overflow-y-auto rounded-lg border border-[var(--canvas-node-border)] bg-[var(--canvas-node-section-bg)] px-3 py-2 text-xs leading-relaxed text-[var(--canvas-node-fg)]">
                {result.prompt}
              </div>
            </div>

            {/* Negative prompt */}
            {result.negativePrompt && (
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--canvas-node-fg-muted)]">
                  {t('reversePrompt.negativePrompt')}
                </label>
                <div className="rounded-lg border border-[var(--canvas-node-border)] bg-[var(--canvas-node-section-bg)] px-3 py-2 text-xs text-[var(--canvas-node-fg-muted)]">
                  {result.negativePrompt}
                </div>
              </div>
            )}

            {/* Tags */}
            {result.tags && result.tags.length > 0 && (
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--canvas-node-fg-muted)]">
                  {t('reversePrompt.tags')}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {result.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[var(--canvas-node-border)] bg-[var(--canvas-badge-bg)] px-2 py-0.5 text-[10px] text-[var(--canvas-node-fg-muted)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </UiModal>
  );
});

ReversePromptDialog.displayName = 'ReversePromptDialog';
