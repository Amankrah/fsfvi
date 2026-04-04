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
  Sparkles,
} from 'lucide-react';

function qrCodeImageUrl(otpauthUrl: string): string {
  const enc = encodeURIComponent(otpauthUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&ecc=M&data=${enc}`;
}

const otpInputClass =
  'w-40 rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2.5 text-center font-mono text-lg tracking-[0.35em] shadow-sm transition-shadow placeholder:text-slate-300 focus:border-[var(--rw-blue)]/45 focus:outline-none focus:ring-2 focus:ring-[var(--rw-blue)]/20 disabled:opacity-60';

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
    <div className="space-y-8">
      <header className="relative">
        <div
          className="pointer-events-none absolute -left-6 -top-8 h-40 w-40 rounded-full bg-[var(--rw-blue)]/10 blur-3xl"
          aria-hidden
        />
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--rw-blue)]">
          <Sparkles className="h-3.5 w-3.5 opacity-80" aria-hidden />
          {t('nav.security')}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          {t('security_settings.card_title')}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          {t('security_settings.page_subtitle')}
        </p>
        <div className="mt-4 h-1 w-20 rounded-full bg-gradient-to-r from-[var(--rw-blue)] to-[var(--rw-green)]" />
      </header>

      <Card className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.4)] backdrop-blur-xl ring-1 ring-slate-900/[0.04]">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--rw-blue)]/[0.04] via-transparent to-slate-50/80"
          aria-hidden
        />
        <CardContent className="relative space-y-8 p-6 sm:p-8">
          <p className="text-sm leading-relaxed text-slate-600">{t('security_settings.lead')}</p>

          {err && (
            <div
              className="flex gap-3 rounded-2xl border border-red-200/80 bg-gradient-to-r from-red-50/95 to-red-50/60 px-4 py-3.5 text-sm text-red-900 shadow-sm"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
              <span>{err}</span>
            </div>
          )}

          <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50/95 via-white to-[var(--rw-blue)]/[0.06] p-5 shadow-inner ring-1 ring-slate-900/[0.03] sm:p-6">
            <div
              className="pointer-events-none absolute -right-16 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-[var(--rw-blue)]/[0.07] blur-3xl"
              aria-hidden
            />
            <h2 className="relative mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
              {mfaEnabled ? (
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80">
                  <ShieldCheck className="h-5 w-5" />
                </span>
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 ring-1 ring-slate-200/80">
                  <Shield className="h-5 w-5" />
                </span>
              )}
              {t('security_settings.mfa_heading')}
            </h2>
            <p className="relative mb-5 text-sm text-slate-600">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide ${
                  mfaEnabled
                    ? 'bg-emerald-100/90 text-emerald-900 ring-1 ring-emerald-200/60'
                    : 'bg-amber-50 text-amber-900 ring-1 ring-amber-200/70'
                }`}
              >
                {mfaEnabled ? t('security_settings.mfa_on') : t('security_settings.mfa_off')}
              </span>
            </p>

            {authLoading ? (
              <p className="relative text-sm text-slate-500">{t('security_settings.loading')}</p>
            ) : mfaEnabled ? (
              <div className="relative space-y-4 rounded-xl border border-slate-200/60 bg-white/70 p-4 backdrop-blur-sm sm:p-5">
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
                    className="gap-2 rounded-xl shadow-sm"
                  >
                    <ShieldOff className="h-4 w-4" />
                    {t('security_settings.disable_2fa')}
                  </Button>
                </div>
              </div>
            ) : setup ? (
              <div className="relative space-y-6">
                <p className="text-sm text-slate-700">{t('security_settings.scan_qr')}</p>
                <div className="flex flex-col gap-6 md:flex-row md:items-start">
                  <div className="shrink-0 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-md ring-4 ring-white/80">
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
                        <code className="break-all rounded-xl border border-slate-200/80 bg-white px-3 py-2 font-mono text-sm shadow-sm">
                          {setup.secret}
                        </code>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-1 rounded-xl border-slate-200/90"
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
                    <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/90 to-orange-50/40 p-4 shadow-sm">
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
                            className="rounded-lg border border-amber-200/50 bg-white/90 px-2.5 py-1.5 text-center text-amber-950 shadow-sm"
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
                    <Button
                      type="button"
                      onClick={onConfirmEnable}
                      disabled={busy || confirmCode.length !== 6}
                      className="rounded-xl bg-[var(--rw-blue)] shadow-md hover:bg-[#008bbf]"
                    >
                      {t('security_settings.confirm_enable')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="rounded-xl text-slate-600"
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
              <div className="relative space-y-4">
                <p className="text-sm text-slate-600">{t('security_settings.mfa_setup_blurb')}</p>
                <Button
                  type="button"
                  onClick={onStartSetup}
                  disabled={busy}
                  className="gap-2 rounded-xl bg-[var(--rw-blue)] shadow-md hover:bg-[#008bbf]"
                >
                  <Shield className="h-4 w-4" />
                  {t('security_settings.start_setup')}
                </Button>
              </div>
            )}
          </div>

          <div className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-r from-white via-slate-50/50 to-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--rw-blue)]/12 text-[var(--rw-blue)] ring-1 ring-[var(--rw-blue)]/15">
                <KeyRound className="h-6 w-6" aria-hidden />
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
              className={cn(
                buttonVariants({ variant: 'outline', size: 'default' }),
                'shrink-0 gap-2 rounded-xl border-slate-200/90 bg-white/90 shadow-sm hover:border-[var(--rw-blue)]/35 hover:bg-[var(--rw-blue)]/[0.04]',
              )}
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
      <div className="relative flex min-h-screen flex-col bg-gradient-to-b from-slate-50 via-white to-slate-100/90">
        <div
          className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,133,179,0.12),transparent)]"
          aria-hidden
        />
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
