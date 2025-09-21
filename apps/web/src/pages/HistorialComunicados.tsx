import React, { useState, useEffect } from 'react';
import { Search, Calendar, AlertCircle } from 'lucide-react';
import DashboardLayout from '../Layouts/DashboardLayout';
import ComunicadoCard from '../components/ComunicadoCard';
import Pagination from '../components/Pagination';

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
  created_by: string; // compat (no se usa en UI)
  created_at: string;
  updated_at: string;
  published_at: string;
  scheduled_for: string | null;
  expires_at: string | null;
}

interface ApiResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Comunicado[];
}

const HistorialComunicados: React.FC = () => {
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  // Filtros
  const [publishedFrom, setPublishedFrom] = useState('');
  const [publishedTo, setPublishedTo] = useState('');
  const [authorName, setAuthorName] = useState('');

  const fetchComunicados = async (page: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: '8'
      });

      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (publishedFrom) params.append('published_from', publishedFrom);
      if (publishedTo) params.append('published_to', publishedTo);
      if (authorName.trim()) params.append('author_name', authorName.trim());

      const response = await fetch(`http://localhost:8001/api/historial-comunicados/?${params}`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data: ApiResponse = await response.json();
      setComunicados(data.results);
      setHasNext(!!data.next);
      setHasPrevious(!!data.previous);
      setTotalPages(Math.ceil(data.count / 8));
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setComunicados([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComunicados(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, publishedFrom, publishedTo, authorName]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchComunicados(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setPublishedFrom('');
    setPublishedTo('');
    setAuthorName('');
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateContent = (content: string, maxLength: number = 150) => {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  };

  return (
    <DashboardLayout
      title="Historial de Comunicados"
      subtitle="Visualiza todos los comunicados publicados anteriormente"
      icon={<Calendar className="w-6 h-6" />}
    >
      <div className="space-y-6">
        {/* Filtros y búsqueda */}
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Búsqueda principal */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar comunicados por título o contenido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Desde
                </label>
                <input
                  type="datetime-local"
                  value={publishedFrom}
                  onChange={(e) => setPublishedFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Hasta
                </label>
                <input
                  type="datetime-local"
                  value={publishedTo}
                  onChange={(e) => setPublishedTo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-1 lg:col-span-1">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Autor (nombre o apellido)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Leonardo, Serrate..."
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="w-full px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                >
                  Limpiar Filtros
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Estado de carga */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-300">Error: {error}</span>
          </div>
        )}

        {/* Lista */}
        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {comunicados.map((comunicado) => (
                <ComunicadoCard
                  key={comunicado.id}
                  comunicado={comunicado}
                  formatDate={formatDate}
                  truncateContent={truncateContent}
                />
              ))}
            </div>

            {/* Sin resultados */}
            {comunicados.length === 0 && (
              <div className="text-center py-8">
                <Calendar className="mx-auto w-12 h-12 text-slate-400 mb-4" />
                <p className="text-slate-400 text-lg">No se encontraron comunicados</p>
                <p className="text-slate-500">Intenta ajustar los filtros de búsqueda</p>
              </div>
            )}

            {/* Paginación */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                hasNext={hasNext}
                hasPrevious={hasPrevious}
                onPageChange={fetchComunicados}
              />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default HistorialComunicados;