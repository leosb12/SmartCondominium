import axios from "axios";

// Cambia el BASE_URL para que apunte a tu backend Django, por ejemplo:
const BACKEND_API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8001/api";

export const identityApi = axios.create({
  baseURL: BACKEND_API_BASE,
});

// Si necesitas headers personalizados para endpoints protegidos, usa esta función (puedes quitar el API_KEY si tu backend ya no lo requiere)
export const getIdentityHeaders = () => ({});