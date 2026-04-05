'use client';

import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { Copy, FileText, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { UiButton, UiIconButton, UiPanel } from '@/components/ui';
import { useDialogTransition } from '@/components/ui/useDialogTransition';
import { UI_DIALOG_TRANSITION_MS, UI_CONTENT_OVERLAY_INSET_CLASS } from '@/components/ui/motion';
import { canvasLlmAnalysisGateway } from '@/features/canvas/application/canvasServices';
import type { ShotAnalysisResult } from '@/features/canvas/application/ports';

interface ShotAnalysisDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  additionalFrameUrls?: string[];
}

type AnalysisState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; result: ShotAnalysisResult }
  | { status: 'error'; message: string };

export const ShotAnalysisDialog = memo(({
  isOpen,
  onClose,
  imageUrl,
  additionalFrameUrls,
}: ShotAnalysisDialogProps) => {
  const { t, i18n } = useTranslation();
  const [state, setState] = useState<AnalysisState>({ status: 'idle' });
  const [copyFeedback, setCopyFeedback] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { shouldRender, isVisible } = useDialogTransition(isOpen, UI_DIALOG_TRANSITION_MS);
  const abortRef = useRef<AbortController | null>(null);

  const startAnalysis = useCallback(async () => {
    if (!imageUrl) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState({ status: 'loading' });

    try {
      const language = i18n.language?.startsWith('zh') ? 'zh' as const : 'en' as const;
      const result = await canvasLlmAnalysisGateway.analyzeShot({
        imageUrl,
        additionalFrameUrls,
        language,
      });
      setState({ status: 'success', result });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('shotAnalysis.analysisFailed');
      setState({ status: 'error', message });
    }
  }, [imageUrl, additionalFrameUrls, i18n.language, t]);

  // Auto-trigger analysis when dialog opens
  const prevOpenRef = useRef(false);
  if (isOpen && !prevOpenRef.current && imageUrl) {
    prevOpenRef.current = true;
    void startAnalysis();
  }
  if (!isOpen && prevOpenRef.current) {
    prevOpenRef.current = false;
    if (state.status !== 'idle') {
      // Reset on close - but we can't call setState during render,
      // so we handle this via effect-like pattern
    }
  }

  const handleClose = useCallback(() => {
    abortRef.current?.abort();
    setState({ status: 'idle' });
    onClose();
  }, [onClose]);

  const resultText = useMemo(() => {
    if (state.status !== 'success') return '';
    const r = state.result;
    const lines = [
      `${t('shotAnalysis.shotType')}: ${r.shotType}`,
      `${t('shotAnalysis.cameraMovement')}: ${r.cameraMovement}`,
      r.movementDescription ? `  ${r.movementDescription}` : '',
      `${t('shotAnalysis.subject')}: ${r.subject}`,
      `${t('shotAnalysis.subjectAction')}: ${r.subjectAction}`,
      `${t('shotAnalysis.lighting')}: ${r.lightingType}`,
      `${t('shotAnalysis.lightingMood')}: ${r.lightingMood}`,
      `${t('shotAnalysis.colorPalette')}: ${r.colorPalette.join(', ')}`,
      `${t('shotAnalysis.mood')}: ${r.mood}`,
      `${t('shotAnalysis.composition')}: ${r.composition}`,
      '',
      `--- ${t('shotAnalysis.directorNote')} ---`,
      r.directorNote,
    ];
    return lines.filter(Boolean).join('\n');
  }, [state, t]);

  const handleCopy = useCallback(async () => {
    if (!resultText) return;
    try {
      await navigator.clipboard.writeText(resultText);
      setCopyFeedback(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopyFeedback(false), 1200);
    } catch {
      // clipboard not available
    }
  }, [resultText]);

  const handleExport = useCallback(() => {
    if (!resultText) return;
    const blob = new Blob([resultText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shot-analysis.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [resultText]);

  if (!shouldRender) return null;

  return (
    <div className={`fixed ${UI_CONTENT_OVERLAY_INSET_CLASS} z-50 flex items-center justify-center`}>
      <div
        className={`absolute inset-0 bg-black/55 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />
      <UiPanel
        className={`relative w-[520px] max-h-[85vh] overflow-hidden transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgba(15,23,42,0.15)] dark:border-[rgba(255,255,255,0.1)] px-4 py-3">
          <h2 className="text-sm font-medium text-text-dark">{t('shotAnalysis.title')}</h2>
          <UiIconButton className="h-8 w-8" onClick={handleClose}>
            <X className="h-4 w-4" />
          </UiIconButton>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-4 py-4 ui-scrollbar" style={{ maxHeight: 'calc(85vh - 120px)' }}>
          {/* Image preview */}
          {imageUrl && (
            <div className="mb-4 overflow-hidden rounded-lg border border-[rgba(15,23,42,0.15)] dark:border-[rgba(255,255,255,0.1)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={t('shotAnalysis.imagePreview')}
                className="w-full max-h-48 object-contain bg-black/5 dark:bg-white/5"
              />
            </div>
          )}

          {/* Loading state */}
          {state.status === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
              <p className="text-sm text-text-muted">{t('shotAnalysis.analyzing')}</p>
            </div>
          )}

          {/* Error state */}
          {state.status === 'error' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <p className="text-sm text-red-400">{state.message}</p>
              <UiButton variant="muted" size="sm" onClick={() => void startAnalysis()}>
                {t('shotAnalysis.retry')}
              </UiButton>
            </div>
          )}

          {/* Success state */}
          {state.status === 'success' && (
            <div className="space-y-3">
              <AnalysisRow label={t('shotAnalysis.shotType')} value={state.result.shotType}>
                <ConfidenceBadge value={state.result.shotTypeConfidence} />
              </AnalysisRow>
              <AnalysisRow
                label={t('shotAnalysis.cameraMovement')}
                value={state.result.cameraMovement}
                detail={state.result.movementDescription}
              />
              <AnalysisRow label={t('shotAnalysis.subject')} value={state.result.subject} />
              <AnalysisRow label={t('shotAnalysis.subjectAction')} value={state.result.subjectAction} />
              <AnalysisRow label={t('shotAnalysis.lighting')} value={state.result.lightingType} />
              <AnalysisRow label={t('shotAnalysis.lightingMood')} value={state.result.lightingMood} />
              <ColorPaletteRow label={t('shotAnalysis.colorPalette')} colors={state.result.colorPalette} />
              <AnalysisRow label={t('shotAnalysis.mood')} value={state.result.mood} />
              <AnalysisRow label={t('shotAnalysis.composition')} value={state.result.composition} />

              {/* Director's Note */}
              <div className="mt-4 rounded-lg border border-[rgba(15,23,42,0.15)] dark:border-[rgba(255,255,255,0.1)] p-3">
                <p className="mb-1.5 text-xs font-medium text-text-muted">{t('shotAnalysis.directorNote')}</p>
                <p className="text-sm leading-relaxed text-text-dark">{state.result.directorNote}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {state.status === 'success' && (
          <div className="flex justify-end gap-2 border-t border-[rgba(15,23,42,0.15)] dark:border-[rgba(255,255,255,0.1)] px-4 py-3">
            <UiButton
              variant="muted"
              size="sm"
              onClick={() => void handleCopy()}
              className={copyFeedback ? '!border-emerald-400/70 !bg-emerald-500/20 !text-emerald-300' : ''}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              {copyFeedback ? t('nodeToolbar.copied') : t('shotAnalysis.copy')}
            </UiButton>
            <UiButton variant="muted" size="sm" onClick={handleExport}>
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              {t('shotAnalysis.export')}
            </UiButton>
            <UiButton variant="muted" size="sm" onClick={handleClose}>
              {t('common.cancel')}
            </UiButton>
          </div>
        )}
      </UiPanel>
    </div>
  );
});

ShotAnalysisDialog.displayName = 'ShotAnalysisDialog';

/* ---- Sub-components ---- */

function AnalysisRow({
  label,
  value,
  detail,
  children,
}: {
  label: string;
  value: string;
  detail?: string;
  children?: React.ReactNode;
}) {
  if (!value) return null;
  return (
    <div className="flex gap-3 text-sm">
      <span className="w-20 shrink-0 text-right text-text-muted">{label}</span>
      <div className="flex-1">
        <span className="text-text-dark">{value}</span>
        {children}
        {detail && <p className="mt-0.5 text-xs text-text-muted">{detail}</p>}
      </div>
    </div>
  );
}

function ColorPaletteRow({ label, colors }: { label: string; colors: string[] }) {
  if (!colors || colors.length === 0) return null;
  return (
    <div className="flex gap-3 text-sm">
      <span className="w-20 shrink-0 text-right text-text-muted">{label}</span>
      <div className="flex items-center gap-1.5">
        {colors.map((color, index) => (
          <div
            key={`${color}-${index}`}
            className="h-6 w-6 rounded border border-[rgba(15,23,42,0.15)] dark:border-[rgba(255,255,255,0.1)]"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const percent = Math.round(value * 100);
  const color = value >= 0.8 ? 'text-emerald-400' : value >= 0.5 ? 'text-amber-400' : 'text-red-400';
  return (
    <span className={`ml-2 text-xs ${color}`}>
      ({percent}%)
    </span>
  );
}
