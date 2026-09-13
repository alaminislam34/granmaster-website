"use client";

import Link from "next/link";
import { getCurrentUser } from "@/src/lib/authService";

const STEPS = [
  { n: "1", title: "Scegli i pasti", text: "Colazione, merenda, pranzo e cena." },
  { n: "2", title: "Scegli la porzione", text: "Piccola, media o grande. Niente calcoli." },
  { n: "3", title: "Vedi il piano", text: "Il menù della giornata è pronto." },
];

export default function EmptyPlan({ error }: { error?: string }) {
  const loggedIn = Boolean(getCurrentUser());

  return (
    <section className="flex flex-1 flex-col items-center justify-center bg-[#f5f4f0] px-4 py-8">
      <div className="w-full max-w-3xl">
        <div className="rounded-3xl border border-white/80 bg-white px-6 py-10 text-center shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] sm:px-12 sm:py-12">
          <img
            src="/brand/logo-mark.png"
            alt=""
            className="mx-auto h-16 w-16 object-contain"
          />

          {error ? (
            <>
              <h1 className="mt-6 text-2xl font-semibold text-[#23422A]">
                Non riusciamo a caricare il piano
              </h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-gray-500">
                {error}
              </p>
            </>
          ) : (
            <>
              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8F00FF]">
                GranMaster
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-[#23422A] sm:text-3xl">
                {loggedIn ? "Il tuo piano non c’è ancora" : "Inizia dalla home"}
              </h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-gray-500">
                {loggedIn
                  ? "Crea la giornata in un minuto: scegli quanti pasti e la porzione. Il resto lo prepariamo noi."
                  : "Accedi oppure vai alla home per creare il tuo piano nutrizionale."}
              </p>
            </>
          )}

          {!error && (
            <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
              {STEPS.map((step) => (
                <div
                  key={step.n}
                  className="rounded-2xl border border-gray-100 bg-[#faf9f6] px-4 py-4"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#8F00FF] text-xs font-bold text-white">
                    {step.n}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-gray-900">{step.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">{step.text}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex min-w-[200px] items-center justify-center rounded-full bg-[#8F00FF] px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7A00E5]"
            >
              Crea il tuo piano
            </Link>
            {!loggedIn && (
              <Link
                href="/auth/login"
                className="inline-flex min-w-[200px] items-center justify-center rounded-full border border-gray-200 bg-white px-8 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#8F00FF] hover:text-[#8F00FF]"
              >
                Accedi
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
