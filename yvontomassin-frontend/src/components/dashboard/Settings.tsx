"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FiCamera, FiEye, FiEyeOff, FiLock, FiSave, FiUser,
} from "react-icons/fi";
import baseApi from "@/src/api/baseApi";
import { ENDPOINTS } from "@/src/api/endPoints";
import { useProfile } from "@/src/context/ProfileContext";
import { toast } from "sonner";
import { getImageUrl } from "@/src/lib/imageUrl";

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  profileImage?: string;
  is_admin: boolean;
}

export default function Settings() {
  const { setProfileImage, setProfileName } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile]         = useState<UserProfile | null>(null);
  const [loading, setLoading]         = useState(true);

  // Name form
  const [name, setName]               = useState("");
  const [savingName, setSavingName]   = useState(false);

  // Image
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [savingImg, setSavingImg]     = useState(false);

  // Password
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass]         = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPass, setSavingPass]   = useState(false);

  // ─── Fetch /user/me ──────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await baseApi.get(ENDPOINTS.userMe);
      const data: UserProfile = res.data?.data;
      setProfile(data);
      setName(data.name ?? "");
      // Seed context so admin header reflects stored data immediately
      if (data.profileImage) setProfileImage(data.profileImage);
      if (data.name)         setProfileName(data.name);
    } catch {
      toast.error("Impossibile caricare il profilo.");
    } finally {
      setLoading(false);
    }
  }, [setProfileImage, setProfileName]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // ─── Image file pick ─────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  // ─── Save image ──────────────────────────────────────────────────────────────
  async function handleSaveImage() {
    if (!imageFile || !profile) return;
    setSavingImg(true);
    try {
      const fd = new FormData();
      fd.append("profileImage", imageFile);
      fd.append("data", JSON.stringify({}));
      const res = await baseApi.patch(`${ENDPOINTS.userById}/${profile._id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const updated: UserProfile = res.data?.data;
      if (updated?.profileImage) {
        setProfile((p) => p ? { ...p, profileImage: updated.profileImage } : p);
        setProfileImage(updated.profileImage!);
      }
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Immagine profilo aggiornata!");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Aggiornamento immagine fallito.");
    } finally {
      setSavingImg(false);
    }
  }

  // ─── Save name ───────────────────────────────────────────────────────────────
  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Il nome è obbligatorio."); return; }
    if (!profile) return;
    setSavingName(true);
    try {
      const fd = new FormData();
      fd.append("data", JSON.stringify({ name: name.trim() }));
      const res = await baseApi.patch(`${ENDPOINTS.userById}/${profile._id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const updated: UserProfile = res.data?.data;
      setProfile((p) => p ? { ...p, name: updated.name } : p);
      setProfileName(updated.name);          // ← syncs admin header instantly
      toast.success("Nome aggiornato con successo!");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Aggiornamento nome fallito.");
    } finally {
      setSavingName(false);
    }
  }

  // ─── Change password ─────────────────────────────────────────────────────────
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPass) { toast.error("Inserisci la password attuale."); return; }
    if (newPass.length < 6) { toast.error("La nuova password deve avere almeno 6 caratteri."); return; }
    if (newPass !== confirmPass) { toast.error("Le password non coincidono."); return; }
    setSavingPass(true);
    try {
      await baseApi.post(ENDPOINTS.changePassword, {
        oldPassword: currentPass,
        newPassword: newPass,
      });
      setCurrentPass(""); setNewPass(""); setConfirmPass("");
      toast.success("Password aggiornata con successo!");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Modifica password fallita.");
    } finally {
      setSavingPass(false);
    }
  }

  // ─── Derived avatar ───────────────────────────────────────────────────────────
  const avatarSrc = imagePreview
    ?? getImageUrl(profile?.profileImage);

  // ─── Skeleton ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-auto w-full space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-slate-200" />
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-slate-200" />
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-slate-200" />
              <div className="h-3 w-48 rounded bg-slate-100" />
            </div>
          </div>
          <div className="h-11 rounded-lg bg-slate-100" />
          <div className="h-10 w-32 ml-auto rounded-xl bg-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full space-y-6">

      {/* ── Page title ── */}
      <div>
        <h1 className="text-[30px] leading-none font-semibold tracking-[-0.02em] text-slate-900 sm:text-[34px] md:text-[38px]">
          Impostazioni
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Gestisci il tuo profilo e la sicurezza del tuo account.
        </p>
      </div>

      {/* ── Profile image + name ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        {/* Avatar row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative h-16 w-16 shrink-0">
            <div className="h-16 w-16 rounded-full border-2 border-slate-200 bg-slate-100 overflow-hidden">
              {avatarSrc ? (
                <img src={avatarSrc} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-bold text-slate-500">
                  {profile?.name?.charAt(0).toUpperCase() ?? "U"}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Cambia foto profilo"
              className="absolute -right-0.5 -bottom-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#8F00FF] text-white shadow transition hover:bg-[#7A00E5]"
            >
              <FiCamera className="text-[11px]" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="min-w-0">
            <p className="text-[24px] leading-none font-semibold text-slate-900 sm:text-[26px]">
              Informazioni sul profilo
            </p>
            <p className="mt-2 text-[13px] text-slate-500">
              Aggiorna i tuoi dati personali e il modo in cui gli altri ti vedono.
            </p>
          </div>
        </div>

        {/* New image save / cancel */}
        {imageFile && (
          <div className="mt-4 flex items-center gap-3 rounded-lg bg-[#8F00FF]/5 px-4 py-3 border border-[#8F00FF]/20">
            <p className="text-[12px] text-slate-600 flex-1 truncate">
              Foto selezionata: <span className="font-semibold">{imageFile.name}</span>
            </p>
            <button
              onClick={handleSaveImage}
              disabled={savingImg}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#8F00FF] px-4 text-[12px] font-semibold text-white hover:bg-[#7A00E5] disabled:opacity-60 transition"
            >
              {savingImg ? "Salvataggio..." : "Salva foto"}
            </button>
            <button
              onClick={() => { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              className="text-[12px] text-slate-400 hover:text-slate-600"
            >
              Annulla
            </button>
          </div>
        )}

        {/* Name form */}
        <form onSubmit={handleSaveName} className="mt-6 grid gap-4">
          <div>
            <label className="mb-2 inline-flex items-center gap-2 text-[12px] font-semibold text-slate-700">
              <FiUser className="text-[12px] text-slate-500" /> Nome e cognome
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13px] text-slate-700 outline-none transition focus:border-[#8F00FF] focus:bg-white focus:ring-2 focus:ring-[#8F00FF]/20"
              placeholder="Il tuo nome"
              required
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingName}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#8F00FF] px-7 text-[12px] font-semibold text-white shadow-[0_8px_22px_-12px_rgba(143,0,255,0.8)] transition hover:bg-[#7A00E5] sm:w-auto disabled:opacity-60"
            >
              <FiSave className="text-sm" />
              {savingName ? "Salvataggio..." : "Salva modifiche"}
            </button>
          </div>
        </form>
      </section>

      {/* ── Security heading ── */}
      <section>
        <h2 className="text-[34px] leading-none font-semibold tracking-[-0.02em] text-slate-900">
          Sicurezza
        </h2>
        <p className="mt-1 text-[13px] text-slate-500">Aggiorna password</p>
      </section>

      {/* ── Password form ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <form onSubmit={handleChangePassword} className="grid gap-4">

          {/* Current password */}
          <div>
            <label className="mb-2 inline-flex items-center gap-2 text-[12px] font-semibold text-slate-700">
              <FiLock className="text-[12px] text-slate-500" /> Password attuale
            </label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                placeholder="••••••••"
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 pr-10 text-[13px] text-slate-700 outline-none transition focus:border-[#8F00FF] focus:bg-white focus:ring-2 focus:ring-[#8F00FF]/20"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                aria-label={showCurrent ? "Nascondi" : "Mostra"}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
              >
                {showCurrent ? <FiEyeOff className="text-[14px]" /> : <FiEye className="text-[14px]" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="mb-2 block text-[12px] font-semibold text-slate-700">
              Nuova password
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="••••••••"
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 pr-10 text-[13px] text-slate-700 outline-none transition focus:border-[#8F00FF] focus:bg-white focus:ring-2 focus:ring-[#8F00FF]/20"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                aria-label={showNew ? "Nascondi" : "Mostra"}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
              >
                {showNew ? <FiEyeOff className="text-[14px]" /> : <FiEye className="text-[14px]" />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label className="mb-2 block text-[12px] font-semibold text-slate-700">
              Conferma nuova password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="••••••••"
                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 pr-10 text-[13px] text-slate-700 outline-none transition focus:border-[#8F00FF] focus:bg-white focus:ring-2 focus:ring-[#8F00FF]/20"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? "Nascondi" : "Mostra"}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
              >
                {showConfirm ? <FiEyeOff className="text-[14px]" /> : <FiEye className="text-[14px]" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingPass}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#8F00FF] px-7 text-[12px] font-semibold text-white shadow-[0_8px_22px_-12px_rgba(143,0,255,0.8)] transition hover:bg-[#7A00E5] sm:w-auto disabled:opacity-60"
            >
              <FiLock className="text-sm" />
              {savingPass ? "Aggiornamento..." : "Aggiorna password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
