'use client';

import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import {
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Lock,
  Unlock,
  Trash2,
  Undo2,
  Redo2,
  Settings,
  ChevronLeft,
  LayoutTemplate,
  Save,
} from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '@/stores/canvasStore';
import { openSettingsDialog } from '@/features/settings/settingsEvents';

interface CanvasSidebarProps {
  isLocked: boolean;
  onToggleLock: () => void;
  onAddNode: (position: { x: number; y: number }) => void;
  onOpenTemplates?: () => void;
  onSaveTemplate?: () => void;
}

interface SidebarButtonProps {
  onClick: () => void;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: 'default' | 'danger' | 'active';
}

const SidebarButton = memo(({ onClick, title, disabled, children, variant = 'default' }: SidebarButtonProps) => {
  const variantClass =
    variant === 'danger'
      ? 'hover:bg-red-500/15 text-red-400'
      : variant === 'active'
        ? 'bg-accent/20 text-accent'
        : 'hover:bg-white/10 text-[#aaaaaa] hover:text-white';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${variantClass}`}
    >
      {children}
    </button>
  );
});
SidebarButton.displayName = 'SidebarButton';

const Divider = () => (
  <div className="mx-auto my-1 h-px w-7 bg-white/10" />
);

export const CanvasSidebar = memo(({ isLocked, onToggleLock, onAddNode, onOpenTemplates, onSaveTemplate }: CanvasSidebarProps) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const clearCanvas = useCanvasStore((s) => s.clearCanvas);

  const handleAddNode = useCallback(() => {
    // Open node selection menu at center of viewport
    onAddNode({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  }, [onAddNode]);

  const handleUndo = useCallback(() => { undo(); }, [undo]);
  const handleRedo = useCallback(() => { redo(); }, [redo]);
  const handleZoomIn = useCallback(() => { zoomIn(); }, [zoomIn]);
  const handleZoomOut = useCallback(() => { zoomOut(); }, [zoomOut]);
  const handleFitView = useCallback(() => { fitView({ padding: 0.2 }); }, [fitView]);
  const handleClear = useCallback(() => { clearCanvas(); }, [clearCanvas]);
  const handleSettings = useCallback(() => { openSettingsDialog(); }, []);
  const handleOpenTemplates = useCallback(() => { onOpenTemplates?.(); }, [onOpenTemplates]);
  const handleSaveTemplate = useCallback(() => { onSaveTemplate?.(); }, [onSaveTemplate]);
  const handleBackToDashboard = useCallback(() => { router.push('/dashboard'); }, [router]);

  return (
    <div className="relative z-20 flex h-full w-12 flex-col items-center gap-0.5 border-r border-white/8 bg-[#141414] py-2">
      {/* Back to dashboard */}
      <SidebarButton onClick={handleBackToDashboard} title={t('canvas.sidebar.backToDashboard')}>
        <ChevronLeft className="h-4 w-4" />
      </SidebarButton>

      <Divider />

      {/* Add node */}
      <SidebarButton onClick={handleAddNode} title={t('canvas.sidebar.addNode')} disabled={isLocked}>
        <Plus className="h-4 w-4" />
      </SidebarButton>

      {/* Templates */}
      <SidebarButton onClick={handleOpenTemplates} title={t('template.templates')}>
        <LayoutTemplate className="h-4 w-4" />
      </SidebarButton>

      {/* Save Template */}
      <SidebarButton onClick={handleSaveTemplate} title={t('template.saveAsTemplate')} disabled={isLocked}>
        <Save className="h-4 w-4" />
      </SidebarButton>

      <Divider />

      {/* Undo / Redo */}
      <SidebarButton onClick={handleUndo} title={t('canvas.sidebar.undo')} disabled={isLocked}>
        <Undo2 className="h-4 w-4" />
      </SidebarButton>
      <SidebarButton onClick={handleRedo} title={t('canvas.sidebar.redo')} disabled={isLocked}>
        <Redo2 className="h-4 w-4" />
      </SidebarButton>

      <Divider />

      {/* Zoom controls */}
      <SidebarButton onClick={handleZoomIn} title={t('canvas.sidebar.zoomIn')} disabled={isLocked}>
        <ZoomIn className="h-4 w-4" />
      </SidebarButton>
      <SidebarButton onClick={handleZoomOut} title={t('canvas.sidebar.zoomOut')} disabled={isLocked}>
        <ZoomOut className="h-4 w-4" />
      </SidebarButton>
      <SidebarButton onClick={handleFitView} title={t('canvas.sidebar.fitView')}>
        <Maximize2 className="h-4 w-4" />
      </SidebarButton>

      <Divider />

      {/* Lock */}
      <SidebarButton
        onClick={onToggleLock}
        title={isLocked ? t('canvas.sidebar.unlock') : t('canvas.sidebar.lock')}
        variant={isLocked ? 'active' : 'default'}
      >
        {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
      </SidebarButton>

      {/* Clear canvas */}
      <SidebarButton onClick={handleClear} title={t('canvas.sidebar.clearCanvas')} variant="danger" disabled={isLocked}>
        <Trash2 className="h-4 w-4" />
      </SidebarButton>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings at bottom */}
      <SidebarButton onClick={handleSettings} title={t('canvas.sidebar.settings')}>
        <Settings className="h-4 w-4" />
      </SidebarButton>
    </div>
  );
});

CanvasSidebar.displayName = 'CanvasSidebar';
