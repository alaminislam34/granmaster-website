"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { FiLogOut, FiMenu, FiX } from 'react-icons/fi';
import {
  PiSquaresFourBold,
  PiForkKnifeBold,
  PiWarningDiamondBold,
  PiGearBold,
} from 'react-icons/pi';
import { getCurrentUser, logout } from '@/src/lib/authService';
import { useProfile } from '@/src/context/ProfileContext';
import { toast } from 'sonner';

const navItems = [
  { label: 'Pannello di controllo', href: '/admin/dashboard', icon: PiSquaresFourBold },
  { label: 'Piani nutrizionali', href: '/admin/nutrition', icon: PiForkKnifeBold },
  { label: 'Catalogo sgarro', href: '/admin/cheatMeals', icon: PiWarningDiamondBold },
  { label: 'Impostazioni', href: '/admin/settings', icon: PiGearBold },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profileImage, profileName, setProfileImage, setProfileName } = useProfile();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // Seed context from JWT token on mount (name) and localStorage (image already handled by context)
  useEffect(() => {
    const user = getCurrentUser();
    if (user?.name && !profileName) setProfileName(user.name);
  }, [profileName, setProfileName]);

  const handleLogout = async () => {
    await logout();
    // Clear profile context cache
    setProfileImage(null);
    setProfileName(null);
    toast.success("Uscita effettuata con successo.");
    router.push('/');
    router.refresh();
  };

  // Derive display values
  const displayName = profileName ?? getCurrentUser()?.name ?? "Admin";
  const displayInitial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen md:grid-cols-[280px_1fr]">

        {isMobileMenuOpen && (
          <button
            className="fixed inset-0 z-30 bg-slate-900/40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu overlay"
          />
        )}

        {/* ── Sidebar ── */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-70 transform flex-col overflow-hidden border-r border-slate-200 bg-white px-6 py-8 transition-transform duration-300 md:sticky md:top-0 md:z-auto md:flex md:h-screen md:translate-x-0 ${isMobileMenuOpen ? 'flex translate-x-0' : 'hidden -translate-x-full'
            }`}
        >
          <div className="pb-10">
            <div className="flex items-start justify-between md:block">
              <div>
                <div className="text-3xl font-bold tracking-tight text-slate-900">
                  NUTRIZIONALE <span className="text-[#8F00FF]">GRANMASTER</span>
                </div>
                <p className="mt-3 text-sm text-slate-500">Portale di gestione</p>
              </div>
              <button
                className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 md:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close sidebar"
              >
                <FiX className="text-xl" />
              </button>
            </div>
          </div>

          <nav className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname?.startsWith(item.href) ?? false;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-3 rounded-2xl px-4 py-3 transition ${isActive
                    ? 'bg-[#8F00FF]/10 text-[#8F00FF] shadow-sm ring-1 ring-[#8F00FF]/20'
                    : 'text-slate-700 hover:bg-[#8F00FF]/10 hover:text-[#8F00FF]'
                    }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className={`text-lg transition ${isActive ? 'text-[#8F00FF]' : 'text-slate-400 group-hover:text-[#8F00FF]'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-8">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-red-50 hover:text-red-600"
            >
              <FiLogOut className="text-base text-slate-500" />
              Esci
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex min-h-screen flex-col">
          {/* Top header */}
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4">
            <div className="flex items-center justify-between ">
              {/* Left side actions */}
              <div className="flex items-center  justify-between">
                <button
                  className="rounded-xl p-2 text-slate-700 transition hover:bg-slate-100 md:hidden"
                  onClick={() => setIsMobileMenuOpen(true)}
                  aria-label="Open sidebar"
                >
                  <FiMenu className="text-xl" />
                </button>

                {/* Go to website button */}
                <Link
                  href="/"
                  className="flex items-center rounded-xl px-3 py-2 text-sm font-medium 
  bg-slate-100 text-slate-700
  transition
  hover:bg-[#8F00FF]/10 hover:text-[#8F00FF]
  active:scale-95 active:shadow-sm"
                >
                  Go to website
                </Link>
              </div>



              {/* Profile chip */}
              <Link
                href="/admin/settings"
                className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-slate-50"
              >
                <div className="min-w-0 text-right">
                  <div className="whitespace-nowrap text-sm font-semibold text-slate-900">
                    {displayName}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                    Administrator
                  </div>
                </div>

                {/* Avatar */}
                <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-white shadow-sm ring-2 ring-[#8F00FF]/40 shrink-0">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt="avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#8F00FF] text-sm font-bold text-white">
                      {displayInitial}
                    </div>
                  )}
                </div>
              </Link>
            </div>
          </header>

          <section className="flex-1 overflow-hidden bg-slate-50 px-6 py-6">
            {children}
          </section>
        </main>
      </div>
    </div>
  );
}
