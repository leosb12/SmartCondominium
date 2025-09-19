// apps/web/src/pages/GestionarExpensa.tsx
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Plus,
  CreditCard,
  X,
  AlertCircle,
  CheckCircle2,
  Search,
  CalendarClock,
  CircleDollarSign,
} from "lucide-react";

import DashboardLayout from "../Layouts/DashboardLayout";
import { expensaService } from "../services/ExpensaService";
import type { Expensa, HistItem } from "../services/ExpensaService";

/* ========== helpers ========== */
const cls = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(" ");

const chipColor = (estado?: string) => {
  switch (estado) {
    case "PAGADO":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "VENCIDO":
      return "bg-rose-100 text-rose-700 border-rose-200";
    case "PENDIENTE":
    default:
      return "bg-amber-100 text-amber-700 border-amber-200";
  }
};

const errMsg = (e: unknown) =>
  e instanceof Error ? e.message : typeof e === "string" ? e : "";

/* ========== UI: Toast ========== */
function Toast({
  kind = "info",
  title,
  message,
  onClose,
}: {
  kind?: "info" | "success" | "error";
  title: string;
  message?: string;
  onClose: () => void;
}) {
  const icon =
    kind === "success" ? (
      <CheckCircle2 className="w-5 h-5" />
    ) : (
      <AlertCircle className="w-5 h-5" />
    );
  const base =
    kind === "success"
      ? "bg-emerald-600"
      : kind === "error"
      ? "bg-rose-600"
      : "bg-slate-700";
  return (
    <div
      className={cls(
        "fixed bottom-6 right-6 z-50 text-white shadow-xl rounded-xl px-4 py-3 flex items-center gap-3",
        base
      )}
    >
      {icon}
      <div>
        <div className="font-semibold">{title}</div>
        {message && <div className="text-white/80 text-sm">{message}</div>}
      </div>
      <button className="ml-2 opacity-80 hover:opacity-100" onClick={onClose}>
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

/* ========== página ========== */
export default function GestionarExpensa() {
  const [loading, setLoading] = useState(false);
  const [expensas, setExpensas] = useState<Expensa[]>([]);
  const [propFilter, setPropFilter] = useState("");
  const [selected, setSelected] = useState<Expensa | null>(null);
  const [historial, setHistorial] = useState<HistItem[]>([]);
  const [toast, setToast] = useState<{
    kind: "success" | "error" | "info";
    title: string;
    message?: string;
  } | null>(null);

  // modal abonar
  const [showPay, setShowPay] = useState(false);
  const [payAmount, setPayAmount] = useState("");

  // modal crear (TODOS obligatorios según tu serializer)
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    propiedad_id: "",
    fecha: new Date().toISOString().slice(0, 10), // yyyy-mm-dd
    total: "",
    tarifa_id: "",
    fecha_vencimiento: new Date().toISOString().slice(0, 10),
  });

  const fetchExpensas = async () => {
    setLoading(true);
    try {
      const data = await expensaService.list(propFilter);
      setExpensas(data);
    } catch (e: unknown) {
      setToast({
        kind: "error",
        title: "Error cargando expensas",
        message: errMsg(e),
      });
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (e: Expensa) => {
    setSelected(e);
    try {
      const hist = await expensaService.historial(e.id);
      setHistorial(hist);
    } catch (e: unknown) {
      setToast({
        kind: "error",
        title: "No se pudo cargar el historial",
        message: errMsg(e),
      });
    }
  };

  const handlePay = async () => {
    if (!selected) return;
    const monto = parseFloat(payAmount);
    if (!(monto > 0)) {
      setToast({ kind: "error", title: "Monto inválido" });
      return;
    }
    try {
      setLoading(true);
      const resp = await expensaService.abonar(selected.id, monto);
      setToast({
        kind: "success",
        title: "Abono registrado",
        message: `Pago #${resp?.resultado?.[0]?.pago_id ?? ""}`,
      });
      setShowPay(false);
      setPayAmount("");
      await fetchExpensas();
      const upd = await expensaService.detail(selected.id);
      setSelected(upd);
      const hist = await expensaService.historial(selected.id);
      setHistorial(hist);
    } catch (e: unknown) {
      setToast({
        kind: "error",
        title: "No se pudo registrar el abono",
        message: errMsg(e),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    // Validación estricta (coincide con serializer)
    const propiedad_id = parseInt(form.propiedad_id, 10);
    const total = parseFloat(form.total);
    const tarifa_id = parseInt(form.tarifa_id, 10);
    const fecha = form.fecha.trim();
    const fecha_vencimiento = form.fecha_vencimiento.trim();

    if (!propiedad_id || !fecha || !(total > 0) || !tarifa_id || !fecha_vencimiento) {
      setToast({
        kind: "error",
        title: "Campos requeridos",
        message: "Propiedad, fecha, total, tarifa y vencimiento son obligatorios.",
      });
      return;
    }

    try {
      setLoading(true);
      await expensaService.create({
        propiedad_id,
        fecha, // yyyy-mm-dd
        total,
        tarifa_id,
        fecha_vencimiento, // yyyy-mm-dd (el service lo convierte a DateTime)
      });
      setToast({ kind: "success", title: "Expensa creada" });
      setShowCreate(false);
      setForm({
        propiedad_id: "",
        fecha: new Date().toISOString().slice(0, 10),
        total: "",
        tarifa_id: "",
        fecha_vencimiento: new Date().toISOString().slice(0, 10),
      });
      await fetchExpensas();
    } catch (e: unknown) {
      setToast({
        kind: "error",
        title: "No se pudo crear la expensa",
        message: errMsg(e),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpensas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalSaldo = useMemo(
    () => expensas.reduce((acc, e) => acc + Number(e.saldo ?? 0), 0),
    [expensas]
  );

  return (
    <DashboardLayout
      title="Gestión de Expensas"
      subtitle="Deuda, pagos por cuotas y estado en tiempo real"
    >
      {/* Filtros + acciones */}
      <section className="grid sm:grid-cols-[1fr_auto_auto] gap-3">
        <div className="relative">
          <input
            value={propFilter}
            onChange={(e) => setPropFilter(e.target.value)}
            placeholder="Filtrar por Propiedad ID"
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-3 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-600"
            type="number"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        </div>
        <button
          onClick={fetchExpensas}
          className="px-4 py-3 rounded-2xl bg-cyan-600 text-white font-medium hover:bg-cyan-700"
        >
          Aplicar filtro
        </button>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-3 rounded-2xl bg-cyan-600 text-white font-medium hover:bg-cyan-700 flex items-center gap-2 justify-center"
        >
          <Plus className="w-5 h-5" /> Nueva expensa
        </button>
      </section>

      {/* Resumen */}
      <section className="grid md:grid-cols-3 gap-4 mt-6">
        <SummaryCard
          title="Expensas"
          value={expensas.length}
          icon={<CalendarClock className="w-6 h-6" />}
        />
        <SummaryCard
          title="Saldo total"
          value={`$ ${totalSaldo.toLocaleString()}`}
          icon={<CircleDollarSign className="w-6 h-6" />}
        />
        <SummaryCard
          title="Pendientes"
          value={expensas.filter((e) => e.estado !== "PAGADO").length}
          icon={<AlertCircle className="w-6 h-6" />}
        />
      </section>

      {/* Tabla */}
      <section className="bg-slate-900/40 border border-white/10 rounded-3xl overflow-hidden shadow-2xl mt-6">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="font-semibold">Listado de expensas</h2>
          {loading && <span className="text-sm text-slate-400">Cargando…</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-slate-300">
              <tr>
                <Th>ID</Th>
                <Th>Propiedad</Th>
                <Th>Fecha</Th>
                <Th className="text-right">Total</Th>
                <Th className="text-right">Pagado</Th>
                <Th className="text-right">Saldo</Th>
                <Th>Estado</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {expensas.map((e) => (
                <tr key={e.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                  <Td>#{e.id}</Td>
                  <Td>{e.propiedad_id}</Td>
                  <Td>{new Date(e.fecha).toLocaleDateString()}</Td>
                  <Td className="text-right">$ {Number(e.total).toLocaleString()}</Td>
                  <Td className="text-right">
                    $ {Number(e.pagado ?? 0).toLocaleString()}
                  </Td>
                  <Td className="text-right font-semibold">
                    $ {Number(e.saldo ?? 0).toLocaleString()}
                  </Td>
                  <Td>
                    <span
                      className={cls(
                        "inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium",
                        chipColor(e.estado)
                      )}
                    >
                      {e.estado || "-"}
                    </span>
                  </Td>
                </tr>
              ))}
              {expensas.length === 0 && (
                <tr>
                  <Td colSpan={8} className="text-center text-slate-400 py-10">
                    No hay expensas para mostrar
                  </Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Panel detalle */}
      <AnimatePresence>
        {selected && (
          <motion.aside
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
            className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-slate-950 border-l border-white/10 shadow-2xl z-40"
          >
            <div className="p-5 flex items-center justify-between border-b border-white/10">
              <div>
                <h3 className="font-semibold">Expensa #{selected.id}</h3>
                <p className="text-slate-400 text-sm">
                  Propiedad {selected.propiedad_id} •{" "}
                  {new Date(selected.fecha).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-2 hover:bg-white/10 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <KPI
                  label="Total"
                  value={`$ ${Number(selected.total).toLocaleString()}`}
                />
                <KPI
                  label="Saldo"
                  value={`$ ${Number(selected.saldo ?? 0).toLocaleString()}`}
                  emphasis
                />
                <KPI
                  label="Pagado"
                  value={`$ ${Number(selected.pagado ?? 0).toLocaleString()}`}
                />
                <KPI label="Estado" value={selected.estado || "-"} />
              </div>

              <button
                onClick={() => setShowPay(true)}
                className="w-full justify-center px-4 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white font-medium flex items-center gap-2"
              >
                <CreditCard className="w-5 h-5" /> Registrar cuota
              </button>

              <div className="mt-2">
                <h4 className="text-sm text-slate-300 mb-2">Historial</h4>
                <div className="space-y-3 max-h-[45vh] overflow-auto pr-2">
                  {historial.map((h) => (
                    <div
                      key={h.cargo.id}
                      className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm">
                          Cargo #{h.cargo.id} • Pago #{h.pago?.id ?? "-"}
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(h.cargo.ts).toLocaleString()}
                        </div>
                      </div>
                      <div className="font-semibold">
                        $ {h.cargo.monto.toLocaleString()}
                      </div>
                    </div>
                  ))}
                  {historial.length === 0 && (
                    <div className="text-slate-400 text-sm">
                      Sin abonos registrados.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Modal: Abonar */}
      {showPay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4 text-black">Registrar cuota</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-black">Monto</label>
                <input
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Ej: 500"
                  className="mt-1 w-full border rounded-xl px-3 py-2 text-black placeholder:text-slate-500"
                />
              </div>
              <button
                onClick={handlePay}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-medium"
              >
                <Plus className="w-5 h-5" /> Registrar
              </button>
              <button
                onClick={() => setShowPay(false)}
                className="w-full text-slate-600 mt-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Crear expensa (todos obligatorios) */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-black">Nueva expensa</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="text-sm text-black">Propiedad ID</label>
                <input
                  value={form.propiedad_id}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, propiedad_id: e.target.value }))
                  }
                  type="number"
                  className="mt-1 w-full border rounded-xl px-3 py-2 text-black placeholder:text-slate-500"
                  placeholder="Ej: 1"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-black">Fecha</label>
                  <input
                    value={form.fecha}
                    onChange={(e) => setForm((s) => ({ ...s, fecha: e.target.value }))}
                    type="date"
                    className="mt-1 w-full border rounded-xl px-3 py-2 text-black placeholder:text-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-black">Fecha vencimiento</label>
                  <input
                    value={form.fecha_vencimiento}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, fecha_vencimiento: e.target.value }))
                    }
                    type="date"
                    className="mt-1 w-full border rounded-xl px-3 py-2 text-black placeholder:text-slate-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-black">Total</label>
                  <input
                    value={form.total}
                    onChange={(e) => setForm((s) => ({ ...s, total: e.target.value }))}
                    type="number"
                    step="0.01"
                    min={0}
                    className="mt-1 w-full border rounded-xl px-3 py-2 text-black placeholder:text-slate-500"
                    placeholder="Ej: 1400"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-black">Tarifa ID</label>
                  <input
                    value={form.tarifa_id}
                    onChange={(e) => setForm((s) => ({ ...s, tarifa_id: e.target.value }))}
                    type="number"
                    className="mt-1 w-full border rounded-xl px-3 py-2 text-black placeholder:text-slate-500"
                    placeholder="Ej: 1"
                    required
                  />
                </div>
              </div>

              <button
                onClick={handleCreate}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-medium"
              >
                <Plus className="w-5 h-5" /> Crear expensa
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="w-full text-slate-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </DashboardLayout>
  );
}

/* ===== Subcomponentes ===== */
function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-slate-900/40 rounded-3xl border border-white/10 p-5 shadow-xl">
      <div className="flex items-center gap-3 text-slate-300">
        <div className="w-10 h-10 rounded-xl bg-white/5 grid place-items-center">
          {icon}
        </div>
        <div className="text-sm">{title}</div>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

function KPI({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cls(
        "rounded-2xl border p-4",
        emphasis ? "border-cyan-600 bg-cyan-600/10" : "border-white/10 bg-white/5"
      )}
    >
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children?: React.ReactNode; // <-- children opcional para no exigir contenido
  className?: string;
}) {
  return (
    <th
      className={cls(
        "text-left px-4 py-3 text-xs font-medium uppercase tracking-wide",
        className
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={cls("px-4 py-3", className)}>
      {children}
    </td>
  );
}
