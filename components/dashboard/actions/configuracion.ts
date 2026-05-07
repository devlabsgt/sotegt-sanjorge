"use server";

import { createClient } from "@/utils/supabase/server";

export async function obtenerConfiguracionAction() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sis_configuracion")
    .select("*")
    .single();
  if (error) {
    console.error("Error al obtener configuración:", error.message);
    return null;
  }
  return data;
}

export async function actualizarConfiguracionAction(
  nombre_candidato: string,
  lugar: string,
  frase: string,
  objetivo_total: number,
  meta_por_lider: number,
  padron: boolean = false
) {
  const supabase = await createClient();

  const { data: current } = await supabase
    .from("sis_configuracion")
    .select("id")
    .limit(1)
    .maybeSingle();

  const payload = {
    nombre_candidato,
    lugar,
    frase,
    objetivo_total,
    meta_por_lider,
    padron,
    updated_at: new Date().toISOString()
  };

  if (current?.id) {
    const { data, error } = await supabase
      .from("sis_configuracion")
      .update(payload)
      .eq("id", current.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  } else {
    const { data, error } = await supabase
      .from("sis_configuracion")
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
}
