// src/services/visitorsService.ts
import { supabase } from "./supabaseClient";

export type VisitorOption = {
  id: string;
  full_name: string;
  doc_type?: string | null;
  doc_number?: string | null;
};

export async function searchVisitors(query: string, limit = 10): Promise<VisitorOption[]> {
  const q = (query ?? "").trim();

  let req = supabase
    .from("visitors")
    .select("id, full_name, doc_type, doc_number")
    .limit(limit);

  if (q) {
    // Busca por nombre o número de documento
    req = req.or(`full_name.ilike.%${q}%,doc_number.ilike.%${q}%`);
  }

  const { data, error } = await req;
  if (error) {
    console.error("searchVisitors error", error);
    throw new Error(error.message);
  }

  return (data ?? []).map((v: any) => ({
    id: v.id,
    full_name: v.full_name || v.id,
    doc_type: v.doc_type ?? null,
    doc_number: v.doc_number ?? null,
  }));
}
