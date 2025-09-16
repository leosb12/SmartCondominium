// src/pages/GestionarMulta.tsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import DashboardLayout from "../Layouts/DashboardLayout";

/**
 * Página: Gestionar Multa (vía endpoints Django)
 * - Sección A: Crear nuevo "Tipo de multa"
 * - Sección B: Generar multa (Propiedad + Tipo + fecha + monto)
 * - Sección C: Listado "Todas las multas"
 *
 * Paleta: tonos azul oscuro sobre fondo oscuro (Tailwind)
 */

type TipoMulta = { id: number; nombre: string };

type Propiedad = {
  id: number;
  nombre?: string | null;
  codigo?: string | null;
  numero?: string | number | null;
  torre?: string | null;
  piso?: string | number | null;
  [k: string]: any;
};

type Multa = {
  id: number;
  propiedad_id: number;
  tipo_multa_id: number;
  fecha: string; // "YYYY-MM-DD"
  total: number;
  propiedad?: Propiedad | null;
  tipo_multa?: TipoMulta | null;
  [k: string]: any;
};

export default function GestionarMulta() {
  // UI state
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [err, setErr] = useState<string>("");

  // Catálogos
  const [tipos, setTipos] = useState<TipoMulta[]>([]);
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);

  // Listado de multas
  const [multas, setMultas] = useState<Multa[]>([]);
  const [loadingMultas, setLoadingMultas] = useState(false);

  // Crear Tipo de Multa
  const [nuevoTipo, setNuevoTipo] = useState<string>("");
  const [creatingTipo, setCreatingTipo] = useState(false);

  // Generar Multa
  const [form, setForm] = useState({
    propiedad_id: "",
    tipo_multa_id: "",
    fecha: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
    total: "",
    observacion: "",
  });
  const [creatingMulta, setCreatingMulta] = useState(false);

  // Helpers
  const propiedadLabel = (p: Propiedad) => {
    if (p?.nombre) return `${p.nombre} (#${p.id})`;
    if (p?.codigo) return `${p.codigo} (#${p.id})`;
    const piezas: string[] = [];
    if (p?.torre) piezas.push(`Torre ${p.torre}`);
    if (p?.piso) piezas.push(`Piso ${p.piso}`);
    if (p?.numero) piezas.push(`Nro ${p.numero}`);
    const base = piezas.length ? piezas.join(" · ") : `Propiedad`;
    return `${base} #${p?.id}`;
  };

  const canCreateMulta = useMemo(() => {
    return (
      !!form.propiedad_id &&
      !!form.tipo_multa_id &&
      !!form.fecha &&
      form.total !== "" &&
      !isNaN(Number(form.total))
    );
  }, [form]);

  // Carga inicial
  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      setErr("");
      try {
        const [tiposRes, propsRes] = await Promise.all([
          api.get<TipoMulta[]>("/tipo-multa/"),
          api.get<Propiedad[]>("/propiedades/"),
        ]);
        setTipos((tiposRes.data || []).sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setPropiedades(propsRes.data || []);
      } catch (e: any) {
        console.error(e);
        setErr(e?.response?.data?.detail || e?.message || "Error cargando catálogos");
      } finally {
        setLoading(false);
      }
    };

    const cargarMultas = async () => {
      setLoadingMultas(true);
      try {
        const multasRes = await api.get<Multa[]>("/multas/");
        setMultas(multasRes.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingMultas(false);
      }
    };

    bootstrap();
    cargarMultas();
  }, []);

  // Acciones
  const handleCreateTipo = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setMsg("");
    setErr("");
    if (!nuevoTipo.trim()) {
      setErr("Ingresa un nombre de tipo de multa.");
      return;
    }
    try {
      setCreatingTipo(true);
      const res = await api.post<TipoMulta[] | TipoMulta>("/tipo-multa/", { nombre: nuevoTipo.trim() });
      const creado = Array.isArray(res.data) ? res.data[0] : (res.data as any);
      if (creado) {
        setTipos((prev) => [...prev, creado as TipoMulta].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        setNuevoTipo("");
        setMsg("Tipo de multa creado.");
      }
    } catch (e: any) {
      console.error(e);
      setErr(e?.response?.data?.detail || e?.message || "No se pudo crear el tipo de multa.");
    } finally {
      setCreatingTipo(false);
    }
  };

  const handleCreateMulta = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setMsg("");
    setErr("");
    if (!canCreateMulta) {
      setErr("Completa los campos requeridos.");
      return;
    }
    try {
      setCreatingMulta(true);
      const payload = {
        propiedad_id: Number(form.propiedad_id),
        tipo_multa_id: Number(form.tipo_multa_id),
        fecha: form.fecha,
        total: Number(form.total),
      };
      const res = await api.post<Multa | Multa[]>("/multas/", payload);

      let nueva: Multa | undefined;
      if (Array.isArray(res.data)) nueva = res.data[0];
      else nueva = res.data as Multa;

      if (nueva) {
        setMultas((prev) => [nueva!, ...prev]);
      } else {
        const rec = await api.get<Multa[]>("/multas/");
        setMultas(rec.data || []);
      }

      setMsg("Multa generada correctamente.");
      setForm((f) => ({ ...f, tipo_multa_id: "", total: "", observacion: "" }));
    } catch (e: any) {
      console.error(e);
      setErr(e?.response?.data?.detail || e?.message || "No se pudo generar la multa.");
    } finally {
      setCreatingMulta(false);
    }
  };

  const renderPropiedad = (m: Multa) => {
    if (m.propiedad) return propiedadLabel(m.propiedad);
    const p = propiedades.find((x) => x.id === m.propiedad_id);
    return p ? propiedadLabel(p) : `Propiedad #${m.propiedad_id}`;
  };

  const renderTipo = (m: Multa) => {
    if (m.tipo_multa) return m.tipo_multa?.nombre;
    const t = tipos.find((x) => x.id === m.tipo_multa_id);
    return t ? t.nombre : `Tipo #${m.tipo_multa_id}`;
  };

  return (
    <DashboardLayout title="Gestionar multas" subtitle="Crea tipos de multa, genera nuevas multas y revisa el historial.">
      {/* Feedback global */}
      <div className="px-6 sm:px-10 mt-4 space-y-2">
        {msg && (
          <div className="rounded-lg border border-blue-700/50 bg-blue-900/30 px-4 py-3 text-sm">
            {msg}
          </div>
        )}
        {err && (
          <div className="rounded-lg border border-red-700/50 bg-red-900/30 px-4 py-3 text-sm">
            {err}
          </div>
        )}
      </div>

      {/* Contenido */}
      <main className="px-6 sm:px-10 py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* === Card: Crear nuevo tipo de multa === */}
          <section className="rounded-2xl border border-blue-900/50 bg-slate-900/60 shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Crear nuevo tipo de multa</h2>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Define categorías como "Ruido", "Mora", "Uso indebido de áreas comunes", etc.
              </p>

              <form onSubmit={handleCreateTipo} className="mt-5 space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Nombre del tipo</label>
                  <input
                    type="text"
                    value={nuevoTipo}
                    onChange={(e) => setNuevoTipo(e.target.value)}
                    placeholder="Ej. Ruido excesivo"
                    className="w-full rounded-xl bg-slate-950/70 border border-blue-900/60 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={creatingTipo}
                    className="rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 transition px-4 py-2 text-sm font-medium"
                  >
                    {creatingTipo ? "Creando…" : "Crear tipo"}
                  </button>
                  <span className="text-xs text-slate-400">Se agrega al catálogo inmediatamente.</span>
                </div>
              </form>

              {/* Listado de tipos existentes */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-slate-300 mb-2">Tipos existentes</h3>
                <div className="flex flex-wrap gap-2">
                  {loading && <span className="text-xs text-slate-500">Cargando…</span>}
                  {!loading && tipos.length === 0 && (
                    <span className="text-xs text-slate-500">Aún no hay tipos.</span>
                  )}
                  {tipos.map((t) => (
                    <span
                      key={t.id}
                      className="text-xs rounded-full bg-blue-900/40 border border-blue-800/60 px-3 py-1"
                    >
                      {t.nombre}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* === Card: Generar multa === */}
          <section className="rounded-2xl border border-blue-900/50 bg-slate-900/60 shadow-xl">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Generar multa</h2>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Selecciona la propiedad, el tipo y el monto. Puedes crear el tipo antes si no existe.
              </p>

              <form onSubmit={handleCreateMulta} className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Propiedad */}
                <div className="sm:col-span-2">
                  <label className="block text-sm text-slate-300 mb-1">Propiedad</label>
                  <select
                    value={form.propiedad_id}
                    onChange={(e) => setForm((f) => ({ ...f, propiedad_id: e.target.value }))}
                    className="w-full rounded-xl bg-slate-950/70 border border-blue-900/60 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">— Selecciona —</option>
                    {propiedades.map((p) => (
                      <option key={p.id} value={p.id}>
                        {propiedadLabel(p)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tipo de multa */}
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Tipo de multa</label>
                  <select
                    value={form.tipo_multa_id}
                    onChange={(e) => setForm((f) => ({ ...f, tipo_multa_id: e.target.value }))}
                    className="w-full rounded-xl bg-slate-950/70 border border-blue-900/60 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">— Selecciona —</option>
                    {tipos.map((t) => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Fecha */}
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                    className="w-full rounded-xl bg-slate-950/70 border border-blue-900/60 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                {/* Monto */}
                <div className="sm:col-span-2">
                  <label className="block text-sm text-slate-300 mb-1">Monto (total)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder="0.00"
                    value={form.total}
                    onChange={(e) => setForm((f) => ({ ...f, total: e.target.value }))}
                    className="w-full rounded-xl bg-slate-950/70 border border-blue-900/60 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                {/* Observación (solo UI) */}
                <div className="sm:col-span-2">
                  <label className="block text-sm text-slate-300 mb-1">Observación (opcional)</label>
                  <textarea
                    rows={3}
                    placeholder="Ej. reincidencia, evidencia, etc. (no se guarda aún en BD)"
                    value={form.observacion}
                    onChange={(e) => setForm((f) => ({ ...f, observacion: e.target.value }))}
                    className="w-full rounded-xl bg-slate-950/70 border border-blue-900/60 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Si deseas persistir este campo, añadimos <code>observacion</code> en <code>multas</code>.
                  </p>
                </div>

                <div className="sm:col-span-2 flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={!canCreateMulta || creatingMulta}
                    className="rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 transition px-4 py-2 text-sm font-medium"
                  >
                    {creatingMulta ? "Generando…" : "Generar multa"}
                  </button>
                  {!canCreateMulta && (
                    <span className="text-xs text-slate-400">Completa los campos requeridos.</span>
                  )}
                </div>
              </form>
            </div>
          </section>
        </div>

        {/* === Card: Todas las multas === */}
        <section className="rounded-2xl border border-blue-900/50 bg-slate-900/60 shadow-xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">Todas las multas</h2>
              {loadingMultas && <span className="text-xs text-slate-500">Cargando…</span>}
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800/60">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-950/50 text-slate-300">
                    <th className="text-left px-4 py-3 border-b border-slate-800/60">ID</th>
                    <th className="text-left px-4 py-3 border-b border-slate-800/60">Propiedad</th>
                    <th className="text-left px-4 py-3 border-b border-slate-800/60">Tipo</th>
                    <th className="text-left px-4 py-3 border-b border-slate-800/60">Fecha</th>
                    <th className="text-right px-4 py-3 border-b border-slate-800/60">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {multas.length === 0 && !loadingMultas && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                        No hay multas registradas.
                      </td>
                    </tr>
                  )}
                  {multas.map((m) => (
                    <tr key={m.id} className="even:bg-slate-950/30 hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3">{m.id}</td>
                      <td className="px-4 py-3">{renderPropiedad(m)}</td>
                      <td className="px-4 py-3">{renderTipo(m)}</td>
                      <td className="px-4 py-3">{m.fecha}</td>
                      <td className="px-4 py-3 text-right">
                        {Number(m.total).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-slate-500 mt-3">
              Si tu endpoint de <code>/multas/</code> usa paginación (DRF), podemos añadir controles con <code>?page=</code>.
            </p>
          </div>
        </section>
      </main>
    </DashboardLayout>
  );
}
