'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { WeChatLoginButton } from '@/components/auth/WeChatLoginButton';

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn, signInWithOAuth } = useAuthStore();
  const router = useRouter();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    const { error } = await signInWithOAuth('google');
    if (error) setError(error.message);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">{t('auth.signInTitle')}</h1>
        <p className="mt-2 text-sm text-foreground/60">{t('auth.signInSubtitle')}</p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            {t('auth.email')}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-foreground placeholder:text-foreground/40 focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/40"
            placeholder={t('auth.emailPlaceholder')}
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground">
            {t('auth.password')}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-foreground placeholder:text-foreground/40 focus:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/40"
            placeholder={t('auth.passwordPlaceholder')}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
        >
          {loading ? t('auth.signingIn') : t('auth.login')}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-foreground/10" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-background px-2 text-foreground/40">{t('common.or')}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full rounded-md border border-foreground/20 bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-foreground/5"
      >
        {t('auth.continueWithGoogle')}
      </button>

      <WeChatLoginButton />

      <p className="text-center text-sm text-foreground/60">
        {t('auth.noAccount')}{' '}
        <Link href="/signup" className="font-medium text-foreground hover:underline">
          {t('auth.signup')}
        </Link>
      </p>
    </div>
  );
}
