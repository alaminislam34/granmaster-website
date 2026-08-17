'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiLock, FiMail } from 'react-icons/fi';
import { forgetPassword, verifyCode } from '@/src/lib/authService';
import { toast } from 'sonner';

type Step = 'email' | 'verify';

export default function ForgetPass() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');

  // Email step
  const [email, setEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  // OTP step
  const [otpCode, setOtpCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const handleSendCode = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEmailError('');
    setEmailLoading(true);
    try {
      await forgetPassword(email);
      toast.success("Codice inviato! Controlla la tua email.");
      setStep('verify');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg = axiosErr?.response?.data?.message || "Impossibile inviare il codice. Riprova.";
      setEmailError(msg);
      toast.error(msg);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleVerify = async () => {
    setVerifyError('');
    if (otpCode.length < 6) {
      setVerifyError('Inserisci il codice a 6 cifre');
      return;
    }
    setVerifyLoading(true);
    try {
      await verifyCode(email, otpCode);
      toast.success("Codice verificato! Imposta la tua nuova password.");
      router.push(`/auth/resetPass?email=${encodeURIComponent(email)}&code=${otpCode}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg = axiosErr?.response?.data?.message || 'Codice non valido. Riprova.';
      setVerifyError(msg);
      toast.error(msg);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResend = async () => {
    setVerifyError('');
    setOtpCode('');
    try {
      await forgetPassword(email);
      toast.success("Codice reinviato! Controlla la tua email.");
    } catch {
      const msg = 'Impossibile reinviare il codice.';
      setVerifyError(msg);
      toast.error(msg);
    }
  };

  // ─── Step: email ──────────────────────────────────────────────────────────
  if (step === 'email') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-lg">
          <div className="flex flex-col items-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#8F00FF]/10 text-[#8F00FF]">
              <FiMail className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-center text-xl font-semibold text-gray-900">
              Password dimenticata?
            </h2>
            <p className="mt-2 text-center text-sm text-gray-500">
              Inserisci il tuo indirizzo email e ti invieremo un codice di verifica.
            </p>

            {emailError && (
              <div className="mt-4 w-full rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200">
                {emailError}
              </div>
            )}

            <form onSubmit={handleSendCode} className="mt-6 w-full space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Inserisci la tua email"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8F00FF] focus:bg-white transition"
                required
              />
              <button
                type="submit"
                disabled={emailLoading}
                className="w-full rounded-full bg-[#8F00FF] px-4 py-3 text-sm font-semibold text-white hover:bg-[#7A00E5] disabled:opacity-60"
              >
                {emailLoading ? 'Invio in corso...' : 'Invia codice di verifica'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step: verify OTP ─────────────────────────────────────────────────────
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-lg">
        <div className="flex flex-col items-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#8F00FF]/10 text-[#8F00FF]">
            <FiLock className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-center text-xl font-semibold text-gray-900">
            Verifica la tua identità
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500">
            Abbiamo inviato un codice di 6 cifre a <strong>{email}</strong>.
          </p>

          {verifyError && (
            <div className="mt-4 w-full rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200">
              {verifyError}
            </div>
          )}

          {/* Single input — supports paste */}
          <div className="mt-6 w-full">
            <input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="es. 390239"
              className="w-full rounded-lg border-2 border-gray-200 bg-gray-50 px-4 py-4 text-center text-3xl font-bold tracking-[0.6em] text-gray-900 placeholder:text-base placeholder:tracking-normal placeholder:font-normal placeholder-gray-300 focus:outline-none focus:border-[#8F00FF] focus:bg-white transition"
              inputMode="numeric"
              maxLength={6}
              autoFocus
            />
            <p className="mt-2 text-center text-xs text-gray-400">
              Puoi incollare il codice direttamente
            </p>
          </div>

          <button
            onClick={handleVerify}
            disabled={verifyLoading || otpCode.length < 6}
            className="mt-6 w-full rounded-full bg-[#8F00FF] px-4 py-3 text-sm font-semibold text-white hover:bg-[#7A00E5] disabled:opacity-50 transition"
          >
            {verifyLoading ? 'Verifica in corso...' : 'Verifica e continua'}
          </button>

          <button
            onClick={handleResend}
            className="mt-3 text-xs text-gray-500 underline hover:text-[#8F00FF]"
          >
            Non hai ricevuto un codice? Invia nuovamente
          </button>
        </div>
      </div>
    </div>
  );
}
