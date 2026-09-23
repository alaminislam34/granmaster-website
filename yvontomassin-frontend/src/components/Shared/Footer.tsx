import Link from "next/link";
import React from "react";

export default function Footer() {
  return (
    <footer className="border-t border-black/5 bg-[#f5f4f0]">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-6 py-8 text-xs lg:text-base text-gray-600 sm:flex-row sm:gap-3 sm:py-4">
        <div className="text-base font-bold tracking-wide text-gray-800 sm:text-xs sm:font-medium">GRANMASTER CUT</div>
        <nav className="hidden items-center gap-6 sm:flex">
          <Link href="#" className="hover:text-gray-800">
            Privacy Policy
          </Link>
          <Link href="#" className="hover:text-gray-800">
            Terms of Service
          </Link>
        </nav>
        <div className="hidden text-center leading-relaxed text-gray-500 sm:block sm:text-left sm:text-gray-600">
          © 2026 GRANMASTER CUT. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
