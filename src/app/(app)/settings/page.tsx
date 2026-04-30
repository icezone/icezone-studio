'use client';

import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import i18n from '@/i18n';
import { PresetPromptsSection } from '@/features/settings/PresetPromptsSection';
import { CostSummaryPanel } from '@/features/settings/CostSummaryPanel';
import { KeyManager } from '@/features/settings/KeyManager/KeyManager';
import { ScenarioDefaults } from '@/features/settings/ScenarioDefaults';
import { ModelPreferences } from '@/features/settings/ModelPreferences';

export const dynamic = 'force-dynamic';

type Lang = 'zh' | 'en';

function SectionCard({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--ui-line)] bg-[var(--ui-surface-field)] p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-ui-fg">{title}</h2>
        {desc && <p className="mt-0.5 text-xs text-ui-fg-muted">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { theme, setTheme } = useThemeStore();

  const currentLang = (i18n.language?.slice(0, 2) === 'zh' ? 'zh' : 'en') as Lang;

  function handleLangChange(lang: Lang) {
    void i18n.changeLanguage(lang);
    localStorage.setItem('scw-lang', lang);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-8 text-2xl font-semibold text-ui-fg">{t('settings.title')}</h1>

      <div className="space-y-4">
        {/* Profile */}
        <SectionCard title={t('settings.profile')}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ui-primary-subtle text-sm font-medium text-ui-primary">
              {user?.email?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div>
              <div className="text-sm text-ui-fg">{user?.email}</div>
              <div className="text-xs text-ui-fg-muted">{user?.id?.slice(0, 8)}…</div>
            </div>
          </div>
        </SectionCard>

        {/* Appearance */}
        <SectionCard title={t('settings.appearance')}>
          <div className="flex gap-2">
            {(['light', 'dark'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setTheme(mode)}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
                  theme === mode
                    ? 'border-ui-primary bg-ui-primary-subtle text-ui-primary'
                    : 'border-[var(--ui-line-strong)] text-ui-fg-muted hover:border-ui-primary/40 hover:text-ui-fg'
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
        </SectionCard>

        {/* Language */}
        <SectionCard title={t('settings.language')}>
          <div className="flex gap-2">
            {(['zh', 'en'] as Lang[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => handleLangChange(lang)}
                className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                  currentLang === lang
                    ? 'border-ui-primary bg-ui-primary-subtle text-ui-primary'
                    : 'border-[var(--ui-line-strong)] text-ui-fg-muted hover:border-ui-primary/40 hover:text-ui-fg'
                }`}
              >
                {lang === 'zh' ? t('settings.langZh') : t('settings.langEn')}
              </button>
            ))}
          </div>
        </SectionCard>

        {/* API Keys — 由 KeyManager 容器接管 */}
        <SectionCard title={t('settings.apiKeys')} desc={t('settings.apiKeysDesc')}>
          <KeyManager />
        </SectionCard>

        {/* Smart Routing Preferences */}
        <SectionCard title={t('settings.routingTitle')}>
          <ScenarioDefaults />
          <div className="mt-4 border-t border-[var(--ui-border-soft)] pt-4">
            <ModelPreferences />
          </div>
        </SectionCard>

        {/* Preset Prompts */}
        <SectionCard
          title={t('presetPrompts.sectionTitle')}
          desc={t('presetPrompts.sectionDesc')}
        >
          <PresetPromptsSection />
        </SectionCard>

        {/* 调用记录 */}
        <SectionCard
          title={t('settings.costPanel.title')}
          desc={t('settings.costPanel.desc')}
        >
          <CostSummaryPanel />
        </SectionCard>
      </div>
    </div>
  );
}
