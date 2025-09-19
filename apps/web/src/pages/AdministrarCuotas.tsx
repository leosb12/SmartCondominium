// src/pages/AdministrarCuotas.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  DollarSign, 
  Calculator, 
  Calendar, 
  TrendingUp, 
  RefreshCw, 
  AlertCircle,
  Check,
  Loader2,
  ArrowLeft
} from "lucide-react";
import DashboardLayout from "../Layouts/DashboardLayout";
import { useRoles } from "../hooks/useRoles";
import { useFinance } from "../hooks/useFinance";

const AdministrarCuotas: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const {
    loading,
    error,
    tarifaVigente,
    expensasGeneradas,
    crearTarifa,
    obtenerTarifaVigente,
    crearExtraordinaria,
    generarExpensasHoy,
    clearError
  } = useFinance();

  // Estados locales para formularios
  const [nuevaTarifa, setNuevaTarifa] = useState("");
  const [periodoExtraordinaria, setPeriodoExtraordinaria] = useState("");
  const [montoExtraordinaria, setMontoExtraordinaria] = useState("");
  const [descripcionExtraordinaria, setDescripcionExtraordinaria] = useState("");
  
  // Estados de éxito
  const [tarifaCreada, setTarifaCreada] = useState(false);
  const [extraordinariaCreada, setExtraordinariaCreada] = useState(false);
  const [expensasGeneradasSuccess, setExpensasGeneradasSuccess] = useState(false);

  // Cargar tarifa vigente al montar el componente
  useEffect(() => {
    if (isAdmin) {
      obtenerTarifaVigente();
    }
  }, [isAdmin, obtenerTarifaVigente]);

  // Redireccionar si no es admin
  useEffect(() => {
    if (!rolesLoading && !isAdmin) {
      navigate("/finanzas");
    }
  }, [isAdmin, rolesLoading, navigate]);

  // Generar período mínimo (próximo mes)
  const getProximoMes = () => {
    const now = new Date();
    const proximoMes = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return proximoMes.toISOString().slice(0, 7); // YYYY-MM
  };

  // Handlers para formularios
  const handleCrearTarifa = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const monto = parseFloat(nuevaTarifa);
    if (isNaN(monto) || monto <= 0) {
      return;
    }

    await crearTarifa(monto);
    
    if (!error) {
      setTarifaCreada(true);
      setNuevaTarifa("");
      
      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setTarifaCreada(false), 3000);
    }
  };

  const handleCrearExtraordinaria = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const monto = parseFloat(montoExtraordinaria);
    if (isNaN(monto) || monto <= 0 || !periodoExtraordinaria) {
      return;
    }

    await crearExtraordinaria(periodoExtraordinaria, monto, descripcionExtraordinaria);
    
    if (!error) {
      setExtraordinariaCreada(true);
      setPeriodoExtraordinaria("");
      setMontoExtraordinaria("");
      setDescripcionExtraordinaria("");
      
      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setExtraordinariaCreada(false), 3000);
    }
  };

  const handleGenerarExpensas = async () => {
    await generarExpensasHoy();
    
    if (!error) {
      setExpensasGeneradasSuccess(true);
      
      // Limpiar mensaje de éxito después de 5 segundos
      setTimeout(() => setExpensasGeneradasSuccess(false), 5000);
    }
  };

  if (rolesLoading) {
    return (
      <DashboardLayout
        title="Administrar Cuotas"
        subtitle="Cargando..."
        icon={<DollarSign className="h-5 w-5 text-blue-400" />}
      >
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Administrar Cuotas"
      subtitle="Gestiona tarifas ordinarias, extraordinarias y generación de expensas"
      icon={<DollarSign className="h-5 w-5 text-blue-400" />}
    >
      {/* Botón de regreso */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/finanzas")}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Finanzas
        </button>
      </div>

      {/* Mensaje de error global */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-800/60 bg-red-950/60 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-red-400 font-medium">Error</p>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Sección: Cuota Ordinaria */}
        <div className="rounded-2xl border border-slate-800/60 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-600/20 ring-1 ring-inset ring-blue-500/30">
              <Calculator className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-100">Cuota Ordinaria</h2>
              <p className="text-slate-400 text-sm">Tarifa por m² y generación de expensas</p>
            </div>
          </div>

          {/* Tarifa vigente */}
          <div className="mb-6 p-4 rounded-lg border border-slate-700/60 bg-slate-800/40">
            <h3 className="text-sm font-medium text-slate-300 mb-2">Tarifa Vigente</h3>
            {tarifaVigente ? (
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-green-400">
                  Bs. {tarifaVigente.monto.toFixed(2)}/m²
                </span>
                <span className="text-xs text-slate-500">
                  Desde: {new Date(tarifaVigente.created_at).toLocaleDateString()}
                </span>
              </div>
            ) : (
              <span className="text-slate-500">No hay tarifa configurada</span>
            )}
          </div>

          {/* Formulario nueva tarifa */}
          <form onSubmit={handleCrearTarifa} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nueva Tarifa (Bs/m²)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={nuevaTarifa}
                onChange={(e) => setNuevaTarifa(e.target.value)}
                placeholder="Ej: 150.50"
                className="w-full px-4 py-3 rounded-lg border border-slate-700 bg-slate-800/60 text-slate-100 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || !nuevaTarifa}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium transition-colors"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
              Actualizar Tarifa
            </button>
          </form>

          {/* Mensaje de éxito tarifa */}
          {tarifaCreada && (
            <div className="mt-4 p-3 rounded-lg border border-green-800/60 bg-green-950/60">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-400" />
                <span className="text-green-400 text-sm font-medium">Tarifa actualizada exitosamente</span>
              </div>
            </div>
          )}

          {/* Botón generar expensas */}
          <div className="mt-6 pt-6 border-t border-slate-700/60">
            <button
              onClick={handleGenerarExpensas}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium transition-colors"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Generar Expensas Hoy
            </button>
            
            {/* Mensaje de éxito expensas */}
            {expensasGeneradasSuccess && (
              <div className="mt-3 p-3 rounded-lg border border-green-800/60 bg-green-950/60">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" />
                  <span className="text-green-400 text-sm font-medium">
                    {expensasGeneradas.length > 0 
                      ? `${expensasGeneradas.length} expensas generadas exitosamente`
                      : "No se generaron expensas nuevas (ya procesadas o no hay propiedades programadas para hoy)"
                    }
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sección: Cuota Extraordinaria */}
        <div className="rounded-2xl border border-slate-800/60 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-purple-600/20 ring-1 ring-inset ring-purple-500/30">
              <Calendar className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-100">Cuota Extraordinaria</h2>
              <p className="text-slate-400 text-sm">Gastos adicionales por período</p>
            </div>
          </div>

          {/* Formulario extraordinaria */}
          <form onSubmit={handleCrearExtraordinaria} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Período (Mes y Año)
              </label>
              <input
                type="month"
                value={periodoExtraordinaria}
                min={getProximoMes()}
                onChange={(e) => setPeriodoExtraordinaria(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-700 bg-slate-800/60 text-slate-100 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                Solo se permiten meses futuros (desde {getProximoMes()})
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Monto Total (Bs)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={montoExtraordinaria}
                onChange={(e) => setMontoExtraordinaria(e.target.value)}
                placeholder="Ej: 50000.00"
                className="w-full px-4 py-3 rounded-lg border border-slate-700 bg-slate-800/60 text-slate-100 placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Descripción (Opcional)
              </label>
              <textarea
                value={descripcionExtraordinaria}
                onChange={(e) => setDescripcionExtraordinaria(e.target.value)}
                placeholder="Ej: Reparación de elevador, Mantenimiento de jardines..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-slate-700 bg-slate-800/60 text-slate-100 placeholder-slate-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none resize-none"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || !periodoExtraordinaria || !montoExtraordinaria}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium transition-colors"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
              Configurar Extraordinaria
            </button>
          </form>

          {/* Mensaje de éxito extraordinaria */}
          {extraordinariaCreada && (
            <div className="mt-4 p-3 rounded-lg border border-green-800/60 bg-green-950/60">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-400" />
                <span className="text-green-400 text-sm font-medium">Extraordinaria configurada exitosamente</span>
              </div>
            </div>
          )}

          {/* Info adicional */}
          <div className="mt-6 p-4 rounded-lg border border-slate-700/60 bg-slate-800/40">
            <h4 className="text-sm font-medium text-slate-300 mb-2">ℹ️ Información</h4>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>• El monto se prorratea automáticamente por m² de cada propiedad</li>
              <li>• Se aplicará en el mes seleccionado cuando se generen las expensas</li>
              <li>• Si ya existe una extraordinaria para ese período, se actualizará</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Lista de expensas generadas recientemente */}
      {expensasGeneradas.length > 0 && (
        <div className="mt-8 rounded-2xl border border-slate-800/60 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">
            Expensas Generadas Recientemente ({expensasGeneradas.length})
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {expensasGeneradas.slice(0, 6).map((expensa) => (
              <div
                key={expensa.id}
                className="p-4 rounded-lg border border-slate-700/60 bg-slate-800/40"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-slate-300">
                    {expensa.propiedad.nro_casa}
                  </span>
                  <span className="text-xs text-slate-500">
                    {expensa.propiedad.m2}m²
                  </span>
                </div>
                <div className="text-lg font-bold text-green-400">
                  Bs. {expensa.total.toFixed(2)}
                </div>
                <div className="text-xs text-slate-500">
                  {new Date(expensa.fecha).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
          {expensasGeneradas.length > 6 && (
            <p className="text-center text-slate-500 text-sm mt-4">
              Y {expensasGeneradas.length - 6} expensas más...
            </p>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdministrarCuotas;