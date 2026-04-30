'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { subscribeOpenSettingsDialog } from './settingsEvents';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { KeyManager } from './KeyManager/KeyManager';
import { ScenarioDefaults } from './ScenarioDefaults';
import { ModelPreferences } from './ModelPreferences';
import { PresetPromptsSection } from './PresetPromptsSection';
import i18n from '@/i18n';

type Lang = 'zh' | 'en';

function SectionBlock({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
      <div className="mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/65">{title}</h3>
        {desc && <p className="mt-0.5 text-xs text-white/50">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

export function SettingsDialog() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const currentLang = (i18n.language?.slice(0, 2) === 'zh' ? 'zh' : 'en') as Lang;

  const handleClose = useCallback(() => setOpen(false), []);

  function handleLangChange(lang: Lang) {
    void i18n.changeLanguage(lang);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('scw-lang', lang);
    }
  }

  useEffect(() => {
    const unsub = subscribeOpenSettingsDialog(() => {
      setOpen(true);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, handleClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-[2px]"
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 z-[201] flex h-full w-[400px] flex-col border-l border-white/10 bg-[#141418] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-white/8 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">{t('settings.title')}</h2>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/8 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {/* Profile */}
          <SectionBlock title={t('settings.profile')}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-medium text-white">
                {user?.email?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div>
                <div className="text-sm text-white/80">{user?.email}</div>
                <div className="text-xs text-white/50">{user?.id?.slice(0, 8)}...</div>
              </div>
            </div>
          </SectionBlock>

          {/* Appearance */}
          <SectionBlock title={t('settings.appearance')}>
            <div className="flex gap-2">
              {(['light', 'dark'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTheme(mode)}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
                    theme === mode
                      ? 'border-blue-500/60 bg-blue-500/15 text-blue-300'
                      : 'border-white/10 text-white/50 hover:border-white/20 hover:text-white/80'
                  }`}
                >
                  {mode === 'light' ? (
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                      <path d="M8 1a.75.75 0 0 1 .75.75v1a.75.75 0 0 1-1.5 0v-1A.75.75 0 0 1 8 1Zm0 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 1.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Zm6.25-4.25a.75.75 0 0 0 0-1.5h-1a.75.75 0 0 0 0 1.5h1ZM8 13.5a.75.75 0 0 1 .75.75v1a.75.75 0 0 1-1.5 0v-1A.75.75 0 0 1 8 13.5Zm-5.03-2.22a.75.75 0 0 1 0-1.06l.707-.707a.75.75 0 1 1 1.06 1.06l-.706.708a.75.75 0 0 1-1.06 0Zm9.193-9.193a.75.75 0 0 1 0 1.06l-.707.707a.75.75 0 0 1-1.06-1.06l.707-.708a.75.75 0 0 1 1.06 0ZM2.75 8a.75.75 0 0 0-.75-.75H1a.75.75 0 0 0 0 1.5h1A.75.75 0 0 0 2.75 8Zm9.94 2.28a.75.75 0 0 0-1.06 1.06l.707.707a.75.75 0 1 0 1.06-1.06l-.707-.707ZM4.343 4.343a.75.75 0 0 0-1.06-1.06l-.707.707a.75.75 0 0 0 1.06 1.06l.707-.707Z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                      <path d="M8.5 1.75a.75.75 0 0 0-1.5 0v.5a.75.75 0 0 0 1.5 0v-.5ZM3.22 3.22a.75.75 0 0 1 1.06 0l.5.5a.75.75 0 0 1-1.06 1.06l-.5-.5a.75.75 0 0 1 0-1.06Zm9.56 0a.75.75 0 0 0-1.06 0l-.5.5a.75.75 0 1 0 1.06 1.06l.5-.5a.75.75 0 0 0 0-1.06ZM8 5.5A2.5 2.5 0 1 0 8 10.5 2.5 2.5 0 0 0 8 5.5Zm-6.25 3a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75Zm11.5 0a.75.75 0 0 1 .75-.75h.5a.75.75 0 0 1 0 1.5h-.5a.75.75 0 0 1-.75-.75ZM4.28 11.72a.75.75 0 0 0-1.06 1.06l.5.5a.75.75 0 0 0 1.06-1.06l-.5-.5Zm7.5 1.06a.75.75 0 1 0-1.06-1.06l-.5.5a.75.75 0 1 0 1.06 1.06l.5-.5ZM8.5 13.75a.75.75 0 0 0-1.5 0v.5a.75.75 0 0 0 1.5 0v-.5Z" />
                    </svg>
                  )}
                  {mode === 'light' ? t('settings.themeLight') : t('settings.themeDark')}
                </button>
              ))}
            </div>
          </SectionBlock>

          {/* Language */}
          <SectionBlock title={t('settings.language')}>
            <div className="flex gap-2">
              {(['zh', 'en'] as Lang[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => handleLangChange(lang)}
                  className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                    currentLang === lang
                      ? 'border-blue-500/60 bg-blue-500/15 text-blue-300'
                      : 'border-white/10 text-white/50 hover:border-white/20 hover:text-white/80'
                  }`}
                >
                  {lang === 'zh' ? t('settings.langZh') : t('settings.langEn')}
                </button>
              ))}
            </div>
          </SectionBlock>

          {/* API Keys */}
          <SectionBlock title={t('settings.apiKeys')} desc={t('settings.apiKeysDesc')}>
            <KeyManager />
          </SectionBlock>

          {/* Smart Routing Preferences */}
          <SectionBlock title={t('settings.routingTitle')}>
            <ScenarioDefaults />
            <div className="mt-4 border-t border-white/8 pt-4">
              <ModelPreferences />
            </div>
          </SectionBlock>

          {/* Preset Prompts */}
          <SectionBlock
            title={t('presetPrompts.sectionTitle')}
            desc={t('presetPrompts.sectionDesc')}
          >
            <PresetPromptsSection />
          </SectionBlock>
        </div>
      </div>
    </>
  );
}
