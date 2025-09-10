import { useEffect } from "react";

export function Header() {
  useEffect(() => {
    // Smooth scroll con delegación
    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const a = target.closest("a") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href");
      if (href && href.startsWith("#")) {
        e.preventDefault();
        const el = document.querySelector(href);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    // Fondo del nav al hacer scroll
    const handleScroll = () => {
      const nav = document.querySelector("nav");
      if (!nav) return;
      if (window.scrollY > 100) nav.classList.add("bg-black/95");
      else nav.classList.remove("bg-black/95");
    };

    document.addEventListener("click", handleClick);
    window.addEventListener("scroll", handleScroll);
    return () => {
      document.removeEventListener("click", handleClick);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <nav className="fixed top-0 w-full h-16 bg-black/90 backdrop-blur-md border-b border-gray-800 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full">
          <div className="text-xl font-bold text-blue-500">
            Smart Condominium
          </div>

          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <a href="#home" className="hover:text-blue-500 transition-colors">Inicio</a>
              <a href="#features" className="hover:text-blue-500 transition-colors">Funciones</a>
              <a href="#security" className="hover:text-blue-500 transition-colors">Seguridad IA</a>

            </div>
          </div>

          <div className="flex space-x-3">
            <button
              className="border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white px-4 py-2 rounded-lg transition cursor-pointer"
            >
              Iniciar sesión
            </button>
            {/* Botón "Demo" eliminado */}
          </div>
        </div>
      </div>
    </nav>
  );
}
