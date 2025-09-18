// src/pages/GestionarMulta.tsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import DashboardLayout from "../Layouts/DashboardLayout";
import { useAdminCheck } from "../hooks/useRoles";

/**
 * Página: Gestionar Multa (vía endpoints Django) — SOLO ADMIN
 * - Crear Tipo de Multa
 * - Generar Multa
 * - Listado con "Ver detalles" (observación, estado pagada/impaga, editar/eliminar)
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
  observacion?: string | null;
  propiedad?: Propiedad | null;
  tipo_multa?: TipoMulta | null;
  [k: string]: any;
};

export default function GestionarMulta() {
  // 🔐 Solo admins
  const { isAdmin, loading: adminLoading } = useAdminCheck();

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

  // Estado de pago: Set de IDs pagadas
  const [pagadasIds, setPagadasIds] = useState<Set<number>>(new Set());

  // Filas expandidas y edición
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ fecha: string; total: string; observacion: string }>({
    fecha: "",
    total: "",
    observacion: "",
  });

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

  const isPagada = (m: Multa) => pagadasIds.has(m.id);
  const estadoChip = (m: Multa) =>
    isPagada(m) ? (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-700/60 bg-emerald-900/30 px-2 py-0.5 text-xs">
        <span className="size-2 rounded-full bg-emerald-500" /> Pagada
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-700/60 bg-amber-900/30 px-2 py-0.5 text-xs">
        <span className="size-2 rounded-full bg-amber-400" /> Impaga
      </span>
    );

  // Carga inicial — solo si es admin
  useEffect(() => {
    if (!isAdmin) return;

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

    const cargarMultasYEstados = async () => {
      setLoadingMultas(true);
      try {
        const [multasRes, pagadasRes] = await Promise.all([
          api.get<Multa[]>("/multas/"),
          api.get<Multa[]>("/multas/pagadas/"),
        ]);
        setMultas(multasRes.data || []);
        const setIds = new Set<number>((pagadasRes.data || []).map((x: Multa) => x.id));
        setPagadasIds(setIds);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingMultas(false);
      }
    };

    bootstrap();
    cargarMultasYEstados();
  }, [isAdmin]);

  // Acciones: crear tipo
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

  // Acciones: crear multa
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
        // observacion es opcional; si tu backend aún no lo soporta, lo ignorará
        ...(form.observacion?.trim() ? { observacion: form.observacion.trim() } : {}),
      };
      const res = await api.post<Multa | Multa[]>("/multas/", payload);

      let nueva: Multa | undefined;
      if (Array.isArray(res.data)) nueva = res.data[0];
      else nueva = res.data as Multa;

      if (nueva) {
        setMultas((prev) => [nueva!, ...prev]);
        // al crear no hay pago → marcar como impaga
        setPagadasIds((old) => {
          const copy = new Set(old);
          copy.delete(nueva!.id);
          return copy;
        });
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

  // Acciones: expandir/colapsar
  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Acciones: eliminar
  const handleDelete = async (m: Multa) => {
    const seguro = confirm(`¿Eliminar la multa #${m.id}?`);
    if (!seguro) return;
    setErr("");
    setMsg("");
    try {
      await api.delete(`/multas/${m.id}/`);
      setMultas((prev) => prev.filter((x) => x.id !== m.id));
      setPagadasIds((old) => {
        const copy = new Set(old);
        copy.delete(m.id);
        return copy;
      });
      setMsg(`Multa #${m.id} eliminada.`);
    } catch (e: any) {
      console.error(e);
      setErr(e?.response?.data?.detail || e?.message || "No se pudo eliminar la multa.");
    }
  };

  // Acciones: iniciar edición
  const startEdit = (m: Multa) => {
    setEditingId(m.id);
    setEditForm({
      fecha: m.fecha ?? "",
      total: String(m.total ?? ""),
      observacion: (m.observacion ?? "") as string,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  // Acciones: guardar edición
  const saveEdit = async (m: Multa) => {
    setErr("");
    setMsg("");
    try {
      const patch: any = {};
      if (editForm.fecha && editForm.fecha !== m.fecha) patch.fecha = editForm.fecha;
      if (editForm.total !== "" && Number(editForm.total) !== Number(m.total))
        patch.total = Number(editForm.total);
      if ((editForm.observacion || "") !== (m.observacion || "")) patch.observacion = editForm.observacion || null;

      if (Object.keys(patch).length === 0) {
        setEditingId(null);
        return;
      }

      const res = await api.patch<Multa>(`/multas/${m.id}/`, patch);
      const actualizado = res.data;

      setMultas((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...actualizado } : x)));
      setEditingId(null);
      setMsg(`Multa #${m.id} actualizada.`);
    } catch (e: any) {
      console.error(e);
      setErr(e?.response?.data?.detail || e?.message || "No se pudo actualizar la multa.");
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

  // 🔒 Gate de acceso en UI
  if (adminLoading) {
    return (
      <DashboardLayout title="Gestionar multas">
        <div className="p-6 text-slate-400">Verificando rol de administrador…</div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Acceso denegado">
        <div className="p-6 text-red-400">Esta sección es solo para administradores.</div>
      </DashboardLayout>
    );
  }

  // ✅ Render solo para admins
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

                {/* Observación (opcional) */}
                <div className="sm:col-span-2">
                  <label className="block text-sm text-slate-300 mb-1">Observación (opcional)</label>
                  <textarea
                    rows={3}
                    placeholder="Ej. reincidencia, evidencia, etc."
                    value={form.observacion}
                    onChange={(e) => setForm((f) => ({ ...f, observacion: e.target.value }))}
                    className="w-full rounded-xl bg-slate-950/70 border border-blue-900/60 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={!canCreateMulta || creatingMulta}
                    className="rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 transition px-4 py-2 text-sm font-medium"
                  >
                    {creatingMulta ? "Generando…" : "Generar multa"}
                  </button>
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
                    <th className="text-center px-4 py-3 border-b border-slate-800/60 w-40">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {multas.length === 0 && !loadingMultas && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                        No hay multas registradas.
                      </td>
                    </tr>
                  )}

                  {multas.map((m) => {
                    const isOpen = expanded.has(m.id);
                    const isEditing = editingId === m.id;
                    return (
                      <React.Fragment key={m.id}>
                        <tr className="even:bg-slate-950/30 hover:bg-slate-800/30 transition">
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
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => toggleExpand(m.id)}
                              className="rounded-lg border border-blue-800/60 bg-blue-900/30 hover:bg-blue-900/50 px-3 py-1 text-xs"
                            >
                              {isOpen ? "Ocultar detalles" : "Ver detalles de multa"}
                            </button>
                          </td>
                        </tr>

                        {/* Fila de detalles expandibles */}
                        {isOpen && (
                          <tr className="bg-slate-950/40">
                            <td colSpan={6} className="px-6 py-4">
                              {!isEditing ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <div className="text-sm">
                                      <span className="text-slate-400">Estado: </span>
                                      {estadoChip(m)}
                                    </div>
                                    <div className="text-sm">
                                      <span className="text-slate-400">Observación: </span>
                                      <span className="text-slate-200">
                                        {m.observacion?.trim() ? m.observacion : "–"}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 md:justify-end">
                                    <button
                                      onClick={() => startEdit(m)}
                                      className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-medium"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      onClick={() => handleDelete(m)}
                                      className="rounded-lg bg-rose-600 hover:bg-rose-500 px-3 py-1.5 text-xs font-medium"
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                // Formulario de edición inline
                                <div className="rounded-xl border border-slate-800/60 p-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                      <label className="block text-xs text-slate-400 mb-1">Fecha</label>
                                      <input
                                        type="date"
                                        value={editForm.fecha}
                                        onChange={(e) => setEditForm((f) => ({ ...f, fecha: e.target.value }))}
                                        className="w-full rounded-lg bg-slate-950/70 border border-blue-900/60 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-slate-400 mb-1">Total</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={editForm.total}
                                        onChange={(e) => setEditForm((f) => ({ ...f, total: e.target.value }))}
                                        className="w-full rounded-lg bg-slate-950/70 border border-blue-900/60 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600"
                                      />
                                    </div>
                                    <div className="sm:col-span-3">
                                      <label className="block text-xs text-slate-400 mb-1">Observación</label>
                                      <textarea
                                        rows={3}
                                        value={editForm.observacion}
                                        onChange={(e) =>
                                          setEditForm((f) => ({ ...f, observacion: e.target.value }))
                                        }
                                        placeholder="Añade observaciones…"
                                        className="w-full rounded-lg bg-slate-950/70 border border-blue-900/60 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600"
                                      />
                                    </div>
                                  </div>

                                  <div className="mt-4 flex items-center gap-2">
                                    <button
                                      onClick={() => saveEdit(m)}
                                      className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-medium"
                                    >
                                      Guardar
                                    </button>
                                    <button
                                      onClick={cancelEdit}
                                      className="rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-1.5 text-xs font-medium"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </DashboardLayout>
  );
}
