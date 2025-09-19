import React, { useEffect, useRef, useState } from "react";
import {
  MessageSquareText,
  Send,
  Search,
  Users,
  Clock,
  CheckCheck,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import DashboardLayout from "../Layouts/DashboardLayout";
import { api } from "../services/api";

type Mensaje = {
  id: number;
  emisor_id: string;
  receptor_id: string;
  cuerpo: string;
  ts: string;
};

type Usuario = {
  id: string;
  full_name: string;
  email: string;
};

type Conversacion = {
  usuario: Usuario;           // el “otro” usuario (no yo)
  ultimo_mensaje: Mensaje | null;
  no_leidos: number;
};

const cls = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(" ");

const formatTime = (ts: string) => {
  const date = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = diff / (1000 * 60 * 60);
  if (hours < 1) return "Ahora";
  if (hours < 24) return `${Math.floor(hours)}h`;
  if (hours < 48) return "Ayer";
  return date.toLocaleDateString();
};

const Mensajes: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [conversacionActiva, setConversacionActiva] = useState<Usuario | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [mostrarUsuarios, setMostrarUsuarios] = useState(false);
  const [loading, setLoading] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [mensajes]);

  const safeGetResults = (data: any): Mensaje[] => {
    if (!data) return [];
    if (Array.isArray(data)) return data as Mensaje[];
    if (Array.isArray(data.results)) return data.results as Mensaje[];
    return [];
  };

  const init = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("access_token") || "";

      // 1) Perfil (debe traer id)
      const meRes = await api.get("/me/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const me: Usuario = {
        id: meRes.data.id,                // IMPORTANTE: backend debe enviar id
        full_name: meRes.data.full_name || meRes.data.email || "Yo",
        email: meRes.data.email || "",
      };
      if (!me.id) {
        throw new Error("El endpoint /api/me/ debe devolver id (UUID).");
      }
      setCurrentUser(me);

      // 2) Usuarios (si falla, seguimos igual con fallback)
      let usuariosList: Usuario[] = [];
      try {
        const usersRes = await api.get("/users/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        usuariosList = (usersRes.data || []).filter((u: Usuario) => u.id !== me.id);
        setUsuarios(usuariosList);
      } catch {
        // seguimos sin cortar el flujo
      }

      // 3) Cargar conversaciones usando el id ya disponible
      await cargarConversaciones(me.id, usuariosList, token);
    } catch (e: any) {
      console.error(e);
      setError("Error cargando datos iniciales");
    } finally {
      setLoading(false);
    }
  };

  const cargarConversaciones = async (meId: string, usuariosList: Usuario[], token?: string) => {
    try {
      const authToken = token || localStorage.getItem("access_token") || "";
      const res = await api.get("/mensajes/", {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const items = safeGetResults(res.data);
      // Agrupar por el “otro” usuario
      const map = new Map<string, Mensaje[]>();

      for (const msg of items) {
        // Solo consideramos mensajes donde participe el usuario actual
        if (msg.emisor_id !== meId && msg.receptor_id !== meId) continue;

        const otherId = msg.emisor_id === meId ? msg.receptor_id : msg.emisor_id;
        if (!map.has(otherId)) map.set(otherId, []);
        map.get(otherId)!.push(msg);
      }

      const list: Conversacion[] = [];
      for (const [otherId, msgs] of map.entries()) {
        const usuario =
          usuariosList.find((u) => u.id === otherId) ||
          ({
            id: otherId,
            full_name: "Usuario",
            email: "",
          } as Usuario);

        const ultimo = msgs.sort(
          (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()
        )[0];
        list.push({
          usuario,
          ultimo_mensaje: ultimo || null,
          no_leidos: 0,
        });
      }

      list.sort(
        (a, b) =>
          new Date(b.ultimo_mensaje?.ts || 0).getTime() -
          new Date(a.ultimo_mensaje?.ts || 0).getTime()
      );

      setConversaciones(list);
    } catch (err) {
      console.error("Error cargando conversaciones:", err);
      // No bloquea la UI; puedes mostrar aviso si quieres
    }
  };

  const seleccionarConversacion = async (usuario: Usuario) => {
    setConversacionActiva(usuario);
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token") || "";
      const res = await api.get(`/mensajes/?with=${usuario.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const items = safeGetResults(res.data);
      // Mostrar cronológicamente (del más antiguo al más nuevo)
      setMensajes(items.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime()));
    } catch (err) {
      console.error(err);
      setError("Error cargando mensajes");
    } finally {
      setLoading(false);
    }
  };

  const enviarMensaje = async () => {
    if (!nuevoMensaje.trim() || !conversacionActiva || enviando) return;
    setEnviando(true);
    try {
      const token = localStorage.getItem("access_token") || "";
      const res = await api.post(
        "/mensajes/",
        { receptor_id: conversacionActiva.id, cuerpo: nuevoMensaje.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Añadir al hilo actual
      setMensajes((prev) => [...prev, res.data]);
      setNuevoMensaje("");
      // Refrescar conversaciones (último mensaje, orden)
      if (currentUser) {
        await cargarConversaciones(currentUser.id, usuarios);
      }
    } catch (err) {
      console.error(err);
      setError("Error enviando mensaje");
    } finally {
      setEnviando(false);
    }
  };

  const iniciarNuevaConversacion = (usuario: Usuario) => {
    setConversacionActiva(usuario);
    setMensajes([]);
    setMostrarUsuarios(false);
  };

  const usuariosFiltrados = usuarios.filter(
    (u) =>
      u.full_name.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.email.toLowerCase().includes(busqueda.toLowerCase())
  );

  const conversacionesFiltradas = conversaciones.filter(
    (c) =>
      c.usuario.full_name.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.usuario.email.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <DashboardLayout
      title="Mensajes"
      subtitle="Sistema de mensajería del condominio"
      icon={<MessageSquareText className="h-5 w-5 text-blue-400" />}
    >
      {error && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-800/50 rounded-xl flex items-center gap-2 text-red-200">
          <AlertCircle className="h-5 w-5" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            ×
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-12rem)]">
        {/* Lista de conversaciones */}
        <div
          className={cls(
            "lg:col-span-4 rounded-2xl border border-slate-800/60 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col",
            isMobile && conversacionActiva && "hidden"
          )}
        >
          <div className="p-4 border-b border-slate-800/50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-100">Conversaciones</h3>
              <button
                onClick={() => setMostrarUsuarios(!mostrarUsuarios)}
                className="p-2 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors"
                title="Iniciar nueva conversación"
              >
                <Users className="h-4 w-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar conversaciones..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-950/60 border border-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/40"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {mostrarUsuarios ? (
              <>
                <div className="mb-3 px-3 text-sm text-slate-400">Iniciar nueva conversación</div>
                {usuariosFiltrados.map((usuario) => (
                  <button
                    key={usuario.id}
                    onClick={() => iniciarNuevaConversacion(usuario)}
                    className="w-full p-3 rounded-lg hover:bg-slate-800/50 transition-colors text-left mb-1"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-white">
                          {usuario.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-200 font-medium truncate">{usuario.full_name}</p>
                        <p className="text-slate-400 text-sm truncate">{usuario.email}</p>
                      </div>
                    </div>
                  </button>
                ))}
                {usuariosFiltrados.length === 0 && (
                  <div className="text-center p-6 text-slate-400">No hay usuarios disponibles</div>
                )}
              </>
            ) : conversacionesFiltradas.length === 0 ? (
              <div className="text-center p-8 text-slate-400">
                <MessageSquareText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay conversaciones</p>
                <p className="text-sm">Inicia una nueva conversación</p>
              </div>
            ) : (
              conversacionesFiltradas.map((conv) => (
                <button
                  key={conv.usuario.id}
                  onClick={() => seleccionarConversacion(conv.usuario)}
                  className={cls(
                    "w-full p-3 rounded-lg transition-colors text-left mb-1",
                    conversacionActiva?.id === conv.usuario.id
                      ? "bg-blue-600/20 border border-blue-600/40"
                      : "hover:bg-slate-800/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-white">
                          {conv.usuario.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {conv.no_leidos > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-xs text-white">{conv.no_leidos}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-slate-200 font-medium truncate">{conv.usuario.full_name}</p>
                        {conv.ultimo_mensaje && (
                          <span className="text-xs text-slate-400">{formatTime(conv.ultimo_mensaje.ts)}</span>
                        )}
                      </div>
                      {conv.ultimo_mensaje && (
                        <p className="text-slate-400 text-sm truncate">
                          {conv.ultimo_mensaje.emisor_id === currentUser?.id ? "Tú: " : ""}
                          {conv.ultimo_mensaje.cuerpo}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat */}
        <div
          className={cls(
            "lg:col-span-8 rounded-2xl border border-slate-800/60 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col",
            isMobile && !conversacionActiva && "hidden"
          )}
        >
          {conversacionActiva ? (
            <>
              <div className="p-4 border-b border-slate-800/50 flex items-center gap-3">
                {isMobile && (
                  <button
                    onClick={() => setConversacionActiva(null)}
                    className="p-2 rounded-lg hover:bg-slate-800/50 text-slate-400"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-semibold text-white">
                    {conversacionActiva.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-slate-100 font-semibold">{conversacionActiva.full_name}</h3>
                  <p className="text-slate-400 text-sm">{conversacionActiva.email}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading && mensajes.length === 0 ? (
                  <div className="flex justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-blue-400" />
                  </div>
                ) : mensajes.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">
                    <MessageSquareText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No hay mensajes en esta conversación</p>
                    <p className="text-sm">Envía el primer mensaje</p>
                  </div>
                ) : (
                  mensajes.map((mensaje) => (
                    <div
                      key={mensaje.id}
                      className={cls(
                        "flex",
                        mensaje.emisor_id === currentUser?.id ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cls(
                          "max-w-xs sm:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl",
                          mensaje.emisor_id === currentUser?.id
                            ? "bg-blue-600 text-white rounded-br-md"
                            : "bg-slate-800 text-slate-100 rounded-bl-md"
                        )}
                      >
                        <p className="text-sm">{mensaje.cuerpo}</p>
                        <div
                          className={cls(
                            "flex items-center gap-1 mt-1 text-xs",
                            mensaje.emisor_id === currentUser?.id ? "text-blue-100" : "text-slate-400"
                          )}
                        >
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(mensaje.ts)}</span>
                          {mensaje.emisor_id === currentUser?.id && <CheckCheck className="h-3 w-3 ml-1" />}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-slate-800/50">
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Escribe un mensaje..."
                    value={nuevoMensaje}
                    onChange={(e) => setNuevoMensaje(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && enviarMensaje()}
                    className="flex-1 px-4 py-2 rounded-xl bg-slate-950/60 border border-slate-700 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/40"
                    disabled={enviando}
                  />
                  <button
                    onClick={enviarMensaje}
                    disabled={!nuevoMensaje.trim() || enviando}
                    className={cls(
                      "px-4 py-2 rounded-xl font-medium transition-colors",
                      !nuevoMensaje.trim() || enviando
                        ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    )}
                    title="Enviar"
                  >
                    {enviando ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <MessageSquareText className="h-16 w-16 mx-auto mb-4 text-slate-600" />
                <h3 className="text-slate-300 text-lg font-semibold mb-2">Selecciona una conversación</h3>
                <p className="text-slate-400">Elige un contacto para comenzar a chatear</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Mensajes;