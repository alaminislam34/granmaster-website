/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import img1 from '../../assets/image.svg';
import { register, resendVerificationCode, verifyEmail } from '@/src/lib/authService';
import { toast } from 'sonner';

type Step = 'register' | 'verify';

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('register');
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Register form
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // OTP verify
  const [otpCode, setOtpCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Le password non coincidono');
      return;
    }
    if (!acceptedTerms) {
      setError("Devi accettare i Termini di servizio");
      return;
    }
    setLoading(true);
    try {
      const emailToSave = formData.email;
      await register({
        name: formData.name,
        email: emailToSave,
        password: formData.password,
      });
      // axios throws on non-2xx — reaching here means success
      setRegisteredEmail(emailToSave);
      toast.success("Registrazione effettuata! Controlla la tua email per il codice.");
      setStep('verify');
    } catch (err: unknown) {
      console.error('Register error:', err);
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } }; message?: string };
      if (axiosErr?.response?.status === 409) {
        setError('Email già registrata. Accedi al tuo account.');
        toast.error('Email già registrata. Accedi al tuo account.');
        return;
      }
      const msg =
        axiosErr?.response?.data?.message ||
        axiosErr?.message ||
        'Registrazione fallita. Controlla la connessione e riprova.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
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
      await verifyEmail(registeredEmail, otpCode);
      toast.success("Email verificata! Accedi al tuo account.");
      router.push('/auth/login');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg = axiosErr?.response?.data?.message || 'Codice non valido. Riprova.';
      setVerifyError(msg);
      toast.error(msg);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResendCode = async () => {
    setVerifyError('');
    setResendLoading(true);
    try {
      await resendVerificationCode(registeredEmail);
      toast.success('Nuovo codice inviato. Controlla la tua email (anche spam).');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg =
        axiosErr?.response?.data?.message ||
        'Invio del codice non riuscito. Riprova.';
      setVerifyError(msg);
      toast.error(msg);
    } finally {
      setResendLoading(false);
    }
  };

  // ─── OTP Step ─────────────────────────────────────────────────────────────
  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-[#f7f6f4] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
          <div className="flex flex-col items-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#8F00FF]/10 text-[#8F00FF]">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <h2 className="mt-4 text-center text-xl font-semibold text-gray-900">
              Verifica la tua email
            </h2>
            <p className="mt-2 text-center text-sm text-gray-500">
              Abbiamo inviato un codice di 6 cifre a{' '}
              <strong>{registeredEmail}</strong>. Inseriscilo qui sotto.
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
              type="button"
              onClick={handleResendCode}
              disabled={resendLoading}
              className="mt-3 w-full rounded-full border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50 transition"
            >
              {resendLoading ? 'Invio in corso...' : 'Invia di nuovo il codice'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Register Step ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f7f6f4] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-10 shadow-xl">
        <div className="flex justify-center">
          <img src={img1.src} alt="Guida Nutrizionale" className="h-30 w-70" />
        </div>

        <div className="text-center mt-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Inizia il tuo viaggio</h2>
          <p className="text-sm text-gray-600 mt-2">
            Personalizza il tuo piano nutrizionale e di benessere.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Nome e cognome
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Inserisci il tuo nome"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8F00FF] focus:bg-white transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">E-mail</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Inserisci la tua email"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8F00FF] focus:bg-white transition"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Password</label>
              <div className="relative w-full">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="********"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 pr-10 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8F00FF] focus:bg-white transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#8F00FF] transition cursor-pointer"
                  aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                >
                  {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Conferma password
              </label>
              <div className="relative w-full">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="********"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 pr-10 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8F00FF] focus:bg-white transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#8F00FF] transition cursor-pointer"
                  aria-label={showConfirmPassword ? 'Nascondi password' : 'Mostra password'}
                >
                  {showConfirmPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          <label className="flex items-start gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-green-800"
            />
            Accetto i Termini di servizio e l'Informativa sulla privacy
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#8F00FF] py-3 text-sm font-semibold text-white shadow-md hover:bg-[#7A00E5] transition disabled:opacity-60"
          >
            {loading ? 'Creazione in corso...' : 'Creare un account'}
          </button>
        </form>

        <div className="mt-4">
          <Link
            href="/auth/login"
            className="block w-full rounded-full border border-gray-300 py-3 text-center text-sm font-semibold text-gray-800 hover:bg-gray-50 transition"
          >
            Hai già un account? Login
          </Link>
        </div>
      </div>
    </div>
  );
}
