import React, { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../Layouts/DashboardLayout";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { plateApi } from "../services/plateApi";
import { useRoles } from "../hooks/useRoles";
import { supabase } from "../services/supabaseClient";

const ALLOWED_ROLE_IDS = new Set<number>([1, 4]);

type PlateResult = {
  plate: string;
  authorized: boolean;
};

const EVENTOS = ["ENTRADA", "SALIDA", "INTENTO"];
const RESULTADOS = ["AUTORIZADO", "DENEGADO"];

const DetectarPlaca: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraPrompt, setCameraPrompt] = useState(false);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);

  const [openRegistro, setOpenRegistro] = useState(false);
  const [evento, setEvento] = useState<string>("ENTRADA");
  const [resultado, setResultado] = useState<string>("AUTORIZADO");
  const [detalles, setDetalles] = useState<string>("");

  const [registroOk, setRegistroOk] = useState<boolean>(false);

  const navigate = useNavigate();
  const { roles } = useRoles();

  useEffect(() => {
    if (!roles || roles.length === 0) return;
    const isAllowed = roles.some((r: any) => ALLOWED_ROLE_IDS.has(r.id));
    if (!isAllowed) {
      navigate("/dashboard", { replace: true });
    }
  }, [roles, navigate]);

  useEffect(() => {
    const onBeforeUnload = () => setCameraPrompt(true);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const startCamera = async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCameraPrompt(false);
    } catch (err) {
      setError("No se pudo acceder a la cámara.");
      setCameraPrompt(false);
    }
  };

  useEffect(() => {
    if (videoRef.current && stream && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (!cameraPrompt && !stream) setCameraPrompt(true);
  }, [stream, cameraPrompt]);

  const handleCapture = async () => {
    setResult(null);
    setError(null);

    if (!videoRef.current || !canvasRef.current) {
      setError("Cámara no disponible.");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setError("No se pudo procesar la imagen.");
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setError("No se pudo capturar la imagen.");
        return;
      }
      setLoading(true);
      await sendImageToApi(blob);
    }, "image/jpeg");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResult(null);
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      setImgFile(file);
      setImgPreview(URL.createObjectURL(file));
    } else {
      setImgFile(null);
      setImgPreview(null);
    }
  };

  const sendImageToApi = async (imgBlob: Blob | File) => {
    const formData = new FormData();
    formData.append("file", imgBlob, "placa.jpg");

    try {
      const res = await plateApi.post("/plates/match", formData, {
        headers: {
          // API KEY si aplica
        },
      });
      setResult(res.data);

      if (res.data.authorized) {
        setOpenRegistro(true);
        setEvento("ENTRADA");
        setResultado("AUTORIZADO");
        setDetalles("");
        setRegistroOk(false);
      } else {
        // ----- ANOMALIA: Insertar registro en anomalia si auto no es reconocido -----
        try {
          let foto_url = null;
          // Subir la imagen al bucket "anomalias" en Supabase Storage
          const fileName = `autos/${Date.now()}_auto_desconocido.jpg`;
          const { data: storageRes, error: storageErr } = await supabase.storage
            .from("anomalias")
            .upload(fileName, imgBlob, { cacheControl: "3600", upsert: false });
          if (!storageErr && storageRes && storageRes.path) {
            // Obtener url pública
            const { data: publicUrl } = supabase
              .storage
              .from("anomalias")
              .getPublicUrl(storageRes.path);
            foto_url = publicUrl?.publicUrl || null;
          }
          // Insertar en tabla anomalia
          await supabase.from("anomalia").insert([
            {
              tipo_anomalia: "auto",
              descripcion: "Intento de ingreso de auto no reconocido",
              detalle: {
                foto_url,
                placa_detectada: res.data.plate,
                fecha: new Date().toISOString(),
                observacion: "Intento de acceso con placa no reconocida"
              },
              fecha: new Date().toISOString(),
              ubicacion: null,
              procesado: false
            }
          ]);
        } catch (anomaliaError) {
          // No mostramos error al usuario, solo para log interno
          // console.error("Error registrando anomalia auto:", anomaliaError);
        }
      }
    } catch (err: any) {
      if (err.response && err.response.data) {
        setError(
          typeof err.response.data.detail === "string"
            ? err.response.data.detail
            : Array.isArray(err.response.data.detail)
            ? err.response.data.detail.map((e: any) => e.msg).join(" | ")
            : JSON.stringify(err.response.data)
        );
      } else {
        setError("Error de red o del servidor");
      }
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    setError(null);
    if (!imgFile) {
      setError("Debe seleccionar una imagen.");
      return;
    }
    setLoading(true);
    await sendImageToApi(imgFile);
  };

  const handleRegistroAcceso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!result?.plate) return;
    setLoading(true);
    setError(null);
    setRegistroOk(false);

    const registro = {
      placa: result.plate,
      fecha_hora: new Date().toISOString(),
      evento,
      resultado,
      detalles: detalles ? { descripcion: detalles } : {},
    };

    const { error: supaError } = await supabase
      .from("registro_acceso_auto")
      .insert([registro]);

    setLoading(false);

    if (!supaError) {
      setRegistroOk(true);
      setOpenRegistro(false);
      setEvento("ENTRADA");
      setResultado("AUTORIZADO");
      setDetalles("");
    } else {
      setError("No se pudo registrar el acceso: " + supaError.message);
    }
  };

  return (
    <DashboardLayout
      title="Detectar placa"
      subtitle="Reconoce la placa de un vehículo usando cámara o imagen"
      icon={<ShieldCheckIcon className="w-8 h-8 text-blue-400" />}
    >
      <div className="w-full max-w-lg mx-auto bg-gray-900 rounded-2xl shadow-2xl p-8 border border-blue-800/40">
        <h2 className="text-2xl font-bold text-blue-300 mb-6 text-center">
          Detección de placas (imagen o cámara)
        </h2>

        {/* Subir imagen */}
        <form onSubmit={handleImageSubmit}>
          <div className="flex flex-col items-center mb-4">
            <label className="block w-full text-blue-200 font-semibold text-sm mb-2">
              Sube una imagen de una placa:
              <input
                type="file"
                accept="image/*"
                className="block mt-2 w-full text-blue-100 bg-blue-900/50 rounded-lg border border-blue-700 p-2"
                onChange={handleFileChange}
                disabled={loading}
              />
            </label>
            {imgPreview && (
              <div className="my-2">
                <img
                  src={imgPreview}
                  alt="Previsualización"
                  className="rounded-lg border border-blue-900 max-h-40"
                  style={{ background: "#263146" }}
                />
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !imgFile}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-2 rounded-lg transition mt-2"
            >
              {loading ? "Detectando..." : "Detectar desde imagen"}
            </button>
          </div>
        </form>

        <div className="w-full border-t border-blue-700/40 my-6" />

        {/* Cámara */}
        <div className="flex flex-col items-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-w-sm rounded-lg border border-blue-900 bg-slate-800 shadow mb-4 aspect-video"
            style={{ background: "#263146" }}
          />
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>
        {cameraPrompt && (
          <div className="mt-3 mb-4 bg-blue-800/70 p-4 rounded-lg text-center text-white font-semibold shadow">
            <p>¿Permitir acceso a la cámara?</p>
            <button
              className="mt-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-bold transition"
              onClick={startCamera}
            >
              Permitir cámara
            </button>
          </div>
        )}
        <button
          onClick={handleCapture}
          disabled={loading || cameraPrompt || !stream}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-3 rounded-lg transition mt-2"
        >
          {loading ? "Detectando..." : "Capturar y detectar desde cámara"}
        </button>

        {result && (
          <div
            className={`mt-6 p-4 rounded-xl shadow text-center ${
              result.authorized
                ? "bg-green-700/80 text-white"
                : "bg-yellow-700/80 text-white"
            }`}
          >
            <div className="text-lg font-bold mb-2">
              {result.authorized ? "Placa autorizada" : "Placa NO autorizada"}
            </div>
            <div>
              <span className="font-semibold text-blue-200">Placa detectada: </span>
              <span className="text-blue-100 text-xl">{result.plate}</span>
            </div>
          </div>
        )}
        {error && (
          <div className="bg-red-600/90 text-white p-3 rounded-md mt-5 text-center text-sm font-medium">
            {error}
          </div>
        )}
        {registroOk && (
          <div className="bg-green-700/90 text-white p-3 rounded-md mt-5 text-center text-sm font-medium">
            Registro de acceso guardado correctamente.
          </div>
        )}
      </div>

      {/* Pop-up/Modal para registro_acceso_auto */}
      {openRegistro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-900 p-6 rounded-2xl shadow-xl w-full max-w-md border border-blue-800/60">
            <h3 className="text-xl font-bold text-blue-300 mb-4 text-center">
              Placa autorizada: registro de acceso
            </h3>
            <form onSubmit={handleRegistroAcceso} className="space-y-4">
              <div>
                <label className="block text-blue-200 font-semibold mb-1">Evento</label>
                <select
                  className="w-full rounded-lg border border-blue-700 bg-blue-900/60 text-blue-100 p-2"
                  value={evento}
                  onChange={e => setEvento(e.target.value)}
                  required
                >
                  {EVENTOS.map(ev => (
                    <option key={ev} value={ev}>{ev}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-blue-200 font-semibold mb-1">¿Autorizar ingreso?</label>
                <select
                  className="w-full rounded-lg border border-blue-700 bg-blue-900/60 text-blue-100 p-2"
                  value={resultado}
                  onChange={e => setResultado(e.target.value)}
                  required
                >
                  {RESULTADOS.map(res => (
                    <option key={res} value={res}>{res}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-blue-200 font-semibold mb-1">Detalles</label>
                <textarea
                  className="w-full rounded-lg border border-blue-700 bg-blue-900/60 text-blue-100 p-2 resize-none"
                  value={detalles}
                  onChange={e => setDetalles(e.target.value)}
                  rows={3}
                  placeholder="Agrega una descripción o comentario opcional"
                />
              </div>
              <div className="flex justify-between gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold transition"
                  disabled={loading}
                >
                  Guardar registro
                </button>
                <button
                  type="button"
                  className="flex-1 bg-gray-700 hover:bg-gray-800 text-white py-2 rounded-lg font-bold transition"
                  onClick={() => setOpenRegistro(false)}
                  disabled={loading}
                >
                  Cancelar
                </button>
              </div>
            </form>
            {error && (
              <div className="bg-red-600/90 text-white p-2 rounded-md mt-3 text-center text-sm font-medium">
                {error}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default DetectarPlaca;