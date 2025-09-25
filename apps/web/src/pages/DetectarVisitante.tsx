import React, { useRef, useEffect, useState } from "react";
import DashboardLayout from "../Layouts/DashboardLayout";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import { roleService, type Role } from "../services/roleService";

// Solo admin (id 1) y personal de seguridad (id 4)
const ALLOWED_ROLE_IDS = new Set<number>([1, 4]);

const API_URL = "http://localhost:8011/visitors/match";
const API_KEY = "clave-interna-identity"; // Cambia si tu API key es diferente

function hasAllowedRole(roles: Role[]): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some((r) => ALLOWED_ROLE_IDS.has(r.id));
}

type VisitorData = {
  id: string;
  full_name: string;
  doc_type: string;
  doc_number: string;
  phone?: string | null;
  status: string;
  created_at: string;
  images?: string[]; // Modificado: ahora contiene imágenes públicas de Supabase
};

const DetectarVisitante: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [visitor, setVisitor] = useState<VisitorData | null>(null);

  // --- NUEVO: Control de permiso explícito tras F5/reload ---
  const [cameraPrompt, setCameraPrompt] = useState(false);

  // Escucha F5/reload y fuerza preguntar
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      setCameraPrompt(true);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  // Permisos (solo admin y seguridad)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const myRoles = await roleService.getMyRoles();
        if (!active) return;
        setForbidden(!hasAllowedRole(myRoles));
      } catch {
        if (!active) return;
        setForbidden(true);
      } finally {
        if (active) setAuthChecked(true);
      }
    })();
    return () => { active = false; };
  }, []);

  const startCamera = async () => {
    setError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
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

  // Si forbidden cambia, para la cámara
  useEffect(() => {
    if (forbidden) {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    }
    // eslint-disable-next-line
  }, [forbidden]);

  useEffect(() => {
    if (videoRef.current && stream && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (!cameraPrompt && !stream && !forbidden && authChecked) {
      setCameraPrompt(true); // Solo muestra prompt una vez
    }
    // eslint-disable-next-line
  }, [authChecked, forbidden, stream]);

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
        const res = await fetch(API_URL, {
          method: "POST",
          headers: {
            "X-IDENTITY-KEY": API_KEY,
          },
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.detail || "Error al detectar visitante");
        } else if (data.match && data.visitor_id) {
          // Obtener detalles del visitante por su ID
          const visitorRes = await fetch(
            `http://localhost:8011/visitors/${data.visitor_id}`,
            {
              headers: {
                "X-IDENTITY-KEY": API_KEY,
              },
            }
          );
          if (visitorRes.ok) {
            const visitorData = await visitorRes.json();
            setVisitor(visitorData);
            setResult(null);
          } else {
            setError("Visitante detectado, pero no se pudo obtener sus datos.");
          }
        } else {
          setVisitor(null);
          setResult("No se encontró coincidencia.");
        }
      } catch (err) {
        setError("Error de red o del servidor");
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
        {!authChecked ? (
          <div className="bg-blue-800/40 text-blue-100 p-4 rounded-lg text-center mb-6">
            Verificando permisos...
          </div>
        ) : forbidden ? (
          <div className="bg-red-700/80 text-white p-5 rounded-xl text-center mb-6 font-bold shadow">
            403 · Acceso denegado
            <p className="text-slate-200 mt-2 font-normal text-base">
              Solo administradores y personal de seguridad pueden acceder a esta página.
            </p>
          </div>
        ) : (
          <>
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

            {/* Mostrar fotos del visitante si existen */}
            {visitor && (
              <div className="bg-green-700/80 text-white p-4 rounded-xl mt-6 shadow text-center">
                <div className="text-lg font-bold mb-2">Visitante verificado</div>
                <div className="mb-3 flex flex-wrap gap-2 justify-center">
                  {visitor.images?.map((imgUrl, idx) => (
                    <img
                      key={idx}
                      src={imgUrl}
                      alt={`Foto visitante ${idx + 1}`}
                      className="rounded-lg border border-blue-900 max-h-32"
                      loading="lazy"
                    />
                  ))}
                </div>
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
                  {new Date(visitor.created_at).toLocaleString()}
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
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DetectarVisitante;