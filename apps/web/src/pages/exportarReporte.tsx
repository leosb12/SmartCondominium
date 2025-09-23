import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../Layouts/DashboardLayout";
import { useAdminCheck } from "../hooks/useRoles";
import { api } from "../services/api";
import {
  FileDown,
  FileSpreadsheet,
  FileText,
  ShieldAlert,
  RefreshCw,
  CalendarClock,
  Home,
  Settings2,
  CheckCircle2,
  XCircle,
  BarChart3,
  ClipboardList,
  Shield,
  Calendar,
  DollarSign,
} from "lucide-react";

/* ===================== Tipos (mismos que ReporteConsolidado) ===================== */
// Finanzas
type SerieMes = { mes: string; generado: string; cobrado: string };
type Totales = {
  generado: string;
  generado_expensas: string;
  generado_multas: string;
  cobrado: string;
  deuda: string;
  deuda_expensas: string;
  deuda_multas: string;
  vencido_expensas: string;
};
type ReporteFinanciero = {
  filtros: { desde?: string; hasta?: string; propiedad_id?: number | null };
  totales: Totales;
  series_mensuales: SerieMes[];
  top_deudores: { propiedad_id: number; deuda: string; vencido: string }[];
  detalle: {
    expensas: Array<{
      id: number;
      propiedad_id: number;
      fecha: string;
      total: string;
      pagado: string;
      pendiente: string;
      fecha_vencimiento?: string | null;
    }>;
    multas: Array<{
      id: number;
      propiedad_id: number;
      fecha: string;
      total: string;
      pagado: string;
      pendiente: string;
    }>;
    pagos: Array<{
      id: number;
      fecha: string;
      monto_total: string;
      estado_pago_id: number;
      tipo_pago_id: number | null;
    }>;
  };
};

// Reservas
interface AreaSocial {
  id: number;
  nombre: string;
  precioxhora: string;
}
interface Reserva {
  id: number;
  fecha: string; // YYYY-MM-DD
  hora_inicio_id: number | null;
  hora_fin_id: number | null;
  total: string | null;
  created_at: string | null;
  nro_casa?: string | null;
  propiedad_id?: number | null;
  area_social: AreaSocial;
}

// Mantenimiento
type CostoTrabajo = {
  id: number;
  costo_total: number | null;
  material: string | null;
  preciomaterial: number | null;
  preciomanoobra: number | null;
  horas_trabajadas: number | null;
};
type HistorialItem = {
  id: number;
  descripcion: string;
  costo: number | null;
  fecha_programada: string | null;
  estado_trabajo: string | null;
  estado_trabajo_id: number | null;
  catalogo_id: number | null;
  catalogo_nombre: string | null;
  creado_por: string | null;
  ordenado_a: string | null;
  hora_valor: string | null;
  hora_id: number | null;
  tipo: string | null;
  costos: CostoTrabajo[];
};

// Seguridad
type IngresoSeg = {
  id: number;
  usuario_id: string;
  invitado: boolean;
  ts: string; // ISO
  resultado: "Permitido" | "Rechazado" | string;
  nombre_invitado: string | null;
};

type ApiError = {
  response?: { data?: any; status?: number };
  message?: string;
};

/* ===================== Utils ===================== */
const fmtMoney = (v?: string | number | null) =>
  new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    maximumFractionDigits: 2,
  }).format(Number(v || 0));

const cls = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(" ");

const toISODate = (d?: string) => (d ? new Date(d).toISOString() : undefined);

