'use client';

import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import i18n from '@/i18n';

export const dynamic = 'force-dynamic';

type Theme = 'light' | 'dark' | 'system';
type Lang = 'zh' | 'en';

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-5">
      <h2 className="mb-4 text-sm font-semibold text-foreground/80">{title}</h2>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const currentLang = (i18n.language?.slice(0, 2) === 'zh' ? 'zh' : 'en') as Lang;

  function handleLangChange(lang: Lang) {
    void i18n.changeLanguage(lang);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('scw-lang', lang);
    }
  }

  function handleThemeChange(theme: Theme) {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    if (theme === 'system') {
      root.removeAttribute('data-theme');
      localStorage.removeItem('scw-theme');
    } else {
      root.setAttribute('data-theme', theme);
      localStorage.setItem('scw-theme', theme);
    }
  }

  const savedTheme = (typeof localStorage !== 'undefined'
    ? (localStorage.getItem('scw-theme') as Theme | null) ?? 'system'
    : 'system') as Theme;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-8 text-2xl font-semibold text-foreground">{t('settings.title')}</h1>

      <div className="space-y-4">
        {/* Profile */}
        <SectionCard title={t('settings.profile')}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/10 text-sm font-medium text-foreground">
              {user?.email?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div>
              <div className="text-sm text-foreground">{user?.email}</div>
              <div className="text-xs text-foreground/40">{user?.id?.slice(0, 8)}…</div>
            </div>
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
                    ? 'border-foreground/40 bg-foreground text-background'
                    : 'border-foreground/15 text-foreground/60 hover:border-foreground/30 hover:text-foreground'
                }`}
              >
                {lang === 'zh' ? t('settings.langZh') : t('settings.langEn')}
              </button>
            ))}
          </div>
        </SectionCard>

        {/* Theme */}
        <SectionCard title={t('settings.theme')}>
          <div className="flex gap-2">
            {(['light', 'dark', 'system'] as Theme[]).map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => handleThemeChange(theme)}
                className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                  savedTheme === theme
                    ? 'border-foreground/40 bg-foreground text-background'
                    : 'border-foreground/15 text-foreground/60 hover:border-foreground/30 hover:text-foreground'
                }`}
              >
                {theme === 'light'
                  ? t('settings.themeLight')
                  : theme === 'dark'
                    ? t('settings.themeDark')
                    : t('settings.themeSystem')}
              </button>
            ))}
          </div>
        </SectionCard>

        {/* API Keys */}
        <SectionCard title={t('settings.apiKeys')}>
          <p className="mb-4 text-sm text-foreground/50">{t('settings.apiKeysDesc')}</p>
          <ApiKeyManager />
        </SectionCard>
      </div>
    </div>
  );
}

interface ApiKey {
  provider: string;
  name: string;
  maskedValue: string;
}

function ApiKeyManager() {
  const { t } = useTranslation();

  // Placeholder — actual CRUD wired in Phase 3 G when user_api_keys API is ready
  const keys: ApiKey[] = [];

  return (
    <div>
      {keys.length === 0 && (
        <p className="mb-3 text-xs text-foreground/30">{t('common.loading')}</p>
      )}
      <button
        type="button"
        disabled
        className="flex items-center gap-2 rounded-lg border border-foreground/15 px-3 py-2 text-sm text-foreground/50 opacity-60"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
          <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2Z" />
        </svg>
        {t('settings.addApiKey')} (coming soon)
      </button>
    </div>
  );
}
