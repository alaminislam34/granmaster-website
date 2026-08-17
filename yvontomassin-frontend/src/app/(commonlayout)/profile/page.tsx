"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiCamera, FiSave, FiUser, FiMail, FiPhone, FiMapPin, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import baseApi from "@/src/api/baseApi";
import { ENDPOINTS } from "@/src/api/endPoints";
import { getCurrentUser } from "@/src/lib/authService";
import { useProfile } from "@/src/context/ProfileContext";
import { toast } from "sonner";
import { getImageUrl } from "@/src/lib/imageUrl";

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  profileImage?: string;
  role: string;
  is_admin: boolean;
  isVerified: boolean;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { setProfileImage, setProfileName } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Info form
  const [form, setForm] = useState({ name: "", phone: "", address: "", city: "" });
  const [savingInfo, setSavingInfo] = useState(false);

  // Image
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [savingImage, setSavingImage] = useState(false);

  // Password
  const [passwords, setPasswords] = useState({ current: "", newPass: "", confirm: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  // ─── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const user = getCurrentUser();
    if (!user) { router.replace("/auth/login"); }
  }, [router]);

  // ─── Fetch profile ────────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await baseApi.get(ENDPOINTS.userMe);
      const data: UserProfile = res.data?.data;
      setProfile(data);
      setForm({
        name: data.name ?? "",
        phone: data.phone === "N/A" ? "" : (data.phone ?? ""),
        address: data.address === "N/A" ? "" : (data.address ?? ""),
        city: data.city === "N/A" ? "" : (data.city ?? ""),
      });
      // Sync header image from DB on first load
      if (data.profileImage) {
        setProfileImage(data.profileImage);
      }
      if (data.name) {
        setProfileName(data.name);
      }
    } catch {
      toast.error("Impossibile caricare il profilo.");
    } finally {
      setLoading(false);
    }
  }, [setProfileImage, setProfileName]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // ─── Image file select ────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  // ─── Save profile image ───────────────────────────────────────────────────────
  async function handleSaveImage() {
    if (!imageFile || !profile) return;
    setSavingImage(true);
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
      toast.success("Immagine profilo aggiornata!");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Aggiornamento immagine fallito.");
    } finally {
      setSavingImage(false);
    }
  }

  // ─── Save info ────────────────────────────────────────────────────────────────
  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    if (!form.name.trim()) { toast.error("Il nome è obbligatorio."); return; }
    setSavingInfo(true);
    try {
      const fd = new FormData();
      fd.append("data", JSON.stringify({
        name: form.name.trim(),
        phone: form.phone.trim() || "N/A",
        address: form.address.trim() || "N/A",
        city: form.city.trim() || "N/A",
      }));
      const res = await baseApi.patch(`${ENDPOINTS.userById}/${profile._id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const updated: UserProfile = res.data?.data;
      setProfile((p) => p ? { ...p, ...updated } : p);
      if (updated?.name) setProfileName(updated.name);   // sync header
      toast.success("Profilo aggiornato con successo!");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Aggiornamento profilo fallito.");
    } finally {
      setSavingInfo(false);
    }
  }

  // ─── Change password ──────────────────────────────────────────────────────────
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!passwords.current) { toast.error("Inserisci la password attuale."); return; }
    if (passwords.newPass.length < 6) { toast.error("La nuova password deve avere almeno 6 caratteri."); return; }
    if (passwords.newPass !== passwords.confirm) { toast.error("Le password non coincidono."); return; }
    setSavingPass(true);
    try {
      await baseApi.post(ENDPOINTS.changePassword, {
        oldPassword: passwords.current,
        newPassword: passwords.newPass,
      });
      setPasswords({ current: "", newPass: "", confirm: "" });
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

  // ─── Loading skeleton ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#8F00FF] border-t-transparent" />
          <p className="mt-3 text-sm text-gray-500">Caricamento profilo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f6f4f1] min-h-screen py-10">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 space-y-6">

        {/* ── Header card ── */}
        <div className="rounded-3xl bg-white shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)] overflow-hidden">
          {/* Banner */}
          <div className="h-32 bg-gradient-to-r from-[#8F00FF] to-[#b44fff]" />

          <div className="px-6 pb-8 sm:px-10">
            {/* Avatar */}
            <div className="relative -mt-14 mb-4 inline-block">
              <div className="h-24 w-24 rounded-full border-4 border-white bg-[#8F00FF] shadow-lg overflow-hidden">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-white">
                    {profile?.name?.charAt(0).toUpperCase() ?? "U"}
                  </div>
                )}
              </div>

              {/* Camera button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#8F00FF] text-white shadow-md hover:bg-[#7A00E5] transition"
                aria-label="Cambia foto profilo"
              >
                <FiCamera className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Save image button — only visible when a new file is chosen */}
            {imageFile && (
              <div className="mb-4 flex items-center gap-3">
                <p className="text-sm text-gray-500">
                  Nuova foto selezionata: <span className="font-medium text-gray-800">{imageFile.name}</span>
                </p>
                <button
                  onClick={handleSaveImage}
                  disabled={savingImage}
                  className="rounded-lg bg-[#8F00FF] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#7A00E5] disabled:opacity-60 transition"
                >
                  {savingImage ? "Salvataggio..." : "Salva foto"}
                </button>
                <button
                  onClick={() => { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="text-sm text-gray-400 hover:text-gray-600"
                >
                  Annulla
                </button>
              </div>
            )}

            <h1 className="text-2xl font-semibold text-gray-900">{profile?.name}</h1>
            <p className="text-sm text-gray-500">{profile?.email}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-full bg-[#8F00FF]/10 px-3 py-0.5 text-xs font-semibold text-[#8F00FF]">
                {profile?.is_admin ? "Admin" : "Utente"}
              </span>
              {profile?.isVerified && (
                <span className="rounded-full bg-green-100 px-3 py-0.5 text-xs font-semibold text-green-700">
                  ✓ Verificato
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Info form ── */}
        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Informazioni personali</h2>
            <p className="mt-1 text-sm text-gray-500">Aggiorna i tuoi dati personali.</p>
          </div>

          <form onSubmit={handleSaveInfo} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              {/* Name */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                  <FiUser className="text-[#8F00FF]" /> Nome completo
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-gray-900 outline-none transition focus:border-[#8F00FF] focus:bg-white focus:ring-2 focus:ring-[#8F00FF]/20"
                  placeholder="Il tuo nome"
                  required
                />
              </div>

              {/* Email — read-only */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                  <FiMail className="text-[#8F00FF]" /> Email
                </label>
                <input
                  type="email"
                  value={profile?.email ?? ""}
                  readOnly
                  className="h-11 w-full rounded-lg border border-gray-100 bg-gray-100 px-4 text-sm text-gray-400 outline-none cursor-not-allowed"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                  <FiPhone className="text-[#8F00FF]" /> Telefono
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-gray-900 outline-none transition focus:border-[#8F00FF] focus:bg-white focus:ring-2 focus:ring-[#8F00FF]/20"
                  placeholder="+39 000 000 0000"
                />
              </div>

              {/* City */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                  <FiMapPin className="text-[#8F00FF]" /> Città
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-gray-900 outline-none transition focus:border-[#8F00FF] focus:bg-white focus:ring-2 focus:ring-[#8F00FF]/20"
                  placeholder="Milano"
                />
              </div>
            </div>

            {/* Address — full width */}
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                <FiMapPin className="text-[#8F00FF]" /> Indirizzo
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-gray-900 outline-none transition focus:border-[#8F00FF] focus:bg-white focus:ring-2 focus:ring-[#8F00FF]/20"
                placeholder="Via Roma 1, 20100"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingInfo}
                className="inline-flex items-center gap-2 rounded-lg bg-[#8F00FF] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#7A00E5] disabled:opacity-60 transition"
              >
                <FiSave className="h-4 w-4" />
                {savingInfo ? "Salvataggio..." : "Salva modifiche"}
              </button>
            </div>
          </form>
        </div>

        {/* ── Change password ── */}
        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Sicurezza</h2>
            <p className="mt-1 text-sm text-gray-500">Aggiorna la tua password.</p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-5">
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                <FiLock className="text-[#8F00FF]" /> Password attuale
              </label>
              <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 transition focus-within:ring-2 focus-within:ring-[#8F00FF] focus-within:bg-white focus-within:border-[#8F00FF]">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={passwords.current}
                  onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
                  className="flex-1 bg-transparent px-4 py-3 text-sm text-gray-900 outline-none placeholder-gray-400"
                  placeholder="Password attuale"
                />
                <button type="button" onClick={() => setShowCurrent((v) => !v)} className="px-3 cursor-pointer text-gray-400 hover:text-[#8F00FF] transition">
                  {showCurrent ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                  <FiLock className="text-[#8F00FF]" /> Nuova password
                </label>
                <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 transition focus-within:ring-2 focus-within:ring-[#8F00FF] focus-within:bg-white focus-within:border-[#8F00FF]">
                  <input
                    type={showNew ? "text" : "password"}
                    value={passwords.newPass}
                    onChange={(e) => setPasswords((p) => ({ ...p, newPass: e.target.value }))}
                    className="flex-1 bg-transparent px-4 py-3 text-sm text-gray-900 outline-none placeholder-gray-400"
                    placeholder="Nuova password"
                  />
                  <button type="button" onClick={() => setShowNew((v) => !v)} className="px-3 cursor-pointer text-gray-400 hover:text-[#8F00FF] transition">
                    {showNew ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                  <FiLock className="text-[#8F00FF]" /> Conferma password
                </label>
                <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 transition focus-within:ring-2 focus-within:ring-[#8F00FF] focus-within:bg-white focus-within:border-[#8F00FF]">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={passwords.confirm}
                    onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                    className="flex-1 bg-transparent px-4 py-3 text-sm text-gray-900 outline-none placeholder-gray-400"
                    placeholder="Conferma password"
                  />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)} className="px-3 cursor-pointer text-gray-400 hover:text-[#8F00FF] transition">
                    {showConfirm ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingPass}
                className="inline-flex items-center gap-2 rounded-lg bg-[#8F00FF] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#7A00E5] disabled:opacity-60 transition"
              >
                <FiSave className="h-4 w-4" />
                {savingPass ? "Salvataggio..." : "Aggiorna password"}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
