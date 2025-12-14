import axios from "axios";

// BASE_URL del microservicio de IA (NO el backend de Django)
const IDENTITY_API_BASE = import.meta.env.VITE_IDENTITY_API_BASE || "https://daryl-draftable-overdogmatically.ngrok-free.dev";

export const identityApi = axios.create({
  baseURL: IDENTITY_API_BASE,
});

// No necesitas headers personalizados para endpoints públicos del microservicio IA
export const getIdentityHeaders = () => ({});