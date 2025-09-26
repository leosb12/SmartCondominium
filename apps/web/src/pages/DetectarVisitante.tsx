import React, { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../Layouts/DashboardLayout";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { identityApi } from "../services/identityAPI";
import { supabase } from "../services/supabaseClient";
import { useRoles } from "../hooks/useRoles";

const ALLOWED_ROLE_IDS = new Set<number>([1, 4]);

type VisitorData = {
  id: string;
  full_name: string;
  doc_type: string;
  doc_number: string;
  phone?: string | null;
  status: string;
  created_at: string;
  images?: string[];
};

const DetectarVisitante: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visitor, setVisitor] = useState<VisitorData | null>(null);
  const [cameraPrompt, setCameraPrompt] = useState(false);

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
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      setCameraPrompt(true);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
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
    if (!cameraPrompt && !stream) {
      setCameraPrompt(true);
    }
  }, [stream, cameraPrompt]);

  const handleCapture = async () => {
    setResult(null);
    setError(null);
    setVisitor(null);

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

      const formData = new FormData();
      formData.append("face_image", blob, "captura.jpg");

      try {
        // POST directo al microservicio IA con la API KEY
        const res = await identityApi.post("/visitors/match", formData, {
          headers: {
            "X-IDENTITY-KEY": "clave-interna-identity",
          },
        });

        const data = res.data;

        if (data.match && data.visitor_id) {
          // Buscar al visitante en Supabase por su ID
          const { data: visitorData, error: supabaseError } = await supabase
            .from("visitors")
            .select("*")
            .eq("id", data.visitor_id)
            .single();
          const [firstName, ...rest] = visitorData.full_name.split(" ");
          const lastName = rest.join(" ");
          if (visitorData) {
            setVisitor(visitorData);
            setResult(null);
            await supabase.from("bitacora").insert([
              {
                event_type: "INGRESO_VISITANTE_VERIFICADO",
                table_name: "visitors",
                row_id: visitorData.id,
                user_id: null,
                first_name: firstName,
                last_name: lastName,
                title: "Ingreso de visitante verificado",
                details: {
                  doc_type: visitorData.doc_type,
                  doc_number: visitorData.doc_number,
                  status: visitorData.status,
                  fecha: new Date().toISOString(),
                },
              }
            ]);
          } else if (supabaseError) {
            setError(`No se pudo obtener los datos: ${supabaseError.message}`);
          } else {
            setError("Visitante detectado, pero no se pudo obtener sus datos.");
          }
        } else {
          setVisitor(null);
          setResult("No se encontró coincidencia.");

          // -- ANOMALIA: Insertar registro en anomalia si visitante no se reconoce --
          try {
            let foto_url = null;
            // Subir la imagen al bucket "anomalias" en Supabase Storage
            const fileName = `personas/${Date.now()}_persona_desconocida.jpg`;
            const { data: storageRes, error: storageErr } = await supabase.storage
              .from("anomalias")
              .upload(fileName, blob, { cacheControl: "3600", upsert: false });
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
                tipo_anomalia: "persona",
                descripcion: "Intento de ingreso de persona desconocida",
                detalle: {
                  foto_url,
                  fecha: new Date().toISOString(),
                  observacion: "Intento de acceso sin coincidencia facial"
                },
                fecha: new Date().toISOString(),
                ubicacion: null,
                procesado: false
              }
            ]);
          } catch (anomaliaError) {
            // (No mostramos error al usuario, solo para log interno)
            // console.error("Error registrando anomalia visitante:", anomaliaError);
          }
        }
      } catch (err: any) {
        if (err.response && err.response.data) {
          if (Array.isArray(err.response.data)) {
            setError(err.response.data.map((e: any) => e.msg).join(" | "));
          } else if (err.response.data.detail) {
            setError(
              typeof err.response.data.detail === "string"
                ? err.response.data.detail
                : Array.isArray(err.response.data.detail)
                ? err.response.data.detail.map((e: any) => e.msg).join(" | ")
                : JSON.stringify(err.response.data.detail)
            );
          } else {
            setError(JSON.stringify(err.response.data));
          }
        } else {
          setError("Error de red o del servidor");
        }
        setResult(null);
      } finally {
        setLoading(false);
      }
    }, "image/jpeg");
  };

  return (
    <DashboardLayout
      title="Detectar visitante"
      subtitle="Reconoce visitantes usando la cámara"
      icon={<ShieldCheckIcon className="w-8 h-8 text-blue-400" />}
    >
      <div className="w-full max-w-lg mx-auto bg-gray-900 rounded-2xl shadow-2xl p-8 border border-blue-800/40">
        <h2 className="text-2xl font-bold text-blue-300 mb-6 text-center">
          Detección facial en vivo
        </h2>
        <div className="flex flex-col items-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full max-w-sm rounded-lg border border-blue-900 bg-slate-800 shadow mb-4 aspect-video"
            style={{ background: "#263146" }}
          />
          {/* canvas hidden, solo para capturar */}
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
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-semibold py-3 rounded-lg transition transform hover:scale-[1.02] active:scale-[0.98] shadow-md mt-2"
        >
          {loading ? "Detectando..." : "Capturar y Detectar"}
        </button>

        {visitor && (
          <div className="bg-green-700/80 text-white p-4 rounded-xl mt-6 shadow text-center">
            <div className="text-lg font-bold mb-2">Visitante verificado</div>
            {visitor.images && visitor.images.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2 justify-center">
                {visitor.images.map((imgUrl, idx) => (
                  <img
                    key={idx}
                    src={imgUrl}
                    alt={`Foto visitante ${idx + 1}`}
                    className="rounded-lg border border-blue-900 max-h-32"
                    loading="lazy"
                  />
                ))}
              </div>
            )}
            <div className="mb-1">
              <span className="font-semibold text-blue-200">Nombre completo: </span>
              {visitor.full_name}
            </div>
            <div className="mb-1">
              <span className="font-semibold text-blue-200">Tipo de documento: </span>
              {visitor.doc_type}
            </div>
            <div className="mb-1">
              <span className="font-semibold text-blue-200">Número de documento: </span>
              {visitor.doc_number}
            </div>
            <div className="mb-1">
              <span className="font-semibold text-blue-200">Teléfono: </span>
              {visitor.phone ?? "—"}
            </div>
            <div className="mb-1">
              <span className="font-semibold text-blue-200">Estado: </span>
              {visitor.status}
            </div>
            <div className="mb-1">
              <span className="font-semibold text-blue-200">Fecha/Hora de registro: </span>
              {visitor.created_at
                ? (() => {
                    const dt = new Date(visitor.created_at);
                    if (isNaN(dt.getTime())) {
                      return "—";
                    }
                    return dt.toLocaleString();
                  })()
                : "—"}
            </div>
          </div>
        )}
        {result && (
          <div className="bg-yellow-600/80 text-white p-3 rounded-md mt-5 text-center text-sm font-medium whitespace-pre-line">
            {result}
          </div>
        )}
        {error && (
          <div className="bg-red-600/90 text-white p-3 rounded-md mt-5 text-center text-sm font-medium">
            {error}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DetectarVisitante;