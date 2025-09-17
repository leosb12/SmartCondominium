import { useEffect, useState } from "react";
import { api } from "../services/api";
import DashboardLayout from "../Layouts/DashboardLayout";
import { Link } from "react-router-dom";
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Smartphone,
  Download,
  Eye,
  EyeOff,
  Copy,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Users,
  Settings,
  X,
} from "lucide-react";

interface MFAStatus {
  mfa_enabled: boolean;
  backup_tokens_count: number;
  last_setup: string | null;
  has_totp_secret: boolean;
}

interface MFAAttempt {
  success: boolean;
  method: string;
  failure_reason: string;
  ip_address: string;
  created_at: string;
}

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
  message?: string;
}

interface MFASetupData {
  secret: string;
  qr_code: string; // URL o data URI a la imagen del QR
  provisioning_uri: string;
  instructions?: {
    step_1: string;
    step_2: string;
    step_3: string;
  };
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  backup_tokens?: string[];
  warning?: {
    importante: string;
    uso?: string;
    acceso?: string;
    guardar?: string;
  };
}

export default function AutenticacionSeguridad() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // Estado MFA
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null);
  const [mfaAttempts, setMfaAttempts] = useState<MFAAttempt[]>([]);

  // Setup MFA
  const [setupData, setSetupData] = useState<MFASetupData | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [activationCode, setActivationCode] = useState("");
  const [activating, setActivating] = useState(false);

  // Tokens de respaldo
  const [backupTokens, setBackupTokens] = useState<string[]>([]);
  const [showBackupTokens, setShowBackupTokens] = useState(false);

  // Desactivar MFA
  const [disabling, setDisabling] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState("");

  // Regenerar tokens
  const [regeneratingTokens, setRegeneratingTokens] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState("");

  // Modal para configuración MFA
  const [showSetupModal, setShowSetupModal] = useState(false);

  // Carga inicial
  useEffect(() => {
    loadMFAStatus();
    loadMFAAttempts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMFAStatus = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await api.get<ApiResponse<MFAStatus>>("/mfa/status/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success && res.data.data) {
        setMfaStatus(res.data.data);
      }
    } catch (error) {
      const apiError = error as ApiError;
      console.error("Error loading MFA status:", apiError);
    }
  };

  const loadMFAAttempts = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await api.get<ApiResponse<MFAAttempt[]>>("/mfa/attempts/", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success && res.data.data) {
        setMfaAttempts(res.data.data);
      }
    } catch (error) {
      const apiError = error as ApiError;
      console.error("Error loading MFA attempts:", apiError);
    }
  };

  const handleSetupMFA = async () => {
    try {
      setLoading(true);
      setErr("");
      setMsg("");

      const token = localStorage.getItem("access_token");
      const res = await api.post<ApiResponse<MFASetupData>>(
        "/mfa/setup/",
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.success && res.data.data) {
        setSetupData(res.data.data);
        setShowSetupModal(true); // Mostrar modal en lugar de inline
        setMsg("MFA configurado. Escanea el código QR con tu app autenticadora.");
      } else {
        setErr(res.data.error || "Error configurando MFA");
      }
    } catch (error) {
      const apiError = error as ApiError;
      console.error("Error setting up MFA:", apiError);
      setErr(apiError.response?.data?.error || "Error configurando MFA");
    } finally {
      setLoading(false);
    }
  };

  const handleActivateMFA = async () => {
    if (!activationCode || activationCode.length !== 6) {
      setErr("Ingresa un código de 6 dígitos");
      return;
    }

    try {
      setActivating(true);
      setErr("");
      setMsg("");

      const token = localStorage.getItem("access_token");
      const res = await api.post<ApiResponse>(
        "/mfa/activate/",
        { totp_code: activationCode },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.success) {
        setBackupTokens(res.data.backup_tokens || []);
        setShowBackupTokens(true);
        setSetupData(null);
        setShowSetupModal(false); // Cerrar modal de configuración
        setActivationCode("");
        await loadMFAStatus();
        setMsg("¡MFA activado exitosamente! Guarda tus tokens de respaldo.");
      } else {
        setErr(res.data.error || "Código inválido");
      }
    } catch (error) {
      const apiError = error as ApiError;
      console.error("Error activating MFA:", apiError);
      setErr(apiError.response?.data?.error || "Error activando MFA");
    } finally {
      setActivating(false);
    }
  };

  const handleDisableMFA = async () => {
    if (confirmDisable.toUpperCase() !== "DISABLE MFA") {
      setErr("Debes escribir 'DISABLE MFA' para confirmar");
      return;
    }

    try {
      setDisabling(true);
      setErr("");
      setMsg("");
      
      const token = localStorage.getItem("access_token");
      const res = await api.post<ApiResponse>("/mfa/disable/", {
        confirmation: confirmDisable
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        await loadMFAStatus();
        setConfirmDisable("");
        setMsg("MFA desactivado correctamente");
      } else {
        setErr(res.data.error || "Error desactivando MFA");
      }
    } catch (error) {
      const apiError = error as ApiError;
      console.error("Error disabling MFA:", apiError);
      setErr(apiError.response?.data?.error || "Error desactivando MFA");
    } finally {
      setDisabling(false);
    }
  };

  const handleRegenerateTokens = async () => {
    if (confirmRegenerate.toUpperCase() !== "REGENERATE TOKENS") {
      setErr("Debes escribir 'REGENERATE TOKENS' para confirmar");
      return;
    }

    try {
      setRegeneratingTokens(true);
      setErr("");
      setMsg("");
      
      const token = localStorage.getItem("access_token");
      const res = await api.post<ApiResponse>("/mfa/backup-tokens/", {
        confirmation: confirmRegenerate
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.success) {
        setBackupTokens(res.data.backup_tokens || []);
        setShowBackupTokens(true);
        setConfirmRegenerate("");
        await loadMFAStatus();
        setMsg("Tokens de respaldo regenerados exitosamente");
      } else {
        setErr(res.data.error || "Error regenerando tokens");
      }
    } catch (error) {
      const apiError = error as ApiError;
      console.error("Error regenerating tokens:", apiError);
      setErr(apiError.response?.data?.error || "Error regenerando tokens");
    } finally {
      setRegeneratingTokens(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg("Copiado al portapapeles");
      setTimeout(() => setMsg(""), 2000);
    } catch {
      setErr("No se pudo copiar al portapapeles");
      setTimeout(() => setErr(""), 2000);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleString();
  };

  const closeSetupModal = () => {
    setShowSetupModal(false);
    setSetupData(null);
    setActivationCode("");
    setErr("");
  };

  return (
    <DashboardLayout
      title="Autenticación y Seguridad"
      subtitle="Gestiona la verificación en dos pasos y revisa la actividad de tu cuenta"
    >
      {/* Feedback global */}
      <div className="px-6 sm:px-10 mt-4 space-y-2">
        {msg && (
          <div className="rounded-lg border border-blue-700/50 bg-blue-900/30 px-4 py-3 text-sm flex items-center gap-2">
            <CheckCircle size={16} className="text-blue-400" />
            {msg}
          </div>
        )}
        {err && (
          <div className="rounded-lg border border-red-700/50 bg-red-900/30 px-4 py-3 text-sm flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400" />
            {err}
          </div>
        )}
      </div>

      {/* Contenido */}
      <main className="px-6 sm:px-10 py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card: Estado MFA */}
          <section className="rounded-2xl border border-blue-900/50 bg-slate-900/60 shadow-xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                {mfaStatus?.mfa_enabled ? (
                  <ShieldCheck className="w-6 h-6 text-green-400" />
                ) : (
                  <ShieldX className="w-6 h-6 text-yellow-400" />
                )}
                <div>
                  <h2 className="text-lg font-semibold">Verificación en dos pasos (2FA)</h2>
                  <p className="text-sm text-slate-400">
                    {mfaStatus?.mfa_enabled ? "Activado" : "Desactivado"} • Protege tu cuenta con un código adicional
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className={`rounded-lg border p-4 ${
                  mfaStatus?.mfa_enabled 
                    ? "bg-green-900/20 border-green-800/50" 
                    : "bg-yellow-900/20 border-yellow-800/50"
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield size={16} className={mfaStatus?.mfa_enabled ? "text-green-400" : "text-yellow-400"} />
                    <span className={`text-sm font-medium ${
                      mfaStatus?.mfa_enabled ? "text-green-400" : "text-yellow-400"
                    }`}>
                      {mfaStatus?.mfa_enabled ? "2FA Activado" : "2FA Desactivado"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {mfaStatus?.mfa_enabled
                      ? `Tokens de respaldo disponibles: ${mfaStatus.backup_tokens_count}`
                      : "Tu cuenta está protegida solo con contraseña. Te recomendamos activar 2FA."}
                  </p>
                </div>

                {/* Botón activar MFA o controles para desactivar */}
                {!mfaStatus?.mfa_enabled ? (
                  <button
                    onClick={handleSetupMFA}
                    disabled={loading}
                    className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 transition px-4 py-2 text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Smartphone size={16} />
                    {loading ? "Configurando..." : "Activar 2FA"}
                  </button>
                ) : (
                  <>
                    {/* Desactivar MFA */}
                    <div className="space-y-3 pt-4 border-t border-slate-800">
                      <h3 className="text-sm font-medium text-slate-300">Desactivar 2FA</h3>
                      <p className="text-xs text-slate-500">
                        ⚠️ Esto reducirá la seguridad de tu cuenta. Solo hazlo si es absolutamente necesario.
                      </p>
                      <input
                        type="text"
                        placeholder="Escribe 'DISABLE MFA' para confirmar"
                        value={confirmDisable}
                        onChange={(e) => setConfirmDisable(e.target.value)}
                        className="w-full rounded-lg bg-slate-950/70 border border-red-900/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-600"
                      />
                      <button
                        onClick={handleDisableMFA}
                        disabled={disabling || confirmDisable.toUpperCase() !== "DISABLE MFA"}
                        className="w-full rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-60 transition px-4 py-2 text-sm font-medium"
                      >
                        {disabling ? "Desactivando..." : "Desactivar 2FA"}
                      </button>
                    </div>

                    {/* Regenerar tokens */}
                    <div className="space-y-3 pt-4 border-t border-slate-800">
                      <h3 className="text-sm font-medium text-slate-300">Regenerar tokens de respaldo</h3>
                      <p className="text-xs text-slate-500">
                        Los tokens actuales dejarán de funcionar y se generarán nuevos.
                      </p>
                      <input
                        type="text"
                        placeholder="Escribe 'REGENERATE TOKENS' para confirmar"
                        value={confirmRegenerate}
                        onChange={(e) => setConfirmRegenerate(e.target.value)}
                        className="w-full rounded-lg bg-slate-950/70 border border-blue-900/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <button
                        onClick={handleRegenerateTokens}
                        disabled={regeneratingTokens || confirmRegenerate.toUpperCase() !== "REGENERATE TOKENS"}
                        className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 transition px-4 py-2 text-sm font-medium flex items-center justify-center gap-2"
                      >
                        {regeneratingTokens ? (
                          <>
                            <RefreshCw size={16} className="animate-spin" />
                            Regenerando...
                          </>
                        ) : (
                          <>
                            <RefreshCw size={16} />
                            Regenerar tokens
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Card: Gestión de Roles */}
          <section className="rounded-2xl border border-blue-900/50 bg-slate-900/60 shadow-xl">
            <div className="p-6 flex items-center justify-center h-full min-h-[200px]">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600/20 rounded-lg mx-auto mb-3 flex items-center justify-center">
                  <Users size={24} className="text-blue-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-200 mb-2">
                  Gestión de Roles
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  Administra permisos y roles de usuarios del sistema
                </p>
                <Link
                  to="/gestionrol"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition text-sm font-medium"
                >
                  <Settings size={16} />
                  Gestionar Roles
                </Link>
              </div>
            </div>
          </section>
        </div>

        {/* Card: Actividad reciente */}
        <section className="rounded-2xl border border-blue-900/50 bg-slate-900/60 shadow-xl">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Actividad de autenticación reciente</h2>

            <div className="overflow-x-auto rounded-lg border border-slate-800/60">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-950/50 text-slate-300">
                    <th className="text-left px-4 py-3 border-b border-slate-800/60">Estado</th>
                    <th className="text-left px-4 py-3 border-b border-slate-800/60">Método</th>
                    <th className="text-left px-4 py-3 border-b border-slate-800/60">IP</th>
                    <th className="text-left px-4 py-3 border-b border-slate-800/60">Fecha</th>
                    <th className="text-left px-4 py-3 border-b border-slate-800/60">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {mfaAttempts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                        No hay actividad reciente de autenticación MFA
                      </td>
                    </tr>
                  ) : (
                    mfaAttempts.map((attempt, index) => (
                      <tr
                        key={index}
                        className="even:bg-slate-950/30 hover:bg-slate-800/30 transition"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {attempt.success ? (
                              <CheckCircle size={16} className="text-green-400" />
                            ) : (
                              <AlertTriangle size={16} className="text-red-400" />
                            )}
                            <span className={attempt.success ? "text-green-400" : "text-red-400"}>
                              {attempt.success ? "Exitoso" : "Fallido"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="capitalize">{attempt.method}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{attempt.ip_address}</td>
                        <td className="px-4 py-3">{formatDate(attempt.created_at)}</td>
                        <td className="px-4 py-3 text-slate-400">
                          {attempt.failure_reason || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {/* Modal: Configuración MFA */}
      {showSetupModal && setupData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl shadow-2xl p-8 border border-blue-800/40 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/20 rounded-lg">
                  <Shield className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Configurar aplicación autenticadora</h2>
                  <p className="text-gray-400 text-sm">Sigue estos pasos para activar 2FA</p>
                </div>
              </div>
              <button
                onClick={closeSetupModal}
                className="text-gray-400 hover:text-white transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* QR Code */}
            <div className="text-center mb-6">
              <div className="inline-block p-4 bg-white rounded-lg mb-3">
                <img src={setupData.qr_code} alt="QR Code" className="w-48 h-48" />
              </div>
              <p className="text-xs text-slate-400">
                Escanea este código con tu app autenticadora
              </p>
            </div>

            {/* Secret manual */}
            <div className="mb-6">
              <label className="block text-sm text-slate-300 mb-2">
                O ingresa este código manualmente:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type={showSecret ? "text" : "password"}
                  value={setupData.secret}
                  readOnly
                  className="flex-1 rounded-lg bg-slate-950/70 border border-blue-900/60 px-3 py-2 text-sm font-mono"
                />
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
                  aria-label={showSecret ? "Ocultar secreto" : "Mostrar secreto"}
                >
                  {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  onClick={() => copyToClipboard(setupData.secret)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
                  aria-label="Copiar secreto"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            {/* Activación */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">
                  Código de verificación (6 dígitos):
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-lg bg-slate-950/70 border border-blue-900/60 px-3 py-2 text-center text-lg font-mono outline-none focus:ring-2 focus:ring-blue-600"
                  autoFocus
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={closeSetupModal}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleActivateMFA}
                  disabled={activating || activationCode.length !== 6}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-60 transition text-sm font-medium rounded-lg"
                >
                  {activating ? "Activando..." : "Activar 2FA"}
                </button>
              </div>
            </div>

            {/* Instrucciones */}
            <div className="mt-6 p-4 bg-slate-800/50 rounded-lg">
              <h4 className="text-sm font-medium text-slate-300 mb-2">Aplicaciones recomendadas:</h4>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• Google Authenticator</li>
                <li>• Microsoft Authenticator</li>
                <li>• Authy</li>
                <li>• 1Password</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tokens de respaldo */}
      {showBackupTokens && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl shadow-2xl p-8 border border-blue-800/40 w-full max-w-md">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-green-600/20 rounded-lg mx-auto mb-3 flex items-center justify-center">
                <Download className="w-6 h-6 text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Tokens de respaldo</h2>
              <p className="text-gray-400 text-sm">
                Guarda estos tokens en un lugar seguro. Cada uno solo se puede usar una vez.
              </p>
            </div>

            <div className="bg-slate-950/70 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                {backupTokens.map((token, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span>{token}</span>
                    <button
                      onClick={() => copyToClipboard(token)}
                      className="p-1 hover:bg-slate-800 rounded transition"
                      aria-label="Copiar token"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => copyToClipboard(backupTokens.join("\n"))}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium"
              >
                Copiar todos
              </button>
              <button
                onClick={() => setShowBackupTokens(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition text-sm font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
