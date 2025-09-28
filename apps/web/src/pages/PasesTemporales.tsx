import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../Layouts/DashboardLayout";
import { useRoles } from "../hooks/useRoles";
import { api } from "../services/api";
import {
  ShieldCheck,
  QrCode,
  CalendarClock,
  CheckCircle2,
  XCircle,
  Loader2,
  Clipboard,
  ClipboardCheck,
  History,
  Trash2,
  RefreshCcw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVisitorLookup } from "../hooks/useVisitorLookup";
import { useAuthUserLookup } from "../hooks/useAuthUserLookup";

type Role = { id: number; nombre: string };
const ALLOWED_ROLE_IDS = new Set<number>([1, 4]);

type CreatePassResp = {
  success: boolean;
  pass: {
    id: string;
    code: string;
    status: "pendiente" | "activo" | "usado" | "vencido" | "revocado";
    start_at: string;
    expires_at: string;
    max_uses: number;
  };
};

type ValidatePassResp = {
  ok: boolean;
  status: "pendiente" | "activo" | "usado" | "vencido" | "revocado";
  remaining_uses: number;
  expires_at: string;
};

type PassRow = {
  id: string;
  code: string;
  start_at: string;
  expires_at: string;
  max_uses: number;
  uses_count: number;
  status: string;
  created_by: string;
  created_at: string;
  revoked_by?: string | null;
  revoked_at?: string | null;
  meta: any;
  visitor_id: string;
  full_name?: string;
  doc_type?: string;
  doc_number?: string;
  phone?: string;
  visitor_status?: string;
  visitor_created_at?: string;
};

type ListResp = { items: PassRow[] };

function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

function toInputLocal(dt: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = dt.getFullYear();
  const mm = pad(dt.getMonth() + 1);
  const dd = pad(dt.getDate());
  const hh = pad(dt.getHours());
  const mi = pad(dt.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}
function localToISO(value: string) {
  const d = new Date(value);
  return d.toISOString();
}

const Badge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    pendiente: "bg-slate-800 text-slate-200 ring-1 ring-slate-700",
    activo: "bg-green-900/40 text-green-300 ring-1 ring-green-700/60",
    usado: "bg-blue-900/30 text-blue-300 ring-1 ring-blue-700/60",
    vencido: "bg-orange-900/40 text-orange-300 ring-1 ring-orange-700/60",
    revocado: "bg-red-900/40 text-red-300 ring-1 ring-red-700/60",
  };
  return (
    <span className={classNames("px-2 py-1 rounded-md text-xs", map[status] || "bg-slate-800 text-slate-200")}>
      {status}
    </span>
  );
};

