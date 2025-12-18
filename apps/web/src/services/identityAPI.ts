import axios from "axios";

// BASE_URL apuntando AL GATEWAY (ruta identity)
const IDENTITY_API_BASE =
  import.meta.env.VITE_IDENTITY_API_BASE ||
  "https://roomy-untempestuous-nolan.ngrok-free.dev/identity";

export const identityApi = axios.create({
  baseURL: IDENTITY_API_BASE,
});

// No necesitas headers especiales
export const getIdentityHeaders = () => ({});
