'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import i18n from '@/i18n';

export const dynamic = 'force-dynamic';

type Theme = 'light' | 'dark' | 'system';
type Lang = 'zh' | 'en';

const PROVIDERS = ['kie', 'ppio', 'grsai', 'fal', 'openai', 'anthropic'] as const;
type Provider = (typeof PROVIDERS)[number];

interface ApiKeyEntry {
  id: string;
  provider: Provider;
  maskedValue: string;
  created_at: string;
}

function SectionCard({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-foreground/80">{title}</h2>
        {desc && <p className="mt-0.5 text-xs text-foreground/40">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const currentLang = (i18n.language?.slice(0, 2) === 'zh' ? 'zh' : 'en') as Lang;
  const savedTheme = (typeof localStorage !== 'undefined'
    ? (localStorage.getItem('scw-theme') as Theme | null) ?? 'system'
    : 'system') as Theme;

  function handleLangChange(lang: Lang) {
    void i18n.changeLanguage(lang);
    localStorage.setItem('scw-lang', lang);
  }

  function handleThemeChange(theme: Theme) {
    const root = document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
      localStorage.removeItem('scw-theme');
    } else {
      root.setAttribute('data-theme', theme);
      localStorage.setItem('scw-theme', theme);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-8 text-2xl font-semibold text-foreground">{t('settings.title')}</h1>

      <div className="space-y-4">
        {/* Profile */}
        <SectionCard title={t('settings.profile')}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground/10 text-sm font-medium text-foreground">
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
        <SectionCard title={t('settings.apiKeys')} desc={t('settings.apiKeysDesc')}>
          <ApiKeyManager />
        </SectionCard>
      </div>
    </div>
  );
}

function ApiKeyManager() {
  const { t } = useTranslation();
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingProvider, setAddingProvider] = useState<Provider | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function loadKeys() {
    try {
      const res = await fetch('/api/settings/api-keys');
      if (res.ok) setKeys(await res.json() as ApiKeyEntry[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadKeys(); }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function handleSave(provider: Provider) {
    if (!inputValue.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, key: inputValue.trim() }),
      });
      if (res.ok) {
        await loadKeys();
        setAddingProvider(null);
        setInputValue('');
        showToast(t('settings.keyAdded'));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(provider: Provider) {
    await fetch('/api/settings/api-keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    });
    setKeys((prev) => prev.filter((k) => k.provider !== provider));
    showToast(t('settings.keyDeleted'));
  }

  const existingProviders = new Set(keys.map((k) => k.provider));
  const availableProviders = PROVIDERS.filter((p) => !existingProviders.has(p));

  return (
    <div className="space-y-3">
      {loading && <p className="text-xs text-foreground/30">{t('common.loading')}</p>}

      {/* Existing keys */}
      {keys.map((key) => (
        <div
          key={key.id}
          className="flex items-center justify-between rounded-lg border border-foreground/10 px-3 py-2.5"
        >
          <div>
            <span className="text-sm font-medium text-foreground">{key.provider}</span>
            <span className="ml-3 font-mono text-xs text-foreground/40">{key.maskedValue}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setAddingProvider(key.provider); setInputValue(''); }}
              className="text-xs text-foreground/40 hover:text-foreground"
            >
              {t('common.edit')}
            </button>
            <button
              type="button"
              onClick={() => void handleDelete(key.provider)}
              className="text-xs text-red-400 hover:text-red-500"
            >
              {t('common.delete')}
            </button>
          </div>
        </div>
      ))}

      {/* Add key form */}
      {addingProvider ? (
        <div className="rounded-lg border border-foreground/15 p-3">
          <div className="mb-2 text-xs font-medium text-foreground/70">
            {addingProvider}
          </div>
          <div className="flex gap-2">
            <input
              autoFocus
              type="password"
              placeholder="sk-..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSave(addingProvider);
                if (e.key === 'Escape') { setAddingProvider(null); setInputValue(''); }
              }}
              className="flex-1 rounded border border-foreground/20 bg-background px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-foreground/30 focus:border-foreground/40"
            />
            <button
              type="button"
              onClick={() => void handleSave(addingProvider)}
              disabled={saving || !inputValue.trim()}
              className="rounded bg-foreground px-3 py-1.5 text-xs font-medium text-background disabled:opacity-50"
            >
              {t('settings.saveKey')}
            </button>
            <button
              type="button"
              onClick={() => { setAddingProvider(null); setInputValue(''); }}
              className="rounded border border-foreground/15 px-3 py-1.5 text-xs text-foreground/60 hover:text-foreground"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : availableProviders.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {availableProviders.map((provider) => (
            <button
              key={provider}
              type="button"
              onClick={() => { setAddingProvider(provider); setInputValue(''); }}
              className="flex items-center gap-1.5 rounded-lg border border-foreground/15 px-3 py-1.5 text-xs text-foreground/60 hover:border-foreground/30 hover:text-foreground"
            >
              <svg viewBox="0 0 12 12" fill="currentColor" className="h-3 w-3">
                <path d="M6 1a.5.5 0 0 1 .5.5v4h4a.5.5 0 0 1 0 1h-4v4a.5.5 0 0 1-1 0v-4h-4a.5.5 0 0 1 0-1h4v-4A.5.5 0 0 1 6 1Z" />
              </svg>
              {provider}
            </button>
          ))}
        </div>
      ) : null}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-foreground px-4 py-2 text-sm text-background shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
