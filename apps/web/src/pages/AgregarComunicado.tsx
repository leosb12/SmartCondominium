// src/pages/AgregarComunicado.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../Layouts/DashboardLayout";
import { Megaphone, Upload, CalendarClock, Clock, FileText, Image as ImageIcon, XCircle } from "lucide-react";
import { api } from "../services/api";
import { supabase } from "../lib/supabaseClient";
import { useRoles } from "../hooks/useRoles";

type FormState = {
  titulo: string;
  contenido: string;
  file?: File | null;
  publicarAhora: boolean;
  scheduledLocal?: string | null; // datetime-local string
  expiresLocal?: string | null;   // datetime-local string
};

function sanitizeName(name: string) {
  return name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9._-]/g, "_");
}

const AgregarComunicado: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useRoles();

  const [form, setForm] = useState<FormState>({
    titulo: "",
    contenido: "",
    file: null,
    publicarAhora: true,
    scheduledLocal: "",
    expiresLocal: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Al montar la página: si hay tokens del backend, inicializa la sesión de supabase-js
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) return;

        const access_token = localStorage.getItem("access_token");
        const refresh_token =
          localStorage.getItem("refresh_token") ||
          localStorage.getItem("refreshToken");

        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }
      } catch {
        // silencioso
      }
    })();
  }, []);

  // Convierte un valor de <input type="datetime-local" /> a ISO UTC (con Z)
  const toUtcIso = (local?: string | null) =>
    local ? new Date(local).toISOString() : undefined;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setForm((prev) => ({ ...prev, file: f }));
  };

  async function uploadPortadaIfNeeded(file?: File | null): Promise<string | undefined> {
    if (!file) return undefined;

    // Cinturón y tirantes: asegura que supabase-js está autenticado antes del upload
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const access_token = localStorage.getItem("access_token");
      const refresh_token =
        localStorage.getItem("refresh_token") ||
        localStorage.getItem("refreshToken");
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
      }
    }

const uniqueName = `${Date.now()}_${sanitizeName(file.name)}`;
const { error } = await supabase.storage
  .from("comunicados")
  .upload(uniqueName, file, { upsert: false });
if (error) throw error;
return uniqueName; 
}// este será portada_path

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return; // guard extra (el backend también valida)

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Validaciones mínimas en frontend
      const titulo = form.titulo.trim();
      const contenido = form.contenido.trim();
      if (!titulo) throw new Error("El título es requerido");
      if (!contenido) throw new Error("El contenido es requerido");

      // Subir portada si hay archivo
      const portada_path = await uploadPortadaIfNeeded(form.file);

      const payload: Record<string, any> = {
  titulo,
  contenido,
  portada_path,
  ...(portada_path ? { portada_bucket: "comunicados" } : {}),
  // Si publicarAhora es true, NO enviamos scheduled_for para publicar ahora
  scheduled_for: form.publicarAhora ? undefined : toUtcIso(form.scheduledLocal),
  expires_at: form.expiresLocal ? toUtcIso(form.expiresLocal) : undefined,
};

      const res = await api.post("/comunicados/", payload);
      if (res?.data?.success) {
        setSuccessMsg("Comunicado creado correctamente.");
        // Pequeño delay para que el usuario lea el mensaje
        setTimeout(() => navigate("/comunicacion/historial"), 600);
      } else {
        throw new Error(res?.data?.error || "Error al crear el comunicado");
      }
    } catch (err: any) {
  const msg =
    err?.response?.data?.error || // error que devuelve Django/DRF
    err?.message ||
    "Error al crear el comunicado";
  setErrorMsg(msg);
} finally {
      setSubmitting(false);
    }
  }

  if (!isAdmin) {
    // Si el hook dice que no es admin, mostramos un mensaje claro
    return (
      <DashboardLayout
        title="Nuevo Comunicado"
        subtitle="Solo administradores pueden publicar comunicados"
        icon={<Megaphone className="h-5 w-5 text-blue-400" />}
      >
        <div className="rounded-2xl border border-slate-800/60 bg-slate-950 p-6">
          <div className="flex items-center gap-3 text-red-400">
            <XCircle className="h-5 w-5" />
            <p>No tienes permisos para acceder a esta sección.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Nuevo Comunicado"
      subtitle="Crea y publica un comunicado ahora o prográmalo para más tarde"
      icon={<Megaphone className="h-5 w-5 text-blue-400" />}
    >
      {/* Contenedor */}
      <div className="rounded-2xl border border-slate-800/60 bg-gradient-to-br from-slate-900 to-slate-950 p-6 md:p-8 shadow-xl">
        {/* Mensajes */}
        {errorMsg && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-300">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-300">
            {successMsg}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6">
          {/* Título */}
          <div>
            <label className="mb-1 block text-sm text-slate-300">Título</label>
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-blue-400" />
              <input
                type="text"
                name="titulo"
                value={form.titulo}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/60"
                placeholder="Ej: Corte de agua programado"
              />
            </div>
          </div>

          {/* Contenido */}
          <div>
            <label className="mb-1 block text-sm text-slate-300">Contenido</label>
            <textarea
              name="contenido"
              value={form.contenido}
              onChange={handleChange}
              rows={5}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/60"
              placeholder="Describe los detalles del comunicado…"
            />
          </div>

          {/* Portada (archivo) */}
          <div>
            <label className="mb-1 block text-sm text-slate-300">Portada (opcional)</label>
            <div className="flex items-center gap-3">
              <ImageIcon className="h-4 w-4 text-blue-400" />
              <input
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="block w-full text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-300 hover:file:bg-blue-600/30"
              />
            </div>
          </div>

          {/* Publicar ahora / Programar */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <label className="flex items-center gap-3 text-slate-200">
                <input
                  type="checkbox"
                  name="publicarAhora"
                  checked={form.publicarAhora}
                  onChange={handleChange}
                  className="h-4 w-4 accent-blue-500"
                />
                <span>Publicar ahora</span>
              </label>
              <p className="mt-1 text-xs text-slate-400">
                Si está activo, el comunicado se publica inmediatamente.
              </p>
            </div>

            {/* Programar (datetime-local) */}
            {!form.publicarAhora && (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <label className="mb-1 block text-sm text-slate-300">Programar para</label>
                <div className="flex items-center gap-3">
                  <CalendarClock className="h-4 w-4 text-blue-400" />
                  <input
                    type="datetime-local"
                    name="scheduledLocal"
                    value={form.scheduledLocal || ""}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/60"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Se publicará automáticamente en esa fecha/hora.
                </p>
              </div>
            )}
          </div>

          {/* Vencimiento (opcional) */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <label className="mb-1 block text-sm text-slate-300">Vence el (opcional)</label>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-blue-400" />
              <input
                type="datetime-local"
                name="expiresLocal"
                value={form.expiresLocal || ""}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/60"
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              El comunicado dejará de mostrarse después de esta fecha.
            </p>
          </div>

          {/* Acciones */}
          <div className="mt-2 flex items-center gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600/90 px-5 py-2.5 text-sm font-semibold text-white ring-1 ring-inset ring-blue-500/40 hover:bg-blue-600 disabled:opacity-60"
            >
              <Upload className="h-4 w-4" />
              {submitting ? "Publicando..." : "Publicar"}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-900/60"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default AgregarComunicado;