const todayStamp = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}_${hh}-${mi}`;
};

/* Carga segura de XLSX: paquete local si existe, o fallback CDN. */
async function loadXLSX(): Promise<typeof import("xlsx")> {
  try {
    const x = await import("xlsx");
    return x;
  } catch {
    const x = await import(
      /* @vite-ignore */ "https://cdn.sheetjs.com/xlsx-latest/package/xlsx.mjs"
    );
    return x as unknown as typeof import("xlsx");
  }
}

/* ===================== Página Exportar Reporte (solo Admin) ===================== */
const ExportarReporte: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  // Filtros (vacíos = histórico completo)
  const [desde, setDesde] = useState<string>("");
  const [hasta, setHasta] = useState<string>("");
  const [propiedadId, setPropiedadId] = useState<string>("");

  // Secciones a incluir
  const [incFinanzas, setIncFinanzas] = useState(true);
  const [incReservas, setIncReservas] = useState(true);
  const [incMantenimiento, setIncMantenimiento] = useState(true);
  const [incSeguridad, setIncSeguridad] = useState(true);

  // PDF opciones
  const [pdfCompacto, setPdfCompacto] = useState(true);

  // Formato
  type Formato = "excel" | "pdf" | "both";
  const [formato, setFormato] = useState<Formato>("both");

  // Estado
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      setNote("Elige secciones y formato, luego Exportar. Deja fechas vacías para todo el histórico.");
    }
  }, [adminLoading, isAdmin]);

  const onExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || exporting) return;
    if (!incFinanzas && !incReservas && !incMantenimiento && !incSeguridad) {
      setError("Selecciona al menos una sección para exportar.");
      return;
    }

    setExporting(true);
    setError(null);
    setNote(null);

    // Abrimos la ventana de impresión ANTES del trabajo async para que no la bloquee el navegador
    const needPDF = formato === "pdf" || formato === "both";
    let printWin: Window | null = null;
    if (needPDF) {
      printWin = window.open("", "_blank", "noopener,width=1200,height=800");
      if (printWin) {
        // Mantener la ventana viva con un placeholder
        printWin.document.open();
        printWin.document.write(`
          <!doctype html>
          <html><head><meta charset="utf-8"><title>Generando PDF…</title></head>
          <body style="background:#050E22;color:#DCE8FF;font-family:Inter,system-ui,sans-serif;padding:24px;">
            <h3 style="margin:0 0 8px 0;">Generando reporte…</h3>
            <p>Por favor, espera unos segundos…</p>
          </body></html>
        `);
        printWin.document.close();
      }
    }

    try {
      // Preparar promesas según selección
      let finanzaP: Promise<ReporteFinanciero | null> = Promise.resolve(null);
      let reservasP: Promise<Reserva[]> = Promise.resolve([]);
      let mantP: Promise<HistorialItem[]> = Promise.resolve([]);
      let segP: Promise<IngresoSeg[]> = Promise.resolve([]);

      if (incFinanzas) {
        const finBody: any = {};
        if (desde) finBody.desde = toISODate(desde);
        if (hasta) finBody.hasta = toISODate(hasta);
        if (propiedadId) finBody.propiedad_id = Number(propiedadId);
        const token = localStorage.getItem("access_token") || "";
        finanzaP = api
          .post<ReporteFinanciero>("/reportesfinanza/financieros/generar", finBody, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then((r) => r.data)
          .catch(() => null);
      }

      if (incReservas) {
        reservasP = api
          .get<Reserva[]>("/reservas-areas/")
          .then((r) => (Array.isArray(r.data) ? r.data : []))
          .catch(() => []);
      }

      if (incMantenimiento) {
        const params: any = {};
        if (desde) params.fecha_desde = desde;
        if (hasta) params.fecha_hasta = hasta;
        mantP = api
          .get<HistorialItem[]>("/historial-mantenimiento/", { params })
          .then((r) => (Array.isArray(r.data) ? r.data : []))
          .catch(() => []);
      }

      if (incSeguridad) {
        const params: any = {};
        if (desde) params.fecha_desde = desde;
        if (hasta) params.fecha_hasta = hasta;
        segP = api
          .get<IngresoSeg[]>("/reportes-consolidados/ingresos/", { params })
          .then((r) => (Array.isArray(r.data) ? r.data : []))
          .catch(() => []);
      }

      const [finanzas, reservas, mantenimiento, seguridad] = await Promise.all([
        finanzaP,
        reservasP,
        mantP,
        segP,
      ]);

      if (formato === "excel" || formato === "both") {
        await exportToExcel({
          finanzas,
          reservas,
          mantenimiento,
          seguridad,
          incFinanzas,
          incReservas,
          incMantenimiento,
          incSeguridad,
        });
      }
      if (needPDF) {
        await exportToPDF(
          {
            finanzas,
            reservas,
            mantenimiento,
            seguridad,
            incFinanzas,
            incReservas,
            incMantenimiento,
            incSeguridad,
          },
          { pdfCompacto },
          printWin // pasamos la ventana preabierta
        );
      }

      setNote("Exportación completada.");
    } catch (err) {
      const e = err as ApiError;
      setError(
        e?.response?.data?.detail ||
          e?.response?.data?.error ||
          e?.message ||
          "Error al exportar."
      );
    } finally {
      setExporting(false);
    }
  };

  // Excel con SheetJS
  const exportToExcel = async (ctx: {
    finanzas: ReporteFinanciero | null;
    reservas: Reserva[];
    mantenimiento: HistorialItem[];
    seguridad: IngresoSeg[];
    incFinanzas: boolean;
    incReservas: boolean;
    incMantenimiento: boolean;
    incSeguridad: boolean;
  }) => {
    try {
      const XLSX = await loadXLSX();
      const wb = XLSX.utils.book_new();

      if (ctx.incFinanzas && ctx.finanzas) {
        const t = ctx.finanzas.totales;
        const totRows = [
          ["Métrica", "Valor"],
          ["Generado (total)", t.generado],
          ["Generado expensas", t.generado_expensas],
          ["Generado multas", t.generado_multas],
          ["Cobrado", t.cobrado],
          ["Deuda (total)", t.deuda],
          ["Deuda expensas", t.deuda_expensas],
          ["Deuda multas", t.deuda_multas],
          ["Vencido expensas", t.vencido_expensas],
        ];
        const shTot = XLSX.utils.aoa_to_sheet(totRows);
        XLSX.utils.book_append_sheet(wb, shTot, "Finanzas - Totales");

        const series = [["Mes", "Generado", "Cobrado"]].concat(
          (ctx.finanzas.series_mensuales || []).map((s) => [s.mes, s.generado, s.cobrado])
        );
        const shSer = XLSX.utils.aoa_to_sheet(series);
        XLSX.utils.book_append_sheet(wb, shSer, "Finanzas - Series");

        const deudores = [["Propiedad", "Deuda", "Vencido (expensas)"]].concat(
          (ctx.finanzas.top_deudores || []).map((d) => [
            d.propiedad_id,
            d.deuda,
            d.vencido,
          ])
        );
        const shDeu = XLSX.utils.aoa_to_sheet(deudores);
        XLSX.utils.book_append_sheet(wb, shDeu, "Finanzas - Deudores");

        const expensas = [
          ["ID", "Propiedad", "Fecha", "Total", "Pagado", "Pendiente", "Vencimiento"],
          ...(ctx.finanzas.detalle.expensas || []).map((e) => [
            e.id,
            e.propiedad_id,
            e.fecha,
            e.total,
            e.pagado,
            e.pendiente,
            e.fecha_vencimiento || "",
          ]),
        ];
        const shExp = XLSX.utils.aoa_to_sheet(expensas);
        XLSX.utils.book_append_sheet(wb, shExp, "Finanzas - Expensas");

        const multas = [
          ["ID", "Propiedad", "Fecha", "Total", "Pagado", "Pendiente"],
          ...(ctx.finanzas.detalle.multas || []).map((m) => [
            m.id,
            m.propiedad_id,
            m.fecha,
            m.total,
            m.pagado,
            m.pendiente,
          ]),
        ];
        const shMul = XLSX.utils.aoa_to_sheet(multas);
        XLSX.utils.book_append_sheet(wb, shMul, "Finanzas - Multas");

        const pagos = [
          ["ID", "Fecha", "Monto", "Estado", "Tipo de pago"],
          ...(ctx.finanzas.detalle.pagos || []).map((p) => [
            p.id,
            p.fecha,
            p.monto_total,
            p.estado_pago_id,
            p.tipo_pago_id ?? "",
          ]),
        ];
        const shPag = XLSX.utils.aoa_to_sheet(pagos);
        XLSX.utils.book_append_sheet(wb, shPag, "Finanzas - Pagos");
      }

      if (ctx.incReservas) {
        const rows = [["ID", "Fecha", "Área", "Casa/Propiedad", "Hora Inicio", "Hora Fin", "Total"]];
        for (const r of ctx.reservas) {
          rows.push([
            r.id,
            r.fecha,
            r.area_social?.nombre || "",
            r.nro_casa ?? r.propiedad_id ?? "",
            r.hora_inicio_id ?? "",
            r.hora_fin_id ?? "",
            r.total ?? "0",
          ]);
        }
        const shRes = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, shRes, "Reservas");
      }

      if (ctx.incMantenimiento) {
        const rows = [
          ["ID", "Descripción", "Catálogo", "Estado", "Creado por", "Ordenado a", "Fecha", "Hora", "Tipo", "Costo Orden"],
        ];
        for (const it of ctx.mantenimiento) {
          rows.push([
            it.id,
            it.descripcion || "",
            it.catalogo_nombre || it.catalogo_id || "",
            it.estado_trabajo || "",
            it.creado_por || "",
            it.ordenado_a || "",
            it.fecha_programada || "",
            it.hora_valor || it.hora_id || "",
            it.tipo || "",
            typeof it.costo === "number" ? it.costo : "",
          ]);
        }
        const shMan = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, shMan, "Mantenimiento");

        const costRows = [["OT_ID", "Costo_ID", "Material", "Precio Mat.", "Precio Mano Obra", "Horas", "Costo Total"]];
        for (const it of ctx.mantenimiento) {
          for (const c of it.costos || []) {
            costRows.push([
              it.id,
              c.id,
              c.material || "",
              c.preciomaterial ?? "",
              c.preciomanoobra ?? "",
              c.horas_trabajadas ?? "",
              c.costo_total ?? "",
            ]);
          }
        }
        const shCost = XLSX.utils.aoa_to_sheet(costRows);
        XLSX.utils.book_append_sheet(wb, shCost, "Mantenimiento - Costos");
      }

      if (ctx.incSeguridad) {
        const rows = [["Fecha/Hora", "Nombre", "Tipo", "Resultado", "Usuario ID"]];
        for (const s of ctx.seguridad) {
          rows.push([
            s.ts,
            (s.nombre_invitado || "").trim(),
            s.invitado ? "Invitado" : "Residente",
            s.resultado,
            s.usuario_id,
          ]);
        }
        const shSeg = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, shSeg, "Seguridad");
      }

      XLSX.writeFile(wb, `reporte-consolidado_${todayStamp()}.xlsx`);
    } catch (err: any) {
      console.warn("xlsx no disponible o falló la carga. Generando CSV simple.", err);
      setNote("No se pudo usar 'xlsx'. Se generará un CSV de respaldo.");
      await exportCSVFallback(ctx);
    }
  };

  // CSV fallback (un solo archivo con secciones)
  const exportCSVFallback = async (ctx: {
    finanzas: ReporteFinanciero | null;
    reservas: Reserva[];
    mantenimiento: HistorialItem[];
    seguridad: IngresoSeg[];
    incFinanzas?: boolean;
    incReservas?: boolean;
    incMantenimiento?: boolean;
    incSeguridad?: boolean;
  }) => {
    const lines: string[] = [];
    const push = (s: string) => lines.push(s);

    if ((ctx.incFinanzas ?? true) && ctx.finanzas) {
      push("=== Finanzas - Totales ===");
      const t = ctx.finanzas.totales;
      push("metrica,valor");
      push(`generado,${t.generado}`);
      push(`generado_expensas,${t.generado_expensas}`);
      push(`generado_multas,${t.generado_multas}`);
      push(`cobrado,${t.cobrado}`);
      push(`deuda,${t.deuda}`);
      push(`deuda_expensas,${t.deuda_expensas}`);
      push(`deuda_multas,${t.deuda_multas}`);
      push(`vencido_expensas,${t.vencido_expensas}`);
      push("");

      push("=== Finanzas - Series ===");
      push("mes,generado,cobrado");
      for (const s of ctx.finanzas.series_mensuales || []) {
        push(`${s.mes},${s.generado},${s.cobrado}`);
      }
      push("");

      push("=== Finanzas - Deudores ===");
      push("propiedad_id,deuda,vencido_expensas");
      for (const d of (ctx.finanzas.top_deudores || [])) {
        push(`${d.propiedad_id},${d.deuda},${d.vencido}`);
      }
      push("");

      push("=== Finanzas - Expensas ===");
      push("id,propiedad_id,fecha,total,pagado,pendiente,fecha_vencimiento");
      for (const e of ctx.finanzas.detalle.expensas || []) {
        push(`${e.id},${e.propiedad_id},${e.fecha},${e.total},${e.pagado},${e.pendiente},${e.fecha_vencimiento || ""}`);
      }
      push("");

      push("=== Finanzas - Multas ===");
      push("id,propiedad_id,fecha,total,pagado,pendiente");
      for (const m of ctx.finanzas.detalle.multas || []) {
        push(`${m.id},${m.propiedad_id},${m.fecha},${m.total},${m.pagado},${m.pendiente}`);
      }
      push("");

      push("=== Finanzas - Pagos ===");
      push("id,fecha,monto_total,estado_pago_id,tipo_pago_id");
      for (const p of ctx.finanzas.detalle.pagos || []) {
        push(`${p.id},${p.fecha},${p.monto_total},${p.estado_pago_id},${p.tipo_pago_id ?? ""}`);
      }
      push("");
    }

    if (ctx.incReservas ?? true) {
      push("=== Reservas ===");
      push("id,fecha,area,casa_propiedad,hora_inicio,hora_fin,total");
      for (const r of ctx.reservas) {
        push(`${r.id},${r.fecha},"${(r.area_social?.nombre || "").replace(/"/g, '""')}",${r.nro_casa ?? r.propiedad_id ?? ""},${r.hora_inicio_id ?? ""},${r.hora_fin_id ?? ""},${r.total ?? "0"}`);
      }
      push("");
    }

    if (ctx.incMantenimiento ?? true) {
      push("=== Mantenimiento ===");
      push("id,descripcion,catalogo,estado,creado_por,ordenado_a,fecha,hora,tipo,costo_orden");
      for (const it of ctx.mantenimiento) {
        push(
          `${it.id},"${(it.descripcion || "").replace(/"/g, '""')}","${(it.catalogo_nombre || `${it.catalogo_id ?? ""}`).replace(/"/g, '""')}",` +
            `"${(it.estado_trabajo || "").replace(/"/g, '""')}","${(it.creado_por || "").replace(/"/g, '""')}"` +
            `,"${(it.ordenado_a || "").replace(/"/g, '""')}",${it.fecha_programada || ""},` +
            `"${(it.hora_valor || `${it.hora_id ?? ""}`).replace(/"/g, '""')}",` +
            `"${(it.tipo || "").replace(/"/g, '""')}",${typeof it.costo === "number" ? it.costo : ""}`
        );
      }
      push("");

      push("=== Mantenimiento - Costos ===");
      push("ot_id,costo_id,material,precio_material,precio_mano_obra,horas,costo_total");
      for (const it of ctx.mantenimiento) {
        for (const c of it.costos || []) {
          push(
            `${it.id},${c.id},"${(c.material || "").replace(/"/g, '""')}",${c.preciomaterial ?? ""},${c.preciomanoobra ?? ""},${c.horas_trabajadas ?? ""},${c.costo_total ?? ""}`
          );
        }
      }
      push("");
    }

    if (ctx.incSeguridad ?? true) {
      push("=== Seguridad ===");
      push("ts,nombre,tipo,resultado,usuario_id");
      for (const s of ctx.seguridad) {
        push(`${s.ts},"${((s.nombre_invitado || "").trim()).replace(/"/g, '""')}",${s.invitado ? "Invitado" : "Residente"},${s.resultado},${s.usuario_id}`);
      }
      push("");
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `reporte-consolidado_${todayStamp()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // PDF (usa ventana preabierta si existe; si no, usa iframe para evitar pop‑up)
  const exportToPDF = async (
    ctx: {
      finanzas: ReporteFinanciero | null;
      reservas: Reserva[];
      mantenimiento: HistorialItem[];
      seguridad: IngresoSeg[];
      incFinanzas: boolean;
      incReservas: boolean;
      incMantenimiento: boolean;
      incSeguridad: boolean;
    },
    opts: { pdfCompacto: boolean },
    preOpenedWin: Window | null
  ) => {
    const maxRows = opts.pdfCompacto ? 100 : Number.POSITIVE_INFINITY;

    const htmlEscape = (s: any) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const section = (title: string, icon: string) => `
      <div style="margin: 18px 0;">
        <h2 style="font:600 16px Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color:#E5EEFF; display:flex; align-items:center; gap:8px;">
          ${icon} ${htmlEscape(title)}
        </h2>
      </div>
    `;

    const table = (headers: string[], rows: any[][]) => `
      <table style="width:100%; border-collapse: collapse; margin-bottom:12px;">
        <thead>
          <tr>
            ${headers
              .map(
                (h) =>
                  `<th style="text-align:left; font:600 12px Inter, system-ui, sans-serif; color:#B6C9FF; background:#0B1A38; padding:8px; border-bottom:1px solid #1E2C4F;">${htmlEscape(
                    h
                  )}</th>`
              )
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${rows
            .slice(0, maxRows)
            .map(
              (r) => `<tr>
              ${r
                .map(
                  (c) =>
                    `<td style="font:400 11px Inter, system-ui, sans-serif; color:#E9F0FF; padding:8px; border-bottom:1px solid #1A2544;">${htmlEscape(
                      c
                    )}</td>`
                )
                .join("")}
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
      ${
        rows.length > maxRows
          ? `<div style="color:#FFA7A7; font: 12px Inter, sans-serif; margin-bottom:16px;">Mostrando ${maxRows} de ${rows.length} filas (PDF compacto).</div>`
          : ""
      }
    `;

    const parts: string[] = [];
    parts.push(`
      <div style="background:#050E22; padding:20px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
          <div>
            <div style="font:700 18px Inter, system-ui, sans-serif; color:#DCE8FF;">Reporte consolidado</div>
            <div style="font:400 12px Inter, system-ui, sans-serif; color:#9CB5FF;">Generado: ${new Date().toLocaleString()}</div>
          </div>
          <div style="font:600 12px Inter, system-ui, sans-serif; color:#7EA6FF;">Smart Condominium</div>
        </div>
        <hr style="border:none; height:1px; background:#12244A; margin:8px 0 16px;"/>
    `);

    // Finanzas
    if (ctx.incFinanzas && ctx.finanzas) {
      parts.push(
        section("Finanzas", "💰"),
        table(
          ["Métrica", "Valor"],
          [
            ["Generado (total)", ctx.finanzas.totales.generado],
            ["Cobrado", ctx.finanzas.totales.cobrado],
            ["Deuda (total)", ctx.finanzas.totales.deuda],
            ["Vencido (expensas)", ctx.finanzas.totales.vencido_expensas],
          ]
        ),
        table(
          ["Mes", "Generado", "Cobrado"],
          (ctx.finanzas.series_mensuales || []).map((s) => [s.mes, s.generado, s.cobrado])
        ),
        table(
          ["Propiedad", "Deuda", "Vencido (expensas)"],
          (ctx.finanzas.top_deudores || []).map((d) => [d.propiedad_id, d.deuda, d.vencido])
        )
      );
    }

    // Reservas
    if (ctx.incReservas) {
      parts.push(
        section("Reservas", "📅"),
        table(
          ["ID", "Fecha", "Área", "Casa/Propiedad", "Hora Inicio", "Hora Fin", "Total"],
          ctx.reservas.map((r) => [
            r.id,
            r.fecha,
            r.area_social?.nombre || "",
            r.nro_casa ?? r.propiedad_id ?? "",
            r.hora_inicio_id ?? "",
            r.hora_fin_id ?? "",
            r.total ?? "0",
          ])
        )
      );
    }

    // Mantenimiento
    if (ctx.incMantenimiento) {
      parts.push(
        section("Mantenimiento", "🧰"),
        table(
          ["ID", "Descripción", "Catálogo", "Estado", "Fecha", "Hora", "Tipo", "Costo Orden"],
          ctx.mantenimiento.map((it) => [
            it.id,
            it.descripcion || "",
            it.catalogo_nombre || it.catalogo_id || "",
            it.estado_trabajo || "",
            it.fecha_programada || "",
            it.hora_valor || it.hora_id || "",
            it.tipo || "",
            typeof it.costo === "number" ? fmtMoney(it.costo) : "",
          ])
        )
      );
    }

    // Seguridad
    if (ctx.incSeguridad) {
      parts.push(
        section("Seguridad (Ingresos)", "🛡️"),
        table(
          ["Fecha/Hora", "Nombre", "Tipo", "Resultado", "Usuario"],
          ctx.seguridad.map((s) => [
            new Date(s.ts).toLocaleString(),
            (s.nombre_invitado || "").trim(),
            s.invitado ? "Invitado" : "Residente",
            s.resultado,
            s.usuario_id,
          ])
        )
      );
    }

    parts.push(`</div>`);

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>Reporte consolidado</title>
          <meta name="viewport" content="width=device-width, initial-scale=1"/>
          <style>
            @page { size: A4; margin: 12mm; }
            @media print {
              body { -webkit-print-color-adjust: exact; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body style="margin:0;background:#050E22;">
          ${parts.join("")}
          <div class="no-print" style="position:fixed; right:16px; bottom:16px;">
            <button onclick="window.print()" style="background:#2A4DB3;border:none;color:#fff;padding:10px 14px;border-radius:10px;cursor:pointer;font-family:Inter,system-ui,sans-serif;font-weight:600;">
              Imprimir / Guardar PDF
            </button>
          </div>
          <script>window.focus(); setTimeout(() => window.print(), 350);</script>
        </body>
      </html>
    `;

    // Preferimos usar la ventana preabierta (no bloqueada)
    if (preOpenedWin) {
      try {
        preOpenedWin.document.open();
        preOpenedWin.document.write(html);
        preOpenedWin.document.close();
        preOpenedWin.focus();
        return;
      } catch {
        // si falla, caemos al iframe
      }
    }

    // Fallback: iframe oculto (evita pop‑ups)
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      setError("No se pudo preparar la impresión. Intenta permitir pop-ups o usa Excel.");
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();

    // imprimimos y limpiamos
    const w = iframe.contentWindow;
    if (w) {
      w.focus();
      setTimeout(() => {
        try {
          w.print();
        } finally {
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }
      }, 350);
    } else {
      setError("No se pudo abrir el visor de impresión (iframe).");
    }
  };

  // Estados de UI
  const canSubmit = useMemo(
    () => isAdmin && !adminLoading && !exporting,
    [isAdmin, adminLoading, exporting]
  );

  if (adminLoading) {
    return (
      <DashboardLayout title="Exportar reporte" subtitle="Verificando permisos...">
        <div className="flex items-center justify-center min-h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout title="Exportar reporte" subtitle="Acceso restringido">
        <div className="rounded-xl border border-amber-800/50 bg-amber-900/20 p-4 text-amber-200 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          Solo los administradores (rol 1) pueden exportar reportes.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Exportar reporte"
      subtitle="Elige secciones, rango y formato (Excel y/o PDF)"
      icon={<FileDown className="h-5 w-5 text-blue-400" />}
    >
      <form
        onSubmit={onExport}
        className="mb-8 rounded-2xl border border-slate-800/60 bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-950 p-4 sm:p-6"
      >
        {/* Filtros */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="flex flex-col gap-1">
            <span className="text-slate-300 text-xs flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Desde (opcional)
            </span>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 ring-blue-600/40"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-slate-300 text-xs flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Hasta (opcional)
            </span>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 ring-blue-600/40"
            />
          </label>

          <label className="flex flex-col gap-1 lg:col-span-1">
            <span className="text-slate-300 text-xs flex items-center gap-2">
              <Home className="h-4 w-4" /> Propiedad (solo finanzas)
            </span>
            <input
              type="number"
              min={1}
              placeholder="ID propiedad (opcional)"
              value={propiedadId}
              onChange={(e) => setPropiedadId(e.target.value)}
              className="rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 ring-blue-600/40"
            />
          </label>

          {/* Formato */}
          <div className="flex flex-col gap-2 lg:col-span-2">
            <span className="text-slate-300 text-xs flex items-center gap-2">
              <Settings2 className="h-4 w-4" /> Formato
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFormato("excel")}
                className={cls(
                  "inline-flex items-center gap-2 rounded-xl px-3 py-2 border",
                  formato === "excel"
                    ? "border-blue-500/50 bg-blue-600/20 text-blue-100"
                    : "border-slate-700/60 text-slate-300 hover:bg-slate-900/50"
                )}
              >
                <FileSpreadsheet className="h-4 w-4" /> Excel
              </button>
              <button
                type="button"
                onClick={() => setFormato("pdf")}
                className={cls(
                  "inline-flex items-center gap-2 rounded-xl px-3 py-2 border",
                  formato === "pdf"
                    ? "border-blue-500/50 bg-blue-600/20 text-blue-100"
                    : "border-slate-700/60 text-slate-300 hover:bg-slate-900/50"
                )}
              >
                <FileText className="h-4 w-4" /> PDF
              </button>
              <button
                type="button"
                onClick={() => setFormato("both")}
                className={cls(
                  "inline-flex items-center gap-2 rounded-xl px-3 py-2 border",
                  formato === "both"
                    ? "border-blue-500/50 bg-blue-600/20 text-blue-100"
                    : "border-slate-700/60 text-slate-300 hover:bg-slate-900/50"
                )}
              >
                <FileDown className="h-4 w-4" /> Ambos
              </button>
            </div>
          </div>
        </div>

        {/* Selección de secciones */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800/60 p-4 bg-slate-950/30">
            <div className="flex items-center justify-between">
              <div className="text-slate-200 font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-sky-400" /> Finanzas
              </div>
              <label className="inline-flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={incFinanzas}
                  onChange={(e) => setIncFinanzas(e.target.checked)}
                  className="accent-blue-500"
                />
                {incFinanzas ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-rose-400" />}
              </label>
            </div>
            <p className="text-slate-400 text-xs mt-1">
              Incluye totales, series, deudores y detalle (expensas, multas, pagos).
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/60 p-4 bg-slate-950/30">
            <div className="flex items-center justify-between">
              <div className="text-slate-200 font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-400" /> Reservas
              </div>
              <label className="inline-flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={incReservas}
                  onChange={(e) => setIncReservas(e.target.checked)}
                  className="accent-blue-500"
                />
                {incReservas ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-rose-400" />}
              </label>
            </div>
            <p className="text-slate-400 text-xs mt-1">
              Incluye todas las reservas (fecha, área, propiedad, horas, total).
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/60 p-4 bg-slate-950/30">
            <div className="flex items-center justify-between">
              <div className="text-slate-200 font-semibold flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-amber-400" /> Mantenimiento
              </div>
              <label className="inline-flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={incMantenimiento}
                  onChange={(e) => setIncMantenimiento(e.target.checked)}
                  className="accent-blue-500"
                />
                {incMantenimiento ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-rose-400" />}
              </label>
            </div>
            <p className="text-slate-400 text-xs mt-1">
              Incluye órdenes con costos (detalle de trabajos en hoja aparte para Excel).
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/60 p-4 bg-slate-950/30">
            <div className="flex items-center justify-between">
              <div className="text-slate-200 font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-400" /> Seguridad
              </div>
              <label className="inline-flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={incSeguridad}
                  onChange={(e) => setIncSeguridad(e.target.checked)}
                  className="accent-blue-500"
                />
                {incSeguridad ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-rose-400" />}
              </label>
            </div>
            <p className="text-slate-400 text-xs mt-1">
              Incluye registros de ingreso (fecha/hora, invitado/residente, resultado).
            </p>
          </div>
        </div>

        {/* Opciones PDF */}
        <div className="mt-4 flex items-center gap-4">
          <label className="inline-flex items-center gap-2 text-slate-300">
            <input
              type="checkbox"
              checked={pdfCompacto}
              onChange={(e) => setPdfCompacto(e.target.checked)}
              className="accent-blue-500"
            />
            PDF compacto (limita a 100 filas por sección para imprimir mejor)
          </label>
        </div>

        {/* Acciones */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className={cls(
              "inline-flex justify-center items-center gap-2 rounded-xl px-4 py-2 font-medium transition",
              "bg-blue-600/90 text-white ring-1 ring-inset ring-blue-500/40 hover:brightness-110",
              exporting && "opacity-60 cursor-not-allowed",
              "w-full sm:w-auto"
            )}
          >
            {exporting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Exportando…
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" /> Exportar
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl px-4 py-2 text-slate-300 border border-slate-700/60 hover:bg-slate-900/50 w-full sm:w-auto"
          >
            Volver
          </button>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="mt-4 flex items-center gap-2 text-rose-400 text-sm" role="alert" aria-live="assertive">
            <XCircle className="h-4 w-4" /> {error}
          </div>
        )}
        {note && !error && (
          <div className="mt-4 flex items-center gap-2 text-emerald-300 text-sm" role="status" aria-live="polite">
            <CheckCircle2 className="h-4 w-4" /> {note}
          </div>
        )}
      </form>

      {/* Tips rápidos */}
      <div className="rounded-2xl border border-slate-800/60 p-4 bg-slate-950/40">
        <div className="text-slate-200 font-semibold mb-2 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-400" /> Consejos
        </div>
        <ul className="list-disc pl-5 text-slate-400 text-sm space-y-1">
          <li>Deja “Desde” y “Hasta” vacíos para exportar todo el histórico.</li>
          <li>Para Excel avanzado, instala la dependencia “xlsx” si no está instalada.</li>
          <li>Si tu navegador bloquea pop-ups, igualmente usaremos un visor interno (sin ventanas emergentes).</li>
        </ul>
      </div>
    </DashboardLayout>
  );
};

export default ExportarReporte;