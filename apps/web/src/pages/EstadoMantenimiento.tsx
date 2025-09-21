import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../Layouts/DashboardLayout";
import { roleService, type Role } from "../services/roleService";
import {
  fetchEstadosTrabajo,
  fetchOrdenById,
  fetchOrdenesTrabajo,
  updateEstadoOrden,
  type EstadoTrabajo,
  type OrdenTrabajo,
} from "../services/ordenTrabajoEstadoService";

type LoadState = "idle" | "loading" | "success" | "error";

const ALLOWED_ROLE_NAMES = ["administrador", "mantenimiento_interno", "mantenimiento_externo"];
const ALLOWED_ROLE_IDS = new Set<number>([1, 5, 6]);

function hasAllowedRole(roles: Role[]): boolean {
  if (!roles || roles.length === 0) return false;
  const byName = roles.some((r) => ALLOWED_ROLE_NAMES.includes(r.nombre.toLowerCase()));
  const byId = roles.some((r) => ALLOWED_ROLE_IDS.has(r.id));
  return byName || byId;
}

const colors = {
  bg: "#0d1b2a",
  panel: "#1b263b",
  panelAlt: "#162234",
  border: "#2c3e5e",
  text: "#e0e1dd",
  subtext: "#c9cbd3",
  accent: "#778da9",
  accentStrong: "#415a77",
  success: "#1f8754",
  danger: "#b02a37",
};

function getEstadoNombre(id: number | undefined, estados: EstadoTrabajo[]): string {
  if (typeof id !== "number") return "";
  const e = estados.find((x) => x.id === id);
  return e?.nombre ?? `ID ${id}`;
}

