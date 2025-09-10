import React from "react";
import { Header } from "../ui/Header";

const Home: React.FC = () => {
  return (
    <div className="bg-black text-white font-sans antialiased">
      <Header />

      {/* ===== HERO (Admin) ===== */}
      <section
        id="home"
        className="relative pt-28 sm:pt-32 md:pt-36 overflow-hidden scroll-mt-24"
      >
        {/* Fondo */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-black to-slate-800" />

        {/* Glows */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-52 sm:w-64 h-52 sm:h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-blue-600/5 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-fade-in-up">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-white via-blue-500 to-white bg-clip-text text-transparent">
              Panel de Administración
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-6 sm:mb-8 max-w-3xl mx-auto">
              Herramientas para gestionar residentes, finanzas, seguridad y operaciones.
              Acceso exclusivo para administradores.
            </p>

            {/* Botones */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center">
              <a
                className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white px-6 sm:px-8 py-3 rounded-xl font-semibold transition hover:scale-105 shadow-lg shadow-blue-500/25 text-base sm:text-lg text-center"
                href="/login"
              >
                Entrar al Panel
              </a>
              <a
                className="w-full sm:w-auto border border-gray-600 hover:border-blue-500 text-white px-6 sm:px-8 py-3 rounded-xl font-semibold transition hover:bg-blue-500/10 text-base sm:text-lg text-center"
                href="/docs"
              >
                Manual de uso
              </a>
            </div>

            {/* Imagen destacada debajo de los botones */}
            <div className="mt-8 sm:mt-10 flex justify-center">
              <div className="relative w-full max-w-5xl">
                <div
                  className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-r from-blue-500/30 to-indigo-500/30 blur-2xl opacity-40"
                  aria-hidden
                />
                <div className="relative rounded-3xl overflow-hidden ring-1 ring-white/10 shadow-2xl">
                  <img
                    src="/cond.jpg"
                    alt="Áreas comunes del condominio"
                    className="w-full h-48 sm:h-64 md:h-96 lg:h-[420px] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
                  <div className="absolute bottom-3 sm:bottom-4 left-4 right-4 flex items-center justify-between">
                    <div className="text-left">
                      <p className="text-blue-100 text-xs sm:text-sm">Operación de áreas comunes</p>
                      <p className="text-white font-semibold text-sm sm:text-base">Control y trazabilidad</p>
                    </div>
                    <span className="hidden sm:inline px-2 py-1 rounded-md text-xs bg-white/10 text-white backdrop-blur">
                      Imagen ilustrativa
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {/* /Imagen */}
          </div>
        </div>
      </section>

      {/* ===== FUNCIONALIDADES ===== */}
      <section
        id="features"
        className="py-12 sm:py-16 bg-gradient-to-b from-slate-900 to-slate-800 scroll-mt-24"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10 animate-fade-in-up">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Funciones principales</h2>
            <p className="text-gray-300 text-sm sm:text-base">Acciones operativas del día a día</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7">
            {/* 1. Gestión Administrativa */}
            <div className="group bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-5 sm:p-6 hover:border-blue-500/50 transition hover:scale-105">
              <div className="text-2xl sm:text-3xl mb-3">🗂️</div>
              <h3 className="text-lg sm:text-xl font-bold mb-3 group-hover:text-blue-500 transition-colors">
                Gestión Administrativa
              </h3>
              <ul className="text-gray-300 leading-relaxed space-y-2 list-disc list-inside text-sm sm:text-base">
                <li>Registro de usuarios, roles y unidades.</li>
                <li>Administración de cuotas y reportes financieros.</li>
                <li>Configuración de expensas, multas y otros precios.</li>
                <li>Publicación de avisos generales.</li>
              </ul>
            </div>

            {/* 3. Áreas Comunes */}
            <div className="group bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-5 sm:p-6 hover:border-blue-500/50 transition hover:scale-105">
              <div className="text-2xl sm:text-3xl mb-3">🏟️</div>
              <h3 className="text-lg sm:text-xl font-bold mb-3 group-hover:text-blue-500 transition-colors">
                Gestión de Áreas Comunes
              </h3>
              <ul className="text-gray-300 leading-relaxed space-y-2 list-disc list-inside text-sm sm:text-base">
                <li>Configuración de disponibilidad y horarios.</li>
                <li>Reportes de uso de instalaciones.</li>
                <li>Generación de ingresos por alquiler de espacios.</li>
              </ul>
            </div>

            {/* 4. Mantenimiento */}
            <div className="group bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-5 sm:p-6 hover:border-blue-500/50 transition hover:scale-105">
              <div className="text-2xl sm:text-3xl mb-3">🧰</div>
              <h3 className="text-lg sm:text-xl font-bold mb-3 group-hover:text-blue-500 transition-colors">
                Mantenimiento
              </h3>
              <ul className="text-gray-300 leading-relaxed space-y-2 list-disc list-inside text-sm sm:text-base">
                <li>Asignación de tareas a personal interno/externo.</li>
                <li>Seguimiento de mantenimientos preventivos.</li>
                <li>Reportes de costos asociados a reparaciones.</li>
              </ul>
            </div>

            {/* 5. Reportes y Analítica */}
            <div className="group bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-5 sm:p-6 hover:border-blue-500/50 transition hover:scale-105">
              <div className="text-2xl sm:text-3xl mb-3">📊</div>
              <h3 className="text-lg sm:text-xl font-bold mb-3 group-hover:text-blue-500 transition-colors">
                Reportes y Analítica
              </h3>
              <ul className="text-gray-300 leading-relaxed space-y-2 list-disc list-inside text-sm sm:text-base">
                <li>Indicadores financieros (morosidad, ingresos/egresos).</li>
                <li>Uso de áreas y servicios por período.</li>
                <li>Estadísticas de seguridad con IA (incidentes, accesos).</li>
                <li>Reportes visuales para decisiones.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 2. Seguridad con IA (en tarjetas) ===== */}
      <section
        id="security"
        className="py-12 sm:py-16 bg-gradient-to-b from-slate-800 to-slate-900 scroll-mt-24"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Seguridad con IA</h2>
            <p className="text-gray-300 text-sm sm:text-base">Módulos de vigilancia y control automatizados</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7">
            <div className="group bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-5 sm:p-6 hover:border-blue-500/50 transition">
              <div className="text-2xl sm:text-3xl mb-3">👤</div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 group-hover:text-blue-500 transition-colors">
                Reconocimiento facial
              </h3>
              <p className="text-gray-300 text-sm sm:text-base">Validación de residentes autorizados en accesos.</p>
            </div>

            <div className="group bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-5 sm:p-6 hover:border-blue-500/50 transition">
              <div className="text-2xl sm:text-3xl mb-3">🚫</div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 group-hover:text-blue-500 transition-colors">
                Visitantes no registrados
              </h3>
              <p className="text-gray-300 text-sm sm:text-base">Detección y registro automático de visitantes.</p>
            </div>

            <div className="group bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-5 sm:p-6 hover:border-blue-500/50 transition">
              <div className="text-2xl sm:text-3xl mb-3">🚗</div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 group-hover:text-blue-500 transition-colors">
                Lectura de placas (LPR/OCR)
              </h3>
              <p className="text-gray-300 text-sm sm:text-base">Identificación vehicular y trazabilidad de accesos.</p>
            </div>

            <div className="group bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-5 sm:p-6 hover:border-blue-500/50 transition">
              <div className="text-2xl sm:text-3xl mb-3">⚠️</div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 group-hover:text-blue-500 transition-colors">
                Alertas inteligentes
              </h3>
              <p className="text-gray-300 text-sm sm:text-base">
                Comportamientos sospechosos: perros sueltos/necesidades, vehículos mal estacionados, etc.
              </p>
            </div>

            <div className="group bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl p-5 sm:p-6 hover:border-blue-500/50 transition md:col-span-2 lg:col-span-1">
              <div className="text-2xl sm:text-3xl mb-3">📸</div>
              <h3 className="text-lg sm:text-xl font-bold mb-2 group-hover:text-blue-500 transition-colors">
                Registro con foto
              </h3>
              <p className="text-gray-300 text-sm sm:text-base">Ingreso/salida de visitantes con evidencia visual.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Footer / Soporte ===== */}
      <footer id="contact" className="bg-black border-t border-gray-800 py-10 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-400">
              © {new Date().getFullYear()} Smart Condominium — Panel de Administración
            </p>
            <div className="flex gap-4">
              <a href="/docs" className="hover:text-blue-500">Documentación</a>
              <a href="/soporte" className="hover:text-blue-500">Soporte</a>
              <a href="/estado" className="hover:text-blue-500">Estado del servicio</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
