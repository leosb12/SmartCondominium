import React, { useState } from 'react';
import { Calendar, Clock, User, Eye } from 'lucide-react';
import ComunicadoModal from './ComunicadoModal';

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
  created_by: string; // compat, no se usa en UI
  created_at: string;
  updated_at: string;
  published_at: string;
  scheduled_for: string | null;
  expires_at: string | null;
}

interface Props {
  comunicado: Comunicado;
  formatDate: (date: string) => string;
  truncateContent: (content: string, maxLength?: number) => string;
}

const ComunicadoCard: React.FC<Props> = ({ comunicado, formatDate, truncateContent }) => {
  const [showModal, setShowModal] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isExpired = comunicado.expires_at && new Date(comunicado.expires_at) < new Date();
  const authorName = comunicado.author?.full_name || 'Autor desconocido';

  return (
    <>
      <div className={`bg-slate-800 border rounded-lg overflow-hidden hover:transform hover:scale-105 transition-all duration-200 ${
        isExpired ? 'border-orange-500/50 opacity-75' : 'border-slate-700 hover:border-blue-500/50'
      }`}>
        {/* Portada */}
        {comunicado.portada_url && !imageError ? (
          <div className="relative h-48 overflow-hidden">
            <img
              src={comunicado.portada_url}
              alt={comunicado.titulo}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
            {isExpired && (
              <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 rounded text-xs font-medium">
                Expirado
              </div>
            )}
          </div>
        ) : (
          <div className="h-48 bg-slate-700 flex items-center justify-center">
            <Calendar className="w-12 h-12 text-slate-400" />
          </div>
        )}

        {/* Contenido */}
        <div className="p-4 space-y-3">
          <h3 className="font-semibold text-white text-lg leading-tight">
            {comunicado.titulo}
          </h3>

          <p className="text-slate-300 text-sm leading-relaxed">
            {truncateContent(comunicado.contenido, 100)}
          </p>

          <div className="space-y-2 text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>Publicado: {formatDate(comunicado.published_at)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>Por: {authorName}</span>
            </div>
            {comunicado.expires_at && (
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span className={isExpired ? 'text-orange-400' : 'text-slate-400'}>
                  {isExpired ? 'Expiró' : 'Expira'}: {formatDate(comunicado.expires_at)}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="w-full mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <Eye className="w-4 h-4" />
            <span>Ver completo</span>
          </button>
        </div>
      </div>

      {showModal && (
        <ComunicadoModal
          comunicado={comunicado}
          formatDate={formatDate}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};

export default ComunicadoCard;