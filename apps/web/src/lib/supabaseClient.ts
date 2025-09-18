// src/lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

// ⚠️ Lo ideal es que uses variables de entorno en tu proyecto frontend (.env)
// nunca dejes la KEY hardcodeada en el repo público.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY!;

// Inicializa cliente
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