export default function EstadoMantenimiento() {
  const [authChecked, setAuthChecked] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  // Flujo original
  const [ordenIdInput, setOrdenIdInput] = useState<string>("");
  const [orden, setOrden] = useState<OrdenTrabajo | null>(null);
  const [estados, setEstados] = useState<EstadoTrabajo[]>([]);
  const [selectedEstadoId, setSelectedEstadoId] = useState<number | "">("");
  const [comentario, setComentario] = useState<string>("");
  const [loadOrdenState, setLoadOrdenState] = useState<LoadState>("idle");
  const [saveState, setSaveState] = useState<LoadState>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Tabla
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([]);
  const [tablaFilter, setTablaFilter] = useState<string>("");
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const [selectedById, setSelectedById] = useState<Record<number, number | "">>({});

  // 1) Verificación con TU roleService (como pediste)
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const myRoles = await roleService.getMyRoles();
        if (!isMounted) return;
        setForbidden(!hasAllowedRole(myRoles));
      } catch {
        if (!isMounted) return;
        setForbidden(true);
      } finally {
        if (isMounted) setAuthChecked(true);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2) Cargar catálogo de estados
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await fetchEstadosTrabajo();
        if (!active) return;
        setEstados(list);
      } catch (e: any) {
        if (!active) return;
        setErrorMsg(e?.response?.data?.detail || e?.message || "Error cargando estados de trabajo");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // 3) Cargar todas las órdenes
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await fetchOrdenesTrabajo();
        if (!alive) return;
        setOrdenes(list);
        const initial: Record<number, number> = {};
        list.forEach((o) => {
          if (typeof o.estado_trabajo_id === "number") {
            initial[o.id] = o.estado_trabajo_id;
          }
        });
        setSelectedById(initial);
      } catch (e: any) {
        // Si el endpoint no existe o devuelve 401, se mostrará aviso en UI
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const currentEstadoNombre = useMemo(() => {
    if (!orden) return "";
    return getEstadoNombre(orden.estado_trabajo_id, estados);
  }, [orden, estados]);

  async function handleCargarOrden() {
    setErrorMsg("");
    setOrden(null);
    setLoadOrdenState("loading");
    try {
      const idNum = Number(ordenIdInput);
      if (!idNum || isNaN(idNum)) {
        throw new Error("Ingresa un ID de orden válido.");
      }
      const data = await fetchOrdenById(idNum);
      setOrden(data);
      setSelectedEstadoId(data.estado_trabajo_id);
      setLoadOrdenState("success");
    } catch (e: any) {
      setLoadOrdenState("error");
      setErrorMsg(e?.response?.data?.detail || e?.message || "Error cargando la orden.");
    }
  }

  async function handleGuardar() {
    if (!orden) return;
    if (selectedEstadoId === "") {
      setErrorMsg("Selecciona un estado.");
      return;
    }
    if (selectedEstadoId === orden.estado_trabajo_id) {
      setErrorMsg("El estado seleccionado es igual al actual.");
      return;
    }

    setErrorMsg("");
    setSaveState("loading");
    try {
      const updated = await updateEstadoOrden(orden.id, Number(selectedEstadoId), comentario || undefined);
      setOrden(updated);
      setSaveState("success");
      setOrdenes((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
      setSelectedById((prev) => ({ ...prev, [updated.id]: updated.estado_trabajo_id }));
    } catch (e: any) {
      setSaveState("error");
      setErrorMsg(e?.response?.data?.detail || e?.message || "Error actualizando el estado.");
    }
  }

  async function handleGuardarFila(ordenId: number) {
    const target = ordenes.find((o) => o.id === ordenId);
    if (!target) return;

    const nuevo = selectedById[ordenId];
    if (nuevo === "" || typeof nuevo !== "number") {
      setErrorMsg("Selecciona un estado para la orden #" + ordenId);
      return;
    }
    if (nuevo === target.estado_trabajo_id) {
      setErrorMsg("El estado seleccionado es igual al actual para la orden #" + ordenId);
      return;
    }

    setErrorMsg("");
    setSavingIds((s) => new Set([...s, ordenId]));
    try {
      const updated = await updateEstadoOrden(ordenId, Number(nuevo), comentario || undefined);
      setOrdenes((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
      setSelectedById((prev) => ({ ...prev, [updated.id]: updated.estado_trabajo_id }));
      if (orden && orden.id === updated.id) {
        setOrden(updated);
        setSelectedEstadoId(updated.estado_trabajo_id);
      }
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.detail || e?.message || "Error actualizando la orden #" + ordenId);
    } finally {
      setSavingIds((s) => {
        const copy = new Set(s);
        copy.delete(ordenId);
        return copy;
      });
    }
  }

  const filteredOrdenes = (() => {
    const q = tablaFilter.trim().toLowerCase();
    if (!q) return ordenes;
    return ordenes.filter((o) => {
      const idStr = String(o.id);
      const desc = (o.descripcion || "").toString().toLowerCase();
      const tipo = (o.tipo || "").toString().toLowerCase();
      const estadoNombre = getEstadoNombre(o.estado_trabajo_id, estados).toLowerCase();
      return idStr.includes(q) || desc.includes(q) || tipo.includes(q) || estadoNombre.includes(q);
    });
  })();

  return (
    <DashboardLayout>
      <div style={{ background: colors.bg, color: colors.text, minHeight: "100%", padding: "16px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 16 }}>
          <h2 style={{ margin: 0 }}>Estado de Mantenimiento</h2>

          {/* Bloque de permisos */}
          {!authChecked ? (
            <div
              style={{
                background: colors.panel,
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                padding: 16,
              }}
            >
              Cargando permisos…
            </div>
          ) : forbidden ? (
            <div
              style={{
                background: colors.panel,
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                padding: 16,
              }}
            >
              <strong style={{ color: colors.danger }}>403 · Acceso denegado</strong>
              <p style={{ marginTop: 6, color: colors.subtext }}>
                Solo administradores o personal de mantenimiento (interno/externo) pueden acceder a esta página.
              </p>
            </div>
          ) : (
            <>
              {/* Panel búsqueda por ID (tu lógica original, intacta) */}
              <div
                style={{
                  background: colors.panel,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gap: 12,
                    gridTemplateColumns: "1fr auto",
                    alignItems: "end",
                  }}
                >
                  <div>
                    <label htmlFor="ordenId" style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>
                      ID de orden
                    </label>
                    <input
                      id="ordenId"
                      type="number"
                      placeholder="Ej: 1"
                      value={ordenIdInput}
                      onChange={(e) => setOrdenIdInput(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        background: colors.panelAlt,
                        color: colors.text,
                        border: `1px solid ${colors.border}`,
                        borderRadius: 8,
                      }}
                    />
                  </div>
                  <button
                    onClick={handleCargarOrden}
                    disabled={loadOrdenState === "loading"}
                    style={{
                      padding: "12px 16px",
                      background: colors.accentStrong,
                      color: colors.text,
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    {loadOrdenState === "loading" ? "Cargando…" : "Cargar orden"}
                  </button>
                </div>

                {errorMsg && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      border: `1px solid ${colors.danger}55`,
                      background: "#3d1f25",
                      color: colors.text,
                      borderRadius: 8,
                    }}
                  >
                    {errorMsg}
                  </div>
                )}

                {orden && (
                  <div
                    style={{
                      marginTop: 16,
                      padding: 16,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 10,
                      background: colors.panelAlt,
                    }}
                  >
                    <h3 style={{ marginTop: 0, marginBottom: 4 }}>Orden #{orden.id}</h3>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <div style={{ color: colors.subtext, fontSize: 14, marginBottom: 4 }}>Estado actual</div>
                        <div style={{ fontWeight: 600 }}>{currentEstadoNombre}</div>
                      </div>

                      <div>
                        <label htmlFor="estadoNuevo" style={{ display: "block", fontWeight: 600 }}>
                          Nuevo estado
                        </label>
                        <select
                          id="estadoNuevo"
                          value={selectedEstadoId === "" ? "" : Number(selectedEstadoId)}
                          onChange={(e) => setSelectedEstadoId(e.target.value === "" ? "" : Number(e.target.value))}
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            background: colors.panel,
                            color: colors.text,
                            border: `1px solid ${colors.border}`,
                            borderRadius: 8,
                          }}
                        >
                          <option value="">Selecciona…</option>
                          {estados.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.nombre} (ID {e.id})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <label htmlFor="comentario" style={{ display: "block", fontWeight: 600 }}>
                        Comentario (opcional)
                      </label>
                      <textarea
                        id="comentario"
                        value={comentario}
                        onChange={(e) => setComentario(e.target.value)}
                        rows={3}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          background: colors.panel,
                          color: colors.text,
                          border: `1px solid ${colors.border}`,
                          borderRadius: 8,
                        }}
                        placeholder="Motivo o detalle del cambio de estado"
                      />
                    </div>

                    <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center" }}>
                      <button
                        onClick={handleGuardar}
                        disabled={saveState === "loading"}
                        style={{
                          padding: "10px 14px",
                          background: colors.accentStrong,
                          color: colors.text,
                          border: "none",
                          borderRadius: 8,
                          cursor: "pointer",
                        }}
                      >
                        {saveState === "loading" ? "Guardando…" : "Guardar estado"}
                      </button>
                      {saveState === "success" && <span style={{ color: colors.success }}>Actualizado.</span>}
                    </div>

                    <details style={{ marginTop: 8 }}>
                      <summary>Ver datos crudos de la orden</summary>
                      <pre
                        style={{
                          marginTop: 8,
                          padding: 12,
                          background: colors.panel,
                          border: `1px solid ${colors.border}`,
                          borderRadius: 8,
                          maxHeight: 280,
                          overflow: "auto",
                          color: colors.text,
                        }}
                      >
{JSON.stringify(orden, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>

              {/* Tabla de todas las órdenes */}
              <div
                style={{
                  background: colors.panel,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <h3 style={{ margin: 0 }}>Todas las órdenes</h3>
                  <input
                    type="text"
                    placeholder="Buscar por ID, descripción, tipo o estado..."
                    value={tablaFilter}
                    onChange={(e) => setTablaFilter(e.target.value)}
                    style={{
                      width: "min(360px, 100%)",
                      padding: "10px 12px",
                      background: colors.panelAlt,
                      color: colors.text,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 8,
                    }}
                  />
                </div>

                {ordenes.length === 0 ? (
                  <div
                    style={{
                      padding: 12,
                      background: colors.panelAlt,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 8,
                      color: colors.subtext,
                    }}
                  >
                    No hay órdenes para mostrar o el endpoint de listado no está disponible.
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
                      <thead>
                        <tr style={{ background: colors.accentStrong, color: colors.text }}>
                          <th style={{ textAlign: "left", padding: "10px 12px" }}>ID</th>
                          <th style={{ textAlign: "left", padding: "10px 12px" }}>Descripción</th>
                          <th style={{ textAlign: "left", padding: "10px 12px" }}>Tipo</th>
                          <th style={{ textAlign: "left", padding: "10px 12px" }}>Estado actual</th>
                          <th style={{ textAlign: "left", padding: "10px 12px" }}>Nuevo estado</th>
                          <th style={{ textAlign: "left", padding: "10px 12px" }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrdenes.map((o) => {
                          const sel = selectedById[o.id] ?? o.estado_trabajo_id ?? "";
                          const saving = savingIds.has(o.id);
                          return (
                            <tr key={o.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                              <td style={{ padding: "10px 12px" }}>#{o.id}</td>
                              <td style={{ padding: "10px 12px", maxWidth: 340 }}>
                                <div
                                  style={{
                                    color: colors.text,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {o.descripcion ?? "-"}
                                </div>
                              </td>
                              <td style={{ padding: "10px 12px" }}>
                                <span
                                  style={{
                                    background: colors.accentStrong,
                                    color: colors.text,
                                    padding: "2px 8px",
                                    borderRadius: 999,
                                    fontSize: 12,
                                  }}
                                >
                                  {o.tipo ?? "—"}
                                </span>
                              </td>
                              <td style={{ padding: "10px 12px" }}>{getEstadoNombre(o.estado_trabajo_id, estados)}</td>
                              <td style={{ padding: "10px 12px" }}>
                                <select
                                  value={sel === "" ? "" : Number(sel)}
                                  onChange={(e) =>
                                    setSelectedById((prev) => ({
                                      ...prev,
                                      [o.id]: e.target.value === "" ? "" : Number(e.target.value),
                                    }))
                                  }
                                  style={{
                                    width: "100%",
                                    minWidth: 160,
                                    padding: "8px 10px",
                                    background: colors.panelAlt,
                                    color: colors.text,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: 8,
                                  }}
                                >
                                  <option value="">Selecciona…</option>
                                  {estados.map((e) => (
                                    <option key={e.id} value={e.id}>
                                      {e.nombre} (ID {e.id})
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td style={{ padding: "10px 12px" }}>
                                <button
                                  onClick={() => handleGuardarFila(o.id)}
                                  disabled={saving}
                                  style={{
                                    padding: "8px 12px",
                                    background: colors.accentStrong,
                                    color: colors.text,
                                    border: "none",
                                    borderRadius: 8,
                                    cursor: "pointer",
                                  }}
                                >
                                  {saving ? "Guardando…" : "Guardar"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}