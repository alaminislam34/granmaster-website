"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  FiTrash2, FiEye, FiSearch,
  FiChevronLeft, FiChevronRight, FiUsers, FiUserCheck,
  FiUserX, FiShield,
} from "react-icons/fi";
import baseApi from "@/src/api/baseApi";
import { ENDPOINTS } from "@/src/api/endPoints";
import { toast } from "sonner";
import { getImageUrl } from "@/src/lib/imageUrl";
import Modal from "@/src/components/Shared/Modal";
import ConfirmModal from "@/src/components/Shared/ConfirmModal";
import Bone from "@/src/components/Shared/Bone";
import { UserTableRowSkeleton } from "@/src/components/Shared/skeletons";
const PAGE_SIZE = 8;

// ─── Types ────────────────────────────────────────────────────────────────────
interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  role: string;
  is_admin: boolean;
  status: "active" | "in-progress" | "blocked";
  isVerified: boolean;
  profileImage?: string;
  createdAt: string;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: User["status"] }) {
  const map = {
    active:      "bg-emerald-100 text-emerald-700",
    "in-progress": "bg-amber-100 text-amber-700",
    blocked:     "bg-red-100 text-red-600",
  };
  const label = { active: "Attivo", "in-progress": "In attesa", blocked: "Bloccato" };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${map[status]}`}>
      {label[status]}
    </span>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function UserAvatar({ user, size = "sm" }: { user: User; size?: "sm" | "lg" }) {
  const dim = size === "lg" ? "h-16 w-16 text-2xl" : "h-8 w-8 text-xs";
  const src = getImageUrl(user.profileImage);
  return (
    <div className={`${dim} shrink-0 overflow-hidden rounded-full bg-[#8F00FF] flex items-center justify-center font-bold text-white`}>
      {src
        ? <img src={src} alt={user.name} className="h-full w-full object-cover" />
        : user.name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── View modal ───────────────────────────────────────────────────────────────
function ViewModal({ user, onClose }: { user: User; onClose: () => void }) {
  const rows: [string, string][] = [
    ["Email",     user.email],
    ["Telefono",  user.phone === "N/A" ? "—" : user.phone],
    ["Città",     user.city === "N/A" ? "—" : user.city],
    ["Indirizzo", user.address === "N/A" ? "—" : user.address],
    ["Ruolo",     user.is_admin ? "Admin" : "Utente"],
    ["Registrato", new Date(user.createdAt).toLocaleDateString("it-IT")],
  ];

  return (
    <Modal open onClose={onClose} title="Dettagli utente" size="md">
        <div className="flex items-center gap-4">
          <UserAvatar user={user} size="lg" />
          <div>
            <p className="text-lg font-semibold text-slate-900">{user.name}</p>
            <StatusBadge status={user.status} />
            {user.is_admin && (
              <span className="ml-1.5 rounded-full bg-[#8F00FF]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#8F00FF]">
                Admin
              </span>
            )}
          </div>
        </div>

        <div className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-100">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-slate-500">{label}</span>
              <span className="font-medium text-slate-800 text-right max-w-[60%] truncate">{value}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
        >
          Chiudi
        </button>
    </Modal>
  );
}

// ─── Edit modal ───────────────────────────────────────────────────────────────
function EditModal({
  user,
  onClose,
  onSaved,
}: {
  user: User;
  onClose: () => void;
  onSaved: (updated: User) => void;
}) {
  const [form, setForm] = useState({
    name:    user.name,
    phone:   user.phone === "N/A" ? "" : user.phone,
    city:    user.city === "N/A" ? "" : user.city,
    address: user.address === "N/A" ? "" : user.address,
    status:  user.status,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Il nome è obbligatorio."); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("data", JSON.stringify({
        name:    form.name.trim(),
        phone:   form.phone.trim() || "N/A",
        city:    form.city.trim()  || "N/A",
        address: form.address.trim() || "N/A",
        status:  form.status,
      }));
      const res = await baseApi.patch(`${ENDPOINTS.userById}/${user._id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSaved(res.data?.data as User);
      toast.success("Utente aggiornato!");
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Aggiornamento fallito.");
    } finally {
      setSaving(false);
    }
  }

  const field = (label: string, key: keyof typeof form, type = "text") => (
    <div key={key}>
      <label className="mb-1.5 block text-[12px] font-semibold text-slate-600">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13px] outline-none transition focus:border-[#8F00FF] focus:bg-white"
      />
    </div>
  );

  return (
    <Modal open onClose={onClose} title="Modifica utente" size="md">
        <form onSubmit={handleSave} className="space-y-3">
          {field("Nome completo", "name")}
          {field("Telefono",      "phone", "tel")}
          {field("Città",         "city")}
          {field("Indirizzo",     "address")}

          <div>
            <label className="mb-1.5 block text-[12px] font-semibold text-slate-600">Stato</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as User["status"] }))}
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[13px] outline-none transition focus:border-[#8F00FF]"
            >
              <option value="active">Attivo</option>
              <option value="in-progress">In attesa</option>
              <option value="blocked">Bloccato</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl px-5 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-100 transition">
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#8F00FF] px-5 py-2 text-[12px] font-semibold text-white hover:bg-[#7A00E5] disabled:opacity-60 transition"
            >
              {saving ? "Salvataggio..." : "Salva modifiche"}
            </button>
          </div>
        </form>
    </Modal>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [users, setUsers]       = useState<User[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [page, setPage]         = useState(1);

  // Modals
  const [viewUser, setViewUser]       = useState<User | null>(null);
  const [editUser, setEditUser]       = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting]       = useState(false);

  // ── Fetch all users ──────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await baseApi.get(ENDPOINTS.users);
      setUsers(res.data?.data ?? []);
    } catch {
      toast.error("Impossibile caricare gli utenti.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Delete ───────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await baseApi.delete(`${ENDPOINTS.userById}/${deleteTarget._id}`);
      setUsers((prev) => prev.filter((u) => u._id !== deleteTarget._id));
      toast.success("Utente eliminato.");
      setDeleteTarget(null);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message || "Eliminazione fallita.");
    } finally {
      setDeleting(false);
    }
  }

  // ── Filter + paginate ────────────────────────────────────────────────────────
  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Stats ────────────────────────────────────────────────────────────────────
  const total    = users.length;
  const active   = users.filter((u) => u.status === "active").length;
  const blocked  = users.filter((u) => u.status === "blocked").length;
  const admins   = users.filter((u) => u.is_admin).length;

  const statCards = [
    { label: "Utenti totali",   value: total,   icon: FiUsers,     color: "bg-[#8F00FF]/10 text-[#8F00FF]" },
    { label: "Attivi",          value: active,  icon: FiUserCheck, color: "bg-emerald-100 text-emerald-700" },
    { label: "Bloccati",        value: blocked, icon: FiUserX,     color: "bg-red-100 text-red-600" },
    { label: "Amministratori",  value: admins,  icon: FiShield,    color: "bg-amber-100 text-amber-700" },
  ];

  return (
    <>
      <div className="space-y-6">

        {/* ── Stat cards ── */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {statCards.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-2xl grid  border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{s.label}</p>
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${s.color}`}>
                    <Icon className="text-base" />
                  </span>
                </div>
                <p className="mt-3 text-[32px] font-semibold leading-none text-slate-900">
                  {loading ? <Bone className="inline-block h-7 w-10" /> : s.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* ── Users table ── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Table header */}
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-[16px] font-semibold text-slate-800">Gestione utenti</h2>
              <p className="mt-0.5 text-[12px] text-slate-500">Visualizza, modifica ed elimina gli utenti.</p>
            </div>
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                type="text"
                placeholder="Cerca per nome o email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-[12px] outline-none transition focus:border-[#8F00FF] focus:bg-white"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-5 py-3">Utente</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Stato</th>
                  <th className="px-5 py-3">Ruolo</th>
                  <th className="px-5 py-3">Registrato</th>
                  <th className="px-5 py-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px] text-slate-700">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <UserTableRowSkeleton key={i} />
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                      Nessun utente trovato.
                    </td>
                  </tr>
                ) : paginated.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={user} />
                        <span className="font-semibold text-slate-900 whitespace-nowrap">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{user.email}</td>
                    <td className="px-5 py-3"><StatusBadge status={user.status} /></td>
                    <td className="px-5 py-3">
                      {user.is_admin
                        ? <span className="rounded-full bg-[#8F00FF]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#8F00FF]">Admin</span>
                        : <span className="text-slate-400 text-[12px]">Utente</span>}
                    </td>
                    <td className="px-5 py-3 text-slate-400 whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString("it-IT")}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View */}
                        <button
                          onClick={() => setViewUser(user)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          aria-label="Visualizza"
                        >
                          <FiEye className="text-sm" />
                        </button>
                        {/* Edit */}
                        {/* <button
                          onClick={() => setEditUser(user)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          aria-label="Modifica"
                        >
                          <FiEdit2 className="text-sm" />
                        </button> */}
                        {/* Delete */}
                        <button
                          onClick={() => setDeleteTarget(user)}
                          disabled={deleting && deleteTarget?._id === user._id}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                          aria-label="Elimina"
                        >
                          <FiTrash2 className="text-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <span>
              Mostrando {paginated.length} di {filtered.length} utenti
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-full border border-slate-200 p-1.5 hover:bg-slate-50 disabled:opacity-40"
              >
                <FiChevronLeft />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`h-6 w-6 rounded-full text-[11px] font-semibold transition ${page === p ? "bg-[#8F00FF] text-white" : "hover:bg-slate-100"}`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-full border border-slate-200 p-1.5 hover:bg-slate-50 disabled:opacity-40"
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ── Modals ── */}
      {viewUser && <ViewModal user={viewUser} onClose={() => setViewUser(null)} />}

      {editUser && (
        <EditModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={(updated) => {
            setUsers((prev) => prev.map((u) => u._id === updated._id ? { ...u, ...updated } : u));
            setEditUser(null);
          }}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => { if (!deleting) setDeleteTarget(null); }}
        onConfirm={() => void handleDelete()}
        loading={deleting}
        title="Eliminare questo utente?"
        description={
          <>
            Stai per eliminare{" "}
            <span className="font-semibold text-slate-800">{deleteTarget?.name}</span>.
            <br />
            Questa azione è <span className="font-medium text-red-600">irreversibile</span>.
          </>
        }
      />
    </>
  );
}
