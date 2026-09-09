'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { getCurrentUser, logout, type AuthUser } from '@/src/lib/authService';
import { useProfile } from '@/src/context/ProfileContext';
import { toast } from 'sonner';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { profileImage } = useProfile();

  // Read user from token on mount and on route change
  useEffect(() => {
    setUser(getCurrentUser());
  }, [pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setDropdownOpen(false);
    toast.success("Uscita effettuata con successo.");
    router.push('/');
    router.refresh();
  };

  const isAdmin = user?.is_admin === true;

  // Avatar — shows profile image if available, otherwise initial letter
  const Avatar = () =>
    profileImage ? (
      <img
        src={profileImage}
        alt="avatar"
        className="h-full w-full object-cover rounded-full"
      />
    ) : (
      <span>{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</span>
    );

  return (
    <header className="bg-white shadow-sm">
      <div className="mx-auto flex lg:max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-2xl font-semibold tracking-wide text-[#8F00FF] sm:text-3xl"
        >
          GUIDA NUTRIZIONALE GRANMASTER
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-4 text-base font-medium text-gray-700 md:flex">
          <Link
            href="/"
            className={`mt-2 inline-flex items-center justify-center rounded-full px-6 py-2 text-sm font-semibold shadow-sm ${
              pathname === '/'
                ? 'bg-[#8F00FF] text-white hover:bg-[#7A00E5]'
                : 'border border-[#8F00FF] text-[#8F00FF]'
            }`}
          >
            Casa
          </Link>

          <Link
            href="/mealPlans"
            className={`mt-2 inline-flex items-center justify-center rounded-full px-6 py-2 text-sm font-semibold shadow-sm ${
              pathname === '/mealPlans'
                ? 'bg-[#8F00FF] text-white hover:bg-[#7A00E5]'
                : 'border border-[#8F00FF] text-[#8F00FF]'
            }`}
          >
            Piani pasto
          </Link>
        </nav>

        {/* Right side: profile or register */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="relative" ref={dropdownRef}>
              {/* Profile avatar button */}
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center justify-center h-10 w-10 rounded-full bg-[#8F00FF] text-white font-semibold text-sm hover:bg-[#7A00E5] transition focus:outline-none focus:ring-2 focus:ring-[#8F00FF] focus:ring-offset-2 overflow-hidden"
                aria-label="Profilo utente"
                aria-expanded={dropdownOpen}
              >
                <Avatar />
              </button>

              {/* Dropdown */}
              {dropdownOpen && (
                <div className="absolute right-0 top-12 z-50 w-48 rounded-xl bg-white shadow-lg border border-gray-100 py-1 overflow-hidden">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>

                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-[#8F00FF]/10 hover:text-[#8F00FF] transition"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profilo
                  </Link>

                  <Link
                    href="/savedMeals"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-[#8F00FF]/10 hover:text-[#8F00FF] transition"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    Pasti salvati
                  </Link>

                  {isAdmin && (
                    <Link
                      href="/admin/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-[#8F00FF]/10 hover:text-[#8F00FF] transition"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                      </svg>
                      Dashboard
                    </Link>
                  )}

                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Esci
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/auth/login"
              className="rounded-full bg-[#8F00FF] px-8 py-2 text-base font-semibold text-white shadow-md hover:bg-[#7A00E5]"
            >
              Accedi
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="inline-flex items-center justify-center rounded-full border border-[#8F00FF]/20 p-2 text-[#8F00FF] md:hidden"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
        >
          <span className="sr-only">Apri menu</span>
          <svg
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {isMenuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu overlay */}
      <div
        id="mobile-menu"
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden ${
          isMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setIsMenuOpen(false)}
        aria-hidden={!isMenuOpen}
      >
        <div
          className={`absolute right-4 top-20 w-[90%] max-w-sm rounded-2xl bg-white p-6 shadow-xl transition-transform ${
            isMenuOpen ? 'translate-y-0' : '-translate-y-4'
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <nav className="flex flex-col gap-4 text-base font-medium text-gray-700">
            <Link
              href="/"
              className={`rounded-full px-3 py-1 transition-colors ${
                pathname === '/'
                  ? 'bg-[#8F00FF]/10 text-[#8F00FF]'
                  : 'text-gray-900 hover:bg-[#8F00FF]/10 hover:text-[#8F00FF]'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Casa
            </Link>

            <Link
              href="/mealPlans"
              className={`rounded-full px-3 py-1 transition-colors ${
                pathname.startsWith('/mealPlans')
                  ? 'bg-[#8F00FF]/10 text-[#8F00FF]'
                  : 'text-gray-900 hover:bg-[#8F00FF]/10 hover:text-[#8F00FF]'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Piani pasto
            </Link>

            {user ? (
              <>
                <Link
                  href="/savedMeals"
                  className={`rounded-full px-3 py-1 transition-colors ${
                    pathname.startsWith('/savedMeals')
                      ? 'bg-[#8F00FF]/10 text-[#8F00FF]'
                      : 'text-gray-900 hover:bg-[#8F00FF]/10 hover:text-[#8F00FF]'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Pasti salvati
                </Link>
                <Link
                  href="/profile"
                  className="rounded-full px-3 py-1 text-gray-900 hover:bg-[#8F00FF]/10 hover:text-[#8F00FF] transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Profilo
                </Link>

                {isAdmin && (
                  <Link
                    href="/admin/dashboard"
                    className="rounded-full px-3 py-1 text-gray-900 hover:bg-[#8F00FF]/10 hover:text-[#8F00FF] transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                )}

                <button
                  onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                  className="mt-2 inline-flex items-center justify-center rounded-full border border-red-300 px-6 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition"
                >
                  Esci
                </button>
              </>
            ) : (
              <Link
                href="/auth/register"
                className="mt-2 inline-flex items-center justify-center rounded-full bg-[#8F00FF] px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#7A00E5]"
                onClick={() => setIsMenuOpen(false)}
              >
                Registrati
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
