'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { resetPassword } from '@/src/lib/authService';
import { toast } from 'sonner';

function ResetPassForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const code = searchParams.get('code') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    setError('');
    if (!password) {
      setError('Inserisci una nuova password');
      return;
    }
    if (password !== confirm) {
      setError('Le password non corrispondono');
      return;
    }
    if (!email || !code) {
      setError('Sessione scaduta. Ricomincia dal passaggio email.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email, code, password);
      toast.success("Password reimpostata con successo!");
      setSuccess(true);
      setTimeout(() => router.push('/auth/login'), 2000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg = axiosErr?.response?.data?.message || 'Reimpostazione fallita. Riprova.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#f7f6f4] flex items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-2xl bg-white p-10 shadow-xl text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 mx-auto">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Password reimpostata!</h2>
          <p className="mt-2 text-sm text-gray-500">Reindirizzamento al login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  flex items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-10 shadow-xl">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          {/* <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#8F00FF]/10 text-[#8F00FF]">
            <FiEyeOff className="h-7 w-7" />
          </div> */}
        </div>

        <h2 className="text-center text-2xl font-semibold text-gray-900">
          Reimposta la password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500">
          Inserisci la nuova password per il tuo account.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-4">
          {/* New password */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Nuova password
            </label>
            <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 transition focus-within:ring-2 focus-within:ring-[#8F00FF] focus-within:bg-white focus-within:border-[#8F00FF]">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Inserisci la nuova password"
                className="flex-1 bg-transparent px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="px-3 cursor-pointer text-gray-400 hover:text-[#8F00FF] transition"
                aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
              >
                {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Conferma password
            </label>
            <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 transition focus-within:ring-2 focus-within:ring-[#8F00FF] focus-within:bg-white focus-within:border-[#8F00FF]">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Ripeti la nuova password"
                className="flex-1 bg-transparent px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="px-3 cursor-pointer text-gray-400 hover:text-[#8F00FF] transition"
                aria-label={showConfirm ? 'Nascondi password' : 'Mostra password'}
              >
                {showConfirm ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            onClick={handleReset}
            disabled={loading}
            className="mt-2 w-full rounded-full bg-[#8F00FF] px-4 py-3 text-sm font-semibold text-white hover:bg-[#7A00E5] disabled:opacity-60 transition"
          >
            {loading ? 'Reimpostazione in corso...' : 'Reimposta password'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResetPass() {
  return (
    <Suspense>
      <ResetPassForm />
    </Suspense>
  );
}
