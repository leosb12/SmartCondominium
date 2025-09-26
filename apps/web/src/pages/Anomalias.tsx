import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../Layouts/DashboardLayout";
import { useRoles } from "../hooks/useRoles";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  ShieldCheck,
  EyeOff,
  Image as ImageIcon,
  Check,
  Loader2,
} from "lucide-react";
import { api } from "../services/api";

const ALLOWED_ROLE_IDS = new Set<number>([1, 4]);

type AnomaliaDetalle = {
  fecha: string;
  foto_url?: string | null;
  observacion?: string | null;
  placa_detectada?: string | null;
};

type Anomalia = {
  id: number;
  tipo_anomalia: string;
  descripcion: string;
  detalle: AnomaliaDetalle;
  fecha: string;
  ubicacion?: string | null;
  procesado: boolean;
};

export default function AnomaliasPage() {
  const navigate = useNavigate();
  const { roles, loading: rolesLoading } = useRoles();

  const [items, setItems] = useState<Anomalia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [imageModal, setImageModal] = useState<{ open: boolean; url: string | null }>({ open: false, url: null });
  const [processingId, setProcessingId] = useState<number | null>(null);

  // Verificar roles permitidos
  useEffect(() => {
    if (!rolesLoading && roles && roles.length > 0) {
      const allowed = roles.some((r: any) => ALLOWED_ROLE_IDS.has(r.id));
      if (!allowed) navigate("/dashboard", { replace: true });
    }
  }, [roles, rolesLoading, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<Anomalia[]>("/anomalias/");
      setItems(res.data);
    } catch (e: any) {
      setError(
        e?.response?.data?.error ||
        e?.message ||
        "Error cargando anomalías"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!rolesLoading && roles && roles.length > 0) {
      const allowed = roles.some((r: any) => ALLOWED_ROLE_IDS.has(r.id));
      if (allowed) load();
    }
  }, [roles, rolesLoading, load]);

  // Marcar como procesado
  const marcarProcesado = async (id: number) => {
    setProcessingId(id);
    setError("");
    try {
      await api.patch(`/anomalias/${id}/procesado/`, { procesado: true });
      setSuccess("Anomalía marcada como procesada");
      setTimeout(() => setSuccess(""), 1200);
      // Actualiza la lista
      setItems((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, procesado: true } : a
        )
      );
    } catch (e: any) {
      setError(
        e?.response?.data?.error ||
        e?.message ||
        "Error marcando como procesada"
      );
    } finally {
      setProcessingId(null);
    }
  };

  if (rolesLoading) {
    return (
      <DashboardLayout title="Anomalías" subtitle="Cargando...">
        <div className="flex items-center justify-center min-h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (!roles?.some((r: any) => ALLOWED_ROLE_IDS.has(r.id))) return null;

  return (
    <DashboardLayout
      title="Anomalías"
      subtitle="Registro de intentos de acceso irregular (personas y autos)"
    >
      {/* Mensajes */}
      <div className="px-6 sm:px-10 mt-4 space-y-2">
        {success && (
          <div className="rounded-lg border border-green-700/50 bg-green-900/30 px-4 py-3 text-sm flex items-center gap-2">
            <CheckCircle size={16} className="text-green-400" />
            {success}
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-700/50 bg-red-900/30 px-4 py-3 text-sm flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            {error}
          </div>
        )}
      </div>

      <main className="px-4 sm:px-10 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Anomalías</h1>
              <p className="text-slate-400">
                {items.length} registros
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <div className="inline-flex items-center gap-1 text-blue-300 bg-blue-900/30 border border-blue-800/50 px-3 py-1 rounded-full text-xs">
              <ShieldCheck size={14} />
              Solo administradores y seguridad
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12">
              <RefreshCw className="w-10 h-10 animate-spin text-blue-400 mb-2" />
              <span className="text-slate-400">Cargando anomalías...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12">
              <ImageIcon className="w-16 h-16 text-slate-700 mb-3" />
              <span className="text-slate-400">Sin anomalías registradas</span>
            </div>
          ) : (
            items.map((anomalia) => (
              <div
                key={anomalia.id}
                className="bg-slate-900/80 border border-blue-800/40 rounded-2xl shadow-lg p-5 flex flex-col gap-3 transition hover:shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs px-3 py-1 rounded-full bg-blue-800/30 text-blue-300 font-medium capitalize">
                    {anomalia.tipo_anomalia}
                  </span>
                  <span
                    className={
                      "text-xs px-2 py-1 rounded-lg border font-semibold flex items-center gap-2 " +
                      (anomalia.procesado
                        ? "bg-green-900/20 text-green-300 border-green-800"
                        : "bg-yellow-900/30 text-yellow-300 border-yellow-700")
                    }
                  >
                    {anomalia.procesado ? (
                      <>
                        <Check size={14} /> Procesado
                      </>
                    ) : (
                      <>
                        No procesado
                        <button
                          className="ml-2 px-2 py-1 text-xs rounded bg-blue-700 hover:bg-blue-600 text-white transition flex items-center gap-1"
                          disabled={processingId === anomalia.id}
                          onClick={() => marcarProcesado(anomalia.id)}
                          title="Marcar como procesado"
                        >
                          {processingId === anomalia.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Check size={14} />
                          )}
                          Procesar
                        </button>
                      </>
                    )}
                  </span>
                </div>
                <div className="font-bold text-white text-lg mb-1">
                  {anomalia.descripcion}
                </div>
                <div className="text-slate-400 text-xs">
                  Fecha:{" "}
                  <span className="text-blue-200 font-semibold">
                    {anomalia.detalle?.fecha
                      ? new Date(anomalia.detalle.fecha).toLocaleString()
                      : "-"}
                  </span>
                </div>
                {anomalia.detalle?.placa_detectada && (
                  <div className="text-slate-400 text-xs mb-1">
                    Placa detectada:{" "}
                    <span className="text-blue-200 font-semibold">
                      {anomalia.detalle.placa_detectada}
                    </span>
                  </div>
                )}
                {anomalia.detalle?.observacion && (
                  <div className="text-slate-400 text-xs mb-1">
                    Observación:{" "}
                    <span className="text-blue-200 font-semibold">
                      {anomalia.detalle.observacion}
                    </span>
                  </div>
                )}
                {anomalia.detalle?.foto_url ? (
                  <div className="flex flex-col items-center mt-2">
                    <img
                      src={anomalia.detalle.foto_url}
                      alt="Evidencia"
                      className="rounded-lg border border-blue-900 max-h-40 cursor-pointer hover:scale-105 transition"
                      style={{ background: "#263146" }}
                      onClick={() =>
                        setImageModal({ open: true, url: anomalia.detalle.foto_url! })
                      }
                    />
                    <span className="text-xs text-slate-400 mt-1">Clic para agrandar</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-500 text-xs mt-2">
                    <ImageIcon className="w-4 h-4" /> Sin imagen capturada
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      {/* Modal para agrandar imagen */}
      {imageModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setImageModal({ open: false, url: null })}
        >
          <div
            className="relative bg-slate-900 rounded-xl p-4 border border-blue-900 shadow-lg"
            style={{ maxWidth: "98vw", maxHeight: "94vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {imageModal.url && (
              <img
                src={imageModal.url}
                alt="Evidencia anomalia"
                className="rounded-xl max-h-[80vh] max-w-[90vw] border border-blue-700"
                style={{ background: "#263146" }}
              />
            )}
            <button
              className="absolute top-2 right-2 bg-blue-700/80 hover:bg-blue-600 p-2 rounded-full"
              onClick={() => setImageModal({ open: false, url: null })}
              aria-label="Cerrar"
            >
              <EyeOff className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}