'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { subscribeOpenSettingsDialog } from './settingsEvents';
import { useAuthStore } from '@/stores/authStore';
import i18n from '@/i18n';

const PROVIDERS = ['kie', 'ppio', 'grsai', 'fal', 'openai', 'anthropic'] as const;
type Provider = (typeof PROVIDERS)[number];
type Lang = 'zh' | 'en';

interface ApiKeyEntry {
  id: string;
  provider: Provider;
  maskedValue: string;
  created_at: string;
}

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
    <div className="space-y-2">
      {loading && <p className="text-xs text-white/50">{t('common.loading')}</p>}

      {keys.map((key) => (
        <div key={key.id} className="flex items-center justify-between rounded-lg border border-white/8 px-3 py-2.5">
          <div>
            <span className="text-sm font-medium text-white/80">{key.provider}</span>
            <span className="ml-3 font-mono text-xs text-white/50">{key.maskedValue}</span>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => { setAddingProvider(key.provider); setInputValue(''); }}
              className="text-xs text-white/55 transition-colors hover:text-white/80">
              {t('common.edit')}
            </button>
            <button type="button" onClick={() => void handleDelete(key.provider)}
              className="text-xs text-red-400 transition-colors hover:text-red-300">
              {t('common.delete')}
            </button>
          </div>
        </div>
      ))}

      {addingProvider ? (
        <div className="rounded-lg border border-white/12 p-3">
          <div className="mb-2 text-xs font-medium text-white/50">{addingProvider}</div>
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
              className="flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white outline-none placeholder:text-white/20 focus:border-white/30"
            />
            <button type="button" onClick={() => void handleSave(addingProvider)}
              disabled={saving || !inputValue.trim()}
              className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 hover:bg-blue-400 transition-colors">
              {t('settings.saveKey')}
            </button>
            <button type="button" onClick={() => { setAddingProvider(null); setInputValue(''); }}
              className="rounded-lg border border-white/12 px-3 py-1.5 text-xs text-white/50 transition-colors hover:text-white/80">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : availableProviders.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {availableProviders.map((provider) => (
            <button key={provider} type="button"
              onClick={() => { setAddingProvider(provider); setInputValue(''); }}
              className="flex items-center gap-1.5 rounded-lg border border-white/12 px-3 py-1.5 text-xs text-white/50 transition-colors hover:border-white/25 hover:text-white/80">
              <svg viewBox="0 0 12 12" fill="currentColor" className="h-3 w-3">
                <path d="M6 1a.5.5 0 0 1 .5.5v4h4a.5.5 0 0 1 0 1h-4v4a.5.5 0 0 1-1 0v-4h-4a.5.5 0 0 1 0-1h4v-4A.5.5 0 0 1 6 1Z" />
              </svg>
              {provider}
            </button>
          ))}
        </div>
      ) : null}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[300] -translate-x-1/2 rounded-xl bg-white/10 px-4 py-2 text-sm text-white backdrop-blur shadow-lg border border-white/15">
          {toast}
        </div>
      )}
    </div>
  );
}

export function SettingsDialog() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
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
                <div className="text-xs text-white/50">{user?.id?.slice(0, 8)}…</div>
              </div>
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
            <ApiKeyManager />
          </SectionBlock>
        </div>
      </div>
    </>
  );
}
