import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { Shield, Eye, EyeOff } from "lucide-react";

interface MFAModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (code: string, method: 'totp' | 'backup') => void;
  loading: boolean;
  error: string;
}

interface PendingAuth {
  email: string;
  password: string;
}

interface ApiError {
  response?: {
    data?: {
      error?: string;
      mfa_required?: boolean;
    };
  };
  message?: string;
}

interface LoginResponse {
  success: boolean;
  access_token?: string;
  refresh_token?: string;
  mfa_required?: boolean;
  error?: string;
  user_id?: string;
  user?: {
    id: string;
    email: string;
    mfa_enabled?: boolean;
  };
}

function MFAModal({ isOpen, onClose, onSubmit, loading, error }: MFAModalProps) {
  const [code, setCode] = useState("");
  const [method, setMethod] = useState<'totp' | 'backup'>('totp');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      onSubmit(code.trim(), method);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl p-8 border border-blue-800/40 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-600/20 rounded-lg">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Verificación en dos pasos</h2>
            <p className="text-gray-400 text-sm">Ingresa tu código de autenticación</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-600/90 text-white p-3 rounded-md mb-4 text-center text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selector de método */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMethod('totp')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                method === 'totp'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Código de la app
            </button>
            <button
              type="button"
              onClick={() => setMethod('backup')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                method === 'backup'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Token de respaldo
            </button>
          </div>

          {/* Input del código */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              {method === 'totp' ? 'Código de 6 dígitos' : 'Token de respaldo'}
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={method === 'totp' ? '123456' : 'ABC12345'}
              maxLength={method === 'totp' ? 6 : 8}
              className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-white text-center text-lg font-mono placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1">
              {method === 'totp' 
                ? 'Abre tu app autenticadora y obtén el código de 6 dígitos'
                : 'Usa uno de los tokens de respaldo que guardaste'
              }
            </p>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium rounded-lg transition"
            >
              {loading ? "Verificando..." : "Verificar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Estados MFA
  const [showMFA, setShowMFA] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState("");
  const [pendingAuth, setPendingAuth] = useState<PendingAuth | null>(null);

  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.post<LoginResponse>("/login/", { email, password });

      if (res.data.success) {
        // Login exitoso sin MFA
        localStorage.setItem("access_token", res.data.access_token || "");
        localStorage.setItem("refresh_token", res.data.refresh_token || "");
        navigate("/dashboard", { replace: true });
      } else if (res.data.mfa_required) {
        // Requiere MFA
        setPendingAuth({ email, password });
        setShowMFA(true);
        setError("");
      } else {
        setError(res.data.error || "Credenciales inválidas");
      }
    } catch (err) {
      const apiError = err as ApiError;
      console.error("Error en login:", apiError);
      if (apiError.response?.data?.mfa_required) {
        setPendingAuth({ email, password });
        setShowMFA(true);
        setError("");
      } else {
        setError(apiError.response?.data?.error || "Error al iniciar sesión");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMFASubmit = async (code: string, method: 'totp' | 'backup') => {
    if (!pendingAuth) return;
    
    try {
      setMfaLoading(true);
      setMfaError("");

      const res = await api.post<LoginResponse>("/login/", {
        email: pendingAuth.email,
        password: pendingAuth.password,
        mfa_code: code,
        mfa_method: method
      });

      if (res.data.success) {
        localStorage.setItem("access_token", res.data.access_token || "");
        localStorage.setItem("refresh_token", res.data.refresh_token || "");
        navigate("/dashboard", { replace: true });
      } else {
        throw new Error(res.data.error || "Código MFA inválido");
      }
    } catch (err) {
      const apiError = err as ApiError;
      console.error("Error en MFA:", apiError);
      setMfaError(apiError.response?.data?.error || (err as Error).message || "Código inválido");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleMFAClose = () => {
    setShowMFA(false);
    setMfaError("");
    setPendingAuth(null);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-black via-gray-900 to-blue-950 p-4">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl shadow-2xl p-8 border border-blue-800/40">
        <h1 className="text-4xl font-extrabold text-center text-blue-400 mb-2 tracking-wide">
          Smart Condominium
        </h1>
        <p className="text-gray-400 text-center mb-6">
          Bienvenido, inicia sesión para continuar
        </p>

        {error && (
          <div className="bg-red-600/90 text-white p-3 rounded-md mb-4 text-center text-sm font-medium">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800/80 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 pr-12 bg-gray-800/80 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-3 rounded-lg transition transform hover:scale-[1.02] active:scale-[0.98] shadow-md flex items-center justify-center gap-2"
          >
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </div>

        <div className="mt-6 text-center space-y-2">
          <Link
            to="/forgot-password"
            className="block text-blue-400 hover:text-blue-300 text-sm transition"
          >
            ¿Olvidaste tu contraseña?
          </Link>
          <Link
            to="/register"
            className="block text-gray-400 hover:text-blue-300 text-sm transition"
          >
            ¿No tienes cuenta? <span className="text-blue-400 font-semibold">Regístrate</span>
          </Link>
        </div>
      </div>

      {/* Modal MFA */}
      <MFAModal
        isOpen={showMFA}
        onClose={handleMFAClose}
        onSubmit={handleMFASubmit}
        loading={mfaLoading}
        error={mfaError}
      />
    </div>
  );
}