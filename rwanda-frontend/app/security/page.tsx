'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import { RwandaProtectedRoute } from '@/components/rwanda/auth/RwandaProtectedRoute';
import { RwandaTopBar } from '@/components/rwanda/layout/RwandaTopBar';
import { RwandaSidebar } from '@/components/rwanda/layout/RwandaSidebar';
import { RwandaFooter } from '@/components/rwanda/layout/RwandaFooter';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { authAPI, getAuthErrorMessage } from '@/lib/api/authApi';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import type { MfaSetupResponse } from '@/lib/types/auth';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Copy,
  KeyRound,
  Shield,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';

function qrCodeImageUrl(otpauthUrl: string): string {
  const enc = encodeURIComponent(otpauthUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&ecc=M&data=${enc}`;
}

const otpInputClass =
  'h-11 w-40 rounded-md border border-slate-300 bg-white px-3 text-center font-mono text-lg tracking-[0.35em] placeholder:text-slate-300 focus:border-[var(--rw-blue-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--rw-blue-deep)]/25 disabled:opacity-60';

function SecurityContent() {
  const { user, isLoading: authLoading, refreshUser } = useAuth(true);
  const { t } = useLanguage();

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [setup, setSetup] = useState<MfaSetupResponse | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [secretCopied, setSecretCopied] = useState(false);

  const mfaEnabled = !!user?.two_fa_enabled;

  const onStartSetup = async () => {
    setErr('');
    setBusy(true);
    try {
      const data = await authAPI.setup2FA();
      setSetup(data);
      setConfirmCode('');
    } catch (e) {
      setErr(getAuthErrorMessage(e, t('security_settings.error_generic')));
    } finally {
      setBusy(false);
    }
  };

  const onConfirmEnable = async () => {
    const code = confirmCode.trim().replace(/\s/g, '');
    if (code.length !== 6 || !/^\d+$/.test(code)) return;
    setErr('');
    setBusy(true);
    try {
      await authAPI.enable2FA(code);
      setSetup(null);
      setConfirmCode('');
      await refreshUser();
    } catch (e) {
      setErr(getAuthErrorMessage(e, t('security_settings.error_generic')));
    } finally {
      setBusy(false);
    }
  };

  const onDisable = async () => {
    const code = disableCode.trim().replace(/\s/g, '');
    if (code.length !== 6 || !/^\d+$/.test(code)) return;
    setErr('');
    setBusy(true);
    try {
      await authAPI.disable2FA(code);
      setDisableCode('');
      await refreshUser();
    } catch (e) {
      setErr(getAuthErrorMessage(e, t('security_settings.error_generic')));
    } finally {
      setBusy(false);
    }
  };

  const copySecret = useCallback(
    async (secret: string) => {
      try {
        await navigator.clipboard.writeText(secret);
        setSecretCopied(true);
        window.setTimeout(() => setSecretCopied(false), 2000);
      } catch {
        setErr(t('security_settings.error_generic'));
      }
    },
    [t],
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--rw-blue-deep)]">{t('nav.security')}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {t('security_settings.card_title')}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          {t('security_settings.page_subtitle')}
        </p>
        <div className="rw-flag-rule mt-3 h-1 w-20 rounded-full" aria-hidden />
      </header>

      <Card>
        <CardContent className="space-y-8 p-6 sm:p-8">
          <p className="text-sm leading-relaxed text-slate-600">{t('security_settings.lead')}</p>

          {err && (
            <div className="flex gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-900" role="alert">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
              <span>{err}</span>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-3 text-base font-semibold text-slate-900">
              {mfaEnabled ? (
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                  <ShieldCheck className="h-5 w-5" />
                </span>
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-slate-600 ring-1 ring-slate-200">
                  <Shield className="h-5 w-5" />
                </span>
              )}
              {t('security_settings.mfa_heading')}
            </h2>
            <p className="mb-5 text-sm text-slate-600">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${
                  mfaEnabled
                    ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                    : 'bg-amber-50 text-amber-900 ring-1 ring-amber-200'
                }`}
              >
                {mfaEnabled ? t('security_settings.mfa_on') : t('security_settings.mfa_off')}
              </span>
            </p>

            {authLoading ? (
              <p className="text-sm text-slate-500">{t('security_settings.loading')}</p>
            ) : mfaEnabled ? (
              <div className="space-y-4 rounded-md border border-slate-200 bg-white p-4 sm:p-5">
                <p className="text-sm text-slate-600">{t('security_settings.disable_blurb')}</p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={disableCode}
                    onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className={otpInputClass}
                    disabled={busy}
                    autoComplete="one-time-code"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={onDisable}
                    disabled={busy || disableCode.length !== 6}
                    className="gap-2"
                  >
                    <ShieldOff className="h-4 w-4" />
                    {t('security_settings.disable_2fa')}
                  </Button>
                </div>
              </div>
            ) : setup ? (
              <div className="space-y-6">
                <p className="text-sm text-slate-700">{t('security_settings.scan_qr')}</p>
                <div className="flex flex-col gap-6 md:flex-row md:items-start">
                  <div className="shrink-0 rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrCodeImageUrl(setup.qr_code_url)}
                      width={220}
                      height={220}
                      alt=""
                      className="rounded-lg"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-4">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {t('security_settings.secret_key')}
                      </span>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <code className="break-all rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-sm">
                          {setup.secret}
                        </code>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-1"
                          onClick={() => copySecret(setup.secret)}
                        >
                          {secretCopied ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          {secretCopied ? t('security_settings.copied') : t('security_settings.copy_secret')}
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-amber-900/90">
                        {t('security_settings.backup_codes_title')}
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-amber-900/85">
                        {t('security_settings.backup_codes_warning')}
                      </p>
                      <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs sm:grid-cols-3">
                        {setup.backup_codes.map((c) => (
                          <li
                            key={c}
                            className="rounded-md border border-amber-200 bg-white px-2.5 py-1.5 text-center text-amber-950"
                          >
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="border-t border-slate-200/70 pt-6">
                  <p className="mb-3 text-sm text-slate-700">{t('security_settings.confirm_6_digit')}</p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={confirmCode}
                      onChange={(e) =>
                        setConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                      }
                      placeholder="000000"
                      className={otpInputClass}
                      disabled={busy}
                      autoComplete="one-time-code"
                    />
                    <Button type="button" onClick={onConfirmEnable} disabled={busy || confirmCode.length !== 6}>
                      {t('security_settings.confirm_enable')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-slate-600"
                      onClick={() => {
                        setSetup(null);
                        setErr('');
                      }}
                      disabled={busy}
                    >
                      {t('security_settings.cancel_setup')}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">{t('security_settings.mfa_setup_blurb')}</p>
                <Button type="button" onClick={onStartSetup} disabled={busy} className="gap-2">
                  <Shield className="h-4 w-4" />
                  {t('security_settings.start_setup')}
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 rounded-lg border border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--rw-blue)]/10 text-[var(--rw-blue-deep)] ring-1 ring-[var(--rw-blue)]/20">
                <KeyRound className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {t('security_settings.password_section')}
                </h2>
                <p className="mt-1 text-sm text-slate-600">{t('security_settings.password_blurb')}</p>
              </div>
            </div>
            <Link
              href="/change-password"
              className={cn(buttonVariants({ variant: 'outline', size: 'default' }), 'shrink-0 gap-2')}
            >
              {t('security_settings.go_change_password')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SecurityPage() {
  return (
    <RwandaProtectedRoute>
      <div className="relative flex min-h-screen flex-col bg-surface">
        <RwandaTopBar />
        <div className="relative flex-1">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="flex gap-6 lg:gap-8">
              <RwandaSidebar />
              <main className="min-w-0 flex-1">
                <SecurityContent />
              </main>
            </div>
          </div>
        </div>
        <RwandaFooter />
      </div>
    </RwandaProtectedRoute>
  );
}
