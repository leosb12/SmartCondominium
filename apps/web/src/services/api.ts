import axios from "axios";

// Lee la URL base desde la variable de entorno
const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8001";

export const api = axios.create({
  baseURL: `${API_BASE}/api`, // todas tus rutas empiezan en /api/
  headers: {
    "Content-Type": "application/json",
  },
});
