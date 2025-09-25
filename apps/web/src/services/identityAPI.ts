import axios from "axios";

// Lee la URL base de la IA desde la variable de entorno
const IDENTITY_API_BASE = import.meta.env.VITE_IDENTITY_API_BASE || "http://localhost:8011";

// No pongas Content-Type aquí, así Axios maneja correctamente FormData y JSON.
export const identityApi = axios.create({
  baseURL: IDENTITY_API_BASE,
});

// Si necesitas agregar headers personalizados SOLO para ciertas requests (como API KEY),
// agrégalos al llamar a la función, NO aquí.