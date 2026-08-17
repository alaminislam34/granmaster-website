'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import img1 from '../../assets/image.svg';
import { login } from '@/src/lib/authService';
import { toast } from 'sonner';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
      toast.success("Accesso effettuato con successo!");
      // Redirect to home after successful login
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg = axiosErr?.response?.data?.message || 'Accesso fallito. Controlla le credenziali.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f6f4] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-10 shadow-xl">
        <div className="flex justify-center">
          <img src={img1.src} alt="Guida Nutrizionale" className="h-30 w-70" />
        </div>

        <div className="text-center mt-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Bentornato</h2>
          <p className="text-sm text-gray-600 mt-2">Accedi al tuo santuario del benessere.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Indirizzo e-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Inserisci la tua email"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#8F00FF] focus:bg-white transition"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-gray-700">Password</label>
              <Link
                href="/auth/forget"
                className="text-xs text-gray-500 hover:text-[#8F00FF] transition"
              >
                Ha dimenticato la password?
              </Link>
            </div>
            <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 transition focus-within:ring-2 focus-within:ring-[#8F00FF] focus-within:bg-white focus-within:border-[#8F00FF]">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className="flex-1 bg-transparent px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none"
                required
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

          <div className="flex items-center">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 accent-green-800"
            />
            <label htmlFor="remember" className="ml-2 text-xs text-gray-600">
              Resta collegato
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#8F00FF] py-3 text-sm font-semibold text-white shadow-md hover:bg-[#7A00E5] transition disabled:opacity-60"
          >
            {loading ? 'Accesso in corso...' : 'accesso →'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-gray-400">
          <div className="h-px flex-1 bg-gray-200" />
          o
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <p className="text-center text-xs text-gray-600">
          Nuovo qui?{' '}
          <Link href="/auth/register" className="font-semibold text-gray-800 hover:underline">
            Crea un account
          </Link>
        </p>
      </div>
    </div>
  );
}
