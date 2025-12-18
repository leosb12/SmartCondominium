import { useEffect, useState } from "react";
import { api } from "../services/api";
import DashboardLayout from "../Layouts/DashboardLayout";
import { Car, RefreshCw } from "lucide-react";

type Auto = {
  placa?: string;
  modelo?: string;
  marca?: string;
  propiedad_id?: number | string;
  nro_casa?: string;
  estado_nombre?: string;
  nombre_propietario?: string;
  apellido_propietario?: string;
  telefono_contacto?: string;
};

export default function MisRegistros() {
  const [autos, setAutos] = useState<Auto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/mis-registros/");
      const payload = response.data as any;
      const data =
        payload && typeof payload === "object" && "data" in payload
          ? payload.data
          : payload;

      const autosRaw = Array.isArray(data?.autos) ? (data.autos as Auto[]) : [];

      setAutos(autosRaw);
    } catch (e) {
      setError("No se pudieron cargar tus registros.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <DashboardLayout
      title="Mis Vehículos"
      subtitle="Vehículos registrados para control de acceso por OCR"
      icon={<Car className="h-5 w-5" />}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-900/50 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800/60 disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
            Recargar
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        )}

        {/* Vehículos */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-300">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                Vehículos Registrados
              </h3>
              <p className="text-sm text-slate-400">
                Para control de acceso con OCR
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-slate-300">Cargando...</div>
          ) : autos.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-slate-400">
              No tienes vehículos registrados. Registra tu auto para el control
              de acceso.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {autos.map((a, idx) => (
                <div
                  key={`${a.placa ?? "auto"}-${idx}`}
                  className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 hover:border-emerald-500/50 transition-colors"
                >
                  <div className="text-sm text-slate-400">Placa</div>
                  <div className="text-lg font-semibold text-white">
                    {a.placa || "—"}
                  </div>
                  <div className="mt-2 text-sm text-slate-300">
                    {[a.marca, a.modelo].filter(Boolean).join(" • ") || "—"}
                  </div>
                  {a.nro_casa && (
                    <div className="mt-2 text-xs text-slate-400">
                      Casa: {a.nro_casa}
                    </div>
                  )}
                  {(a.nombre_propietario || a.apellido_propietario) && (
                    <div className="mt-3 border-t border-slate-800 pt-3">
                      <div className="text-xs text-slate-400 mb-1">
                        Propietario
                      </div>
                      <div className="text-sm font-medium text-white">
                        {a.nombre_propietario} {a.apellido_propietario}
                      </div>
                      {a.telefono_contacto && (
                        <div className="text-xs text-slate-300 mt-1">
                          📞 {a.telefono_contacto}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="text-slate-300 text-sm">
            <strong className="text-white">ℹ️ Importante:</strong> Estos
            vehículos están registrados para el control de acceso automático por
            OCR. Si necesitas modificar algún dato, contacta a la
            administración.
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