const PasesTemporales: React.FC = () => {
  const navigate = useNavigate();
  const { roles } = useRoles();
  const canAccess = useMemo(
    () => Array.isArray(roles) && (roles as Role[]).some((r) => ALLOWED_ROLE_IDS.has(r.id)),
    [roles]
  );

  const [tab, setTab] = useState<"generar" | "validar" | "historial">("generar");

  // ---------- GENERAR ----------
  const [useVisitorId, setUseVisitorId] = useState(true);

  // Autocomplete visitantes
  const { input: vInput, setInput: setVInput, loading: loadingVisitors, options: vOptions, error: visitorsError } =
    useVisitorLookup();
  const [selectedVisitor, setSelectedVisitor] = useState<{ id: string; label: string } | null>(null);
  const [visitorId, setVisitorId] = useState("");

  const onPickVisitor = (id: string, label: string) => {
    setSelectedVisitor({ id, label });
    setVisitorId(id);
    setVInput(label);
  };

  // Autocomplete auth users
  const {
    input: uInput,
    setInput: setUInput,
    loading: loadingUsers,
    options: uOptions,
    error: usersError,
  } = useAuthUserLookup();
  const [selectedUser, setSelectedUser] = useState<{ id: string; label: string } | null>(null);
  const [authUserId, setAuthUserId] = useState("");

  const onPickUser = (id: string, label: string) => {
    setSelectedUser({ id, label });
    setAuthUserId(id);
    setUInput(label);
  };

  const [startAt, setStartAt] = useState(toInputLocal(new Date()));
  const [expiresAt, setExpiresAt] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 8);
    return toInputLocal(d);
  });
  const [maxUses, setMaxUses] = useState(1);
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatePassResp["pass"] | null>(null);
  const [copied, setCopied] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const submitCreate = async () => {
    setCreating(true);
    setCreateError(null);
    setCreated(null);
    try {
      const payload: any = {
        start_at: localToISO(startAt),
        expires_at: localToISO(expiresAt),
        max_uses: Number(maxUses) || 1,
        meta: notes ? { notes } : {},
      };
      if (useVisitorId) {
        if (!visitorId) throw new Error("Debes seleccionar un visitante.");
        payload.visitor_id = visitorId.trim();
      } else {
        if (!authUserId) throw new Error("Debes seleccionar un usuario.");
        payload.auth_user_id = authUserId.trim();
      }
      const { data } = await api.post<CreatePassResp>("/seguridad/pases-temporales/crear/", payload);
      setCreated(data.pass);
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.detail ||
        e?.message ||
        "Error creando el pase temporal";
      setCreateError(String(msg));
    } finally {
      setCreating(false);
    }
  };

  // ---------- VALIDAR ----------
  const [code, setCode] = useState("");
  const [validating, setValidating] = useState(false);
  const [validateRes, setValidateRes] = useState<ValidatePassResp | null>(null);
  const [validateError, setValidateError] = useState<string | null>(null);

  const submitValidate = async () => {
    setValidating(true);
    setValidateError(null);
    setValidateRes(null);
    try {
      const { data } = await api.post<ValidatePassResp>("/seguridad/pases-temporales/validar/", { code: code.trim() });
      setValidateRes(data);
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.detail ||
        e?.message ||
        "Error validando el pase";
      setValidateError(String(msg));
    } finally {
      setValidating(false);
    }
  };

  // ---------- HISTORIAL ----------
  const [loadingList, setLoadingList] = useState(false);
  const [list, setList] = useState<PassRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [visitorFilter, setVisitorFilter] = useState<string>("");

  const loadList = async () => {
    setLoadingList(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set("status", statusFilter);
      if (visitorFilter) qs.set("visitor_id", visitorFilter.trim());
      const { data } = await api.get<ListResp>(`/seguridad/pases-temporales/listar/${qs.toString() ? `?${qs}` : ""}`);
      setList(data.items || []);
    } catch (e) {
      console.error("Error listando pases temporales:", e);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (tab === "historial" && canAccess) {
      loadList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const [revokingId, setRevokingId] = useState<string | null>(null);
  const revoke = async (id: string) => {
    setRevokingId(id);
    try {
      await api.post(`/seguridad/pases-temporales/${id}/revocar/`, {});
      await loadList();
    } catch (e) {
      console.error("Error revocando pase:", e);
    } finally {
      setRevokingId(null);
    }
  };

  // ---------- acceso ----------
  if (!canAccess) {
    return (
      <DashboardLayout
        title="Pases Temporales"
        subtitle="Generación y validación de pases para visitantes"
        icon={<ShieldCheck className="h-5 w-5 text-blue-400" />}
      >
        <div className="bg-red-700/80 text-white p-5 rounded-xl text-center mb-6 font-bold shadow">
          Acceso denegado
          <p className="text-slate-200 mt-2 font-normal text-base">
            Esta sección es solo para administradores y personal de seguridad.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Pases Temporales"
      subtitle="Generación y validación de pases para visitantes"
      icon={<ShieldCheck className="h-5 w-5 text-blue-400" />}
    >
      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        {([
          { key: "generar", label: "Generar", Icon: QrCode },
          { key: "validar", label: "Validar", Icon: CalendarClock },
          { key: "historial", label: "Historial", Icon: History },
        ] as const).map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={classNames(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm ring-1 transition",
              tab === key
                ? "bg-blue-600/20 text-blue-300 ring-blue-500/40"
                : "bg-slate-900 text-slate-300 ring-slate-800 hover:bg-slate-800/70"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Paneles */}
      {tab === "generar" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800/70 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Parámetros del pase</h3>

            <div className="flex items-center gap-3 mb-4">
              <span className="text-slate-300 text-sm">Identificador:</span>
              <div className="inline-flex rounded-lg overflow-hidden ring-1 ring-slate-800">
                <button
                  onClick={() => {
                    setUseVisitorId(true);
                    // reset del modo usuario
                    setSelectedUser(null);
                    setAuthUserId("");
                    setUInput("");
                  }}
                  className={classNames(
                    "px-3 py-1 text-sm",
                    useVisitorId ? "bg-blue-600/20 text-blue-300" : "bg-slate-900 text-slate-300"
                  )}
                >
                  visitor_id
                </button>
                <button
                  onClick={() => {
                    setUseVisitorId(false);
                    // reset del modo visitante
                    setSelectedVisitor(null);
                    setVisitorId("");
                    setVInput("");
                  }}
                  className={classNames(
                    "px-3 py-1 text-sm",
                    !useVisitorId ? "bg-blue-600/20 text-blue-300" : "bg-slate-900 text-slate-300"
                  )}
                >
                  auth_user_id
                </button>
              </div>
            </div>

            {useVisitorId ? (
              <div className="mb-4">
                <label className="block text-sm text-slate-300 mb-1">Buscar visitante</label>
                <div className="relative">
                  <input
                    className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-slate-200 outline-none focus:ring-2 focus:ring-blue-600/40"
                    placeholder="Escribe nombre o documento..."
                    value={vInput}
                    onChange={(e) => {
                      setVInput(e.target.value);
                      setSelectedVisitor(null);
                      setVisitorId("");
                    }}
                  />
                  {vInput && !selectedVisitor && (
                    <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 shadow-lg max-h-64 overflow-auto">
                      {loadingVisitors ? (
                        <div className="px-3 py-2 text-slate-400 text-sm">Buscando...</div>
                      ) : visitorsError ? (
                        <div className="px-3 py-2 text-red-300 text-sm">{visitorsError}</div>
                      ) : vOptions.length === 0 ? (
                        <div className="px-3 py-2 text-slate-400 text-sm">Sin resultados</div>
                      ) : (
                        vOptions.map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => onPickVisitor(opt.id, opt.full_name)}
                            className="w-full text-left px-3 py-2 hover:bg-slate-900"
                          >
                            <div className="text-slate-100">{opt.full_name}</div>
                            <div className="text-xs text-slate-400 font-mono">{opt.id}</div>
                            {opt.doc_number && (
                              <div className="text-xs text-slate-500">
                                {opt.doc_type || "DOC"}: {opt.doc_number}
                              </div>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {selectedVisitor && (
                  <div className="mt-2 text-sm text-slate-300">
                    Seleccionado: <span className="text-slate-100">{selectedVisitor.label}</span>{" "}
                    <span className="font-mono text-slate-400">({visitorId})</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-4">
                <label className="block text-sm text-slate-300 mb-1">Buscar usuario (Auth)</label>
                <div className="relative">
                  <input
                    className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-slate-200 outline-none focus:ring-2 focus:ring-blue-600/40"
                    placeholder="Nombre, email o UUID..."
                    value={uInput}
                    onChange={(e) => {
                      setUInput(e.target.value);
                      setSelectedUser(null);
                      setAuthUserId("");
                    }}
                  />
                  {uInput && !selectedUser && (
                    <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 shadow-lg max-h-64 overflow-auto">
                      {loadingUsers ? (
                        <div className="px-3 py-2 text-slate-400 text-sm">Buscando...</div>
                      ) : usersError ? (
                        <div className="px-3 py-2 text-red-300 text-sm">{usersError}</div>
                      ) : uOptions.length === 0 ? (
                        <div className="px-3 py-2 text-slate-400 text-sm">Sin resultados</div>
                      ) : (
                        uOptions.map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => onPickUser(opt.id, `${opt.full_name || opt.email} · ${opt.email}`)}
                            className="w-full text-left px-3 py-2 hover:bg-slate-900"
                          >
                            <div className="text-slate-100">{opt.full_name || opt.email}</div>
                            <div className="text-xs text-slate-400">{opt.email}</div>
                            <div className="text-xs text-slate-500 font-mono">{opt.id}</div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {selectedUser && (
                  <div className="mt-2 text-sm text-slate-300">
                    Seleccionado: <span className="text-slate-100">{selectedUser.label}</span>{" "}
                    <span className="font-mono text-slate-400">({authUserId})</span>
                  </div>
                )}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Inicio</label>
                <input
                  type="datetime-local"
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-slate-200 outline-none focus:ring-2 focus:ring-blue-600/40"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Expira</label>
                <input
                  type="datetime-local"
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-slate-200 outline-none focus:ring-2 focus:ring-blue-600/40"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Usos máximos</label>
                <input
                  type="number"
                  min={1}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-slate-200 outline-none focus:ring-2 focus:ring-blue-600/40"
                  value={maxUses}
                  onChange={(e) => setMaxUses(parseInt(e.target.value || "1", 10))}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Notas (opcional)</label>
                <input
                  placeholder="Motivo, torre, etc."
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-slate-200 outline-none focus:ring-2 focus:ring-blue-600/40"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {createError && (
              <div className="mt-4 rounded-xl bg-red-900/30 border border-red-700/50 text-red-200 px-3 py-2">
                {createError}
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={submitCreate}
                disabled={creating}
                className={classNames(
                  "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm",
                  "bg-blue-600/80 text-white hover:bg-blue-600",
                  "disabled:opacity-60 disabled:cursor-not-allowed"
                )}
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                Generar Pase
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/70 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Resultado</h3>

            {!created ? (
              <div className="text-slate-400 text-sm">Genera un pase para ver el resultado aquí.</div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-slate-300">
                    <div className="text-sm">Código</div>
                    <div className="font-mono text-slate-100 text-lg">{created.code}</div>
                  </div>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(created.code);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs bg-slate-800 text-slate-200 hover:bg-slate-700"
                  >
                    {copied ? <ClipboardCheck className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400">Estado</span>
                  <Badge status={created.status} />
                </div>

                <div className="grid sm:grid-cols-2 gap-3 text-sm text-slate-300">
                  <div>
                    <div className="text-slate-400">Inicio</div>
                    <div className="font-mono">{new Date(created.start_at).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Expira</div>
                    <div className="font-mono">{new Date(created.expires_at).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Usos máximos</div>
                    <div className="font-mono">{created.max_uses}</div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-blue-900/20 border border-blue-800/40 text-blue-200 px-4 py-3 text-sm">
                  Entrega este código al visitante. En Validar podrás comprobar su vigencia/usos.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "validar" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800/70 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Validar código</h3>
            <div className="mb-4">
              <label className="block text-sm text-slate-300 mb-1">Código del pase</label>
              <input
                className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-slate-200 outline-none focus:ring-2 focus:ring-blue-600/40"
                placeholder="pt_xxxx-xxxx-xxxx-xxxx"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            {validateError && (
              <div className="mb-4 rounded-xl bg-red-900/30 border border-red-700/50 text-red-200 px-3 py-2">
                {validateError}
              </div>
            )}

            <button
              onClick={submitValidate}
              disabled={validating || !code.trim()}
              className={classNames(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm",
                "bg-blue-600/80 text-white hover:bg-blue-600",
                "disabled:opacity-60 disabled:cursor-not-allowed"
              )}
            >
              {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
              Validar
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800/70 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Resultado</h3>
            {!validateRes ? (
              <div className="text-slate-400 text-sm">Introduce un código y presiona Validar.</div>
            ) : validateRes.ok ? (
              <div className="flex items-start gap-3 rounded-xl border border-green-700/50 bg-green-900/20 p-4">
                <CheckCircle2 className="h-6 w-6 text-green-400 mt-0.5" />
                <div className="text-slate-200">
                  <div className="font-semibold">Pase válido</div>
                  <div className="mt-1 text-sm">
                    Estado: <Badge status={validateRes.status} /> · Usos restantes:{" "}
                    <span className="font-mono">{validateRes.remaining_uses}</span>
                    <div className="mt-1 text-slate-300">
                      Expira: <span className="font-mono">{new Date(validateRes.expires_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-red-700/50 bg-red-900/20 p-4">
                <XCircle className="h-6 w-6 text-red-400 mt-0.5" />
                <div className="text-slate-200">
                  <div className="font-semibold">No válido</div>
                  <div className="mt-1 text-sm">
                    Estado: <Badge status={validateRes.status} /> · Usos restantes:{" "}
                    <span className="font-mono">{validateRes.remaining_uses}</span>
                    <div className="mt-1 text-slate-300">
                      Expira: <span className="font-mono">{new Date(validateRes.expires_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "historial" && (
        <div className="rounded-2xl border border-slate-800/70 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
          <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className="block text-sm text-slate-300 mb-1">Filtrar por estado</label>
              <select
                className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-slate-200 outline-none focus:ring-2 focus:ring-blue-600/40"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="pendiente">pendiente</option>
                <option value="activo">activo</option>
                <option value="usado">usado</option>
                <option value="vencido">vencido</option>
                <option value="revocado">revocado</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm text-slate-300 mb-1">Visitor ID</label>
              <input
                className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-slate-200 outline-none focus:ring-2 focus:ring-blue-600/40"
                placeholder="UUID (opcional)"
                value={visitorFilter}
                onChange={(e) => setVisitorFilter(e.target.value)}
              />
            </div>
            <button
              onClick={loadList}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              <RefreshCcw className="h-4 w-4" />
              Actualizar
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/80 text-slate-300">
                <tr>
                  <th className="px-3 py-2 text-left">Código</th>
                  <th className="px-3 py-2 text-left">Visitante</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-left">Inicio</th>
                  <th className="px-3 py-2 text-left">Expira</th>
                  <th className="px-3 py-2 text-left">Usos</th>
                  <th className="px-3 py-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loadingList ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                      <Loader2 className="inline h-5 w-5 animate-spin mr-2" />
                      Cargando...
                    </td>
                  </tr>
                ) : list.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                      Sin resultados
                    </td>
                  </tr>
                ) : (
                  list.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-900/50">
                      <td className="px-3 py-2 font-mono text-slate-200">{row.code}</td>
                      <td className="px-3 py-2">
                        <div className="text-slate-200">{row.full_name || row.visitor_id}</div>
                        <div className="text-xs text-slate-400">
                          {row.doc_type || ""} {row.doc_number || ""}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge status={row.status} />
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        <div className="font-mono">{new Date(row.start_at).toLocaleString()}</div>
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        <div className="font-mono">{new Date(row.expires_at).toLocaleString()}</div>
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        <span className="font-mono">{row.uses_count}</span> / {row.max_uses}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              await navigator.clipboard.writeText(row.code);
                            }}
                            className="rounded-lg px-2 py-1 text-xs bg-slate-800 text-slate-200 hover:bg-slate-700"
                            title="Copiar código"
                          >
                            <Clipboard className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => revoke(row.id)}
                            disabled={revokingId === row.id || row.status === "revocado"}
                            className={classNames(
                              "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs",
                              row.status === "revocado"
                                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                                : "bg-red-700/80 text-white hover:bg-red-700",
                              "disabled:opacity-60"
                            )}
                          >
                            {revokingId === row.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Revocar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PasesTemporales;
