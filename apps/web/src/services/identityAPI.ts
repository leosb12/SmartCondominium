import axios from "axios";

const IDENTITY_API_BASE = import.meta.env.VITE_IDENTITY_API_BASE || "http://localhost:8011";
const API_KEY = import.meta.env.VITE_IDENTITY_API_KEY || "clave-interna-identity";

export const identityApi = axios.create({
  baseURL: IDENTITY_API_BASE,
});

// Helper para usar siempre el header correcto
export const getIdentityHeaders = () => ({
  "X-IDENTITY-KEY": API_KEY,
});