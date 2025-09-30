import axios from "axios";

// En Vite, las variables de entorno deben empezar con VITE_ y se acceden vía import.meta.env
const PLATE_API_BASE_URL =
  import.meta.env.VITE_PLATE_API_URL || "https://occupation-consult-tourist-significantly.trycloudflare.com";

export const plateApi = axios.create({
  baseURL: PLATE_API_BASE_URL,
  timeout: 20000, // 20 segundos, puedes ajustar si necesitas más o menos
});

// Ejemplo de uso (POST imagen):
// const formData = new FormData();
// formData.append("file", file);
// const res = await plateApi.post("/plates/match", formData);