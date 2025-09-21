import React, { useState } from 'react';
import { X, Calendar, Clock, User } from 'lucide-react';

interface Author {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
}

interface Comunicado {
  id: string;
  titulo: string;
  contenido: string;
  portada_url: string | null;
  author: Author | null;
  created_by: string; // compat
  created_at: string;
  updated_at: string;
  published_at: string;
  scheduled_for: string | null;
  expires_at: string | null;
}

interface Props {
  comunicado: Comunicado;
  formatDate: (date: string) => string;
  onClose: () => void;
}

const ComunicadoModal: React.FC<Props> = ({ comunicado, formatDate, onClose }) => {
  const [imageError, setImageError] = useState(false);
  const isExpired = comunicado.expires_at && new Date(comunicado.expires_at) < new Date();
  const authorName = comunicado.author?.full_name || 'Autor desconocido';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white pr-8">
            {comunicado.titulo}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Contenido */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Imagen */}
          {comunicado.portada_url && !imageError && (
            <div className="relative">
              <img
                src={comunicado.portada_url}
                alt={comunicado.titulo}
                className="w-full h-64 object-cover"
                onError={() => setImageError(true)}
              />
              {isExpired && (
                <div className="absolute top-4 right-4 bg-orange-500 text-white px-3 py-1 rounded-lg font-medium">
                  Comunicado Expirado
                </div>
              )}
            </div>
          )}

          <div className="p-6 space-y-6">
            {/* Metadatos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2 text-slate-300">
                <Clock className="w-4 h-4 text-blue-400" />
                <div>
                  <p className="font-medium">Publicado</p>
                  <p className="text-slate-400">{formatDate(comunicado.published_at)}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-slate-300">
                <User className="w-4 h-4 text-green-400" />
                <div>
                  <p className="font-medium">Autor</p>
                  <p className="text-slate-400">{authorName}</p>
                </div>
              </div>

              {comunicado.expires_at && (
                <div className="flex items-center space-x-2 text-slate-300">
                  <Calendar className="w-4 h-4 text-orange-400" />
                  <div>
                    <p className="font-medium">Expira</p>
                    <p className={`text-xs ${isExpired ? 'text-orange-400' : 'text-slate-400'}`}>
                      {formatDate(comunicado.expires_at)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Contenido completo */}
            <div>
              <h3 className="text-lg font-medium text-white mb-3">Contenido</h3>
              <div className="bg-slate-900 p-4 rounded-lg">
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {comunicado.contenido}
                </p>
              </div>
            </div>

            {/* Info adicional */}
            <div className="bg-slate-700/50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-slate-300 mb-2">Información técnica</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-400">
                <div>
                  <span className="font-medium">ID:</span> {comunicado.id}
                </div>
                <div>
                  <span className="font-medium">Creado:</span> {formatDate(comunicado.created_at)}
                </div>
                <div>
                  <span className="font-medium">Actualizado:</span> {formatDate(comunicado.updated_at)}
                </div>
                {comunicado.scheduled_for && (
                  <div>
                    <span className="font-medium">Programado:</span> {formatDate(comunicado.scheduled_for)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComunicadoModal;