'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { useWeChatLogin } from '@/hooks/useWeChatLogin';

interface WeChatQRModalProps {
  open: boolean;
  onClose: () => void;
}

export function WeChatQRModal({ open, onClose }: WeChatQRModalProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { status, qrImageSrc, error, remainingSeconds, startLogin, reset } = useWeChatLogin();

  useEffect(() => {
    if (open && status === 'idle') {
      startLogin();
    }
  }, [open, status, startLogin]);

  useEffect(() => {
    if (status === 'confirmed') {
      onClose();
      router.push('/dashboard');
    }
  }, [status, onClose, router]);

  const handleRefresh = () => {
    reset();
    startLogin();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!open) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const progress = remainingSeconds / 300;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div
        className="w-full max-w-sm rounded-lg bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-center text-lg font-semibold text-foreground">
          {t('auth.wechatScanTitle')}
        </h2>

        {status === 'pending' && qrImageSrc && (
          <div className="flex flex-col items-center space-y-4">
            <div className="rounded-lg border border-foreground/10 p-4">
              <Image src={qrImageSrc} alt="WeChat QR Code" width={256} height={256} />
            </div>
            <p className="text-sm text-foreground/60">{t('auth.wechatScanInstruction')}</p>
            <div className="w-full">
              <div className="h-1.5 w-full rounded-full bg-foreground/10">
                <div
                  className="h-1.5 rounded-full bg-green-500 transition-all duration-1000"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <p className="mt-1 text-center text-xs text-foreground/40">{timeDisplay}</p>
            </div>
          </div>
        )}

        {status === 'expired' && (
          <div className="flex flex-col items-center space-y-4">
            <div className="rounded-lg border border-foreground/10 p-4 opacity-30">
              <div className="h-[200px] w-[200px] bg-foreground/5" />
            </div>
            <p className="text-sm text-foreground/60">{t('auth.wechatExpired')}</p>
            <button
              onClick={handleRefresh}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
            >
              {t('auth.wechatRefresh')}
            </button>
          </div>
        )}

        {status === 'failed' && (
          <div className="flex flex-col items-center space-y-4">
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error || t('auth.wechatFailed')}
            </div>
            <button
              onClick={handleRefresh}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
            >
              {t('common.retry')}
            </button>
          </div>
        )}

        {status === 'confirmed' && (
          <div className="flex flex-col items-center space-y-4">
            <div className="text-4xl text-green-500">✓</div>
            <p className="text-sm text-foreground/60">{t('auth.wechatSuccess')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
