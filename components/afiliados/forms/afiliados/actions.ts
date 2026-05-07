"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function guardarAfiliadoAction(formData: any, idEditar?: string) {
  const supabase = await createClient();

  if (formData.dpi) {
    let query = supabase
      .from("afiliados")
      .select("id, nombres, apellidos, lider_id")
      .eq("dpi", formData.dpi);
    if (idEditar) query = query.neq("id", idEditar);

    const { data } = await query;
    if (data && data.length > 0) {
      const existente = data[0];
      let liderNombre = "otro líder";
      if (existente.lider_id) {
        const { data: perfil } = await supabase
          .from("info_perfil")
          .select("nombres, apellidos")
          .eq("user_id", existente.lider_id)
          .maybeSingle();
        if (perfil) liderNombre = `${perfil.nombres} ${perfil.apellidos}`;
      }
      return {
        error: "Este DPI ya está registrado.",
        field: "dpi",
        dpiDuplicado: {
          afiliadoNombre: `${existente.nombres} ${existente.apellidos}`,
          liderNombre,
        },
      };
    }
  }

  if (formData.no_padron) {
    let query = supabase
      .from("afiliados")
      .select("id")
      .eq("no_padron", formData.no_padron);
    if (idEditar) query = query.neq("id", idEditar);

    const { data } = await query;
    if (data && data.length > 0) {
      return {
        error: "Este No. de Padrón ya está registrado.",
        field: "no_padron",
      };
    }
  }


  const tienePadron = formData.no_padron && formData.no_padron.trim() !== "";

  const dataToSend = {
    ...formData,
    empadronado: tienePadron ? true : formData.empadronado,
    no_padron: tienePadron ? formData.no_padron : null,
    politica_id: formData.politica_id || null,
    sub_politica_id: formData.sub_politica_id || null,
  };

  let result;
  if (idEditar) {
    result = await supabase
      .from("afiliados")
      .update(dataToSend)
      .eq("id", idEditar);
  } else {
    result = await supabase.from("afiliados").insert(dataToSend);
  }

  if (result.error) return { error: result.error.message };

  revalidatePath("/dashboard/afiliados");
  return { success: true };
}

export async function buscarDpiEnPadronAction(dpi: string) {
  if (!dpi || dpi.length !== 13) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("padron_tse")
    .select("*")
    .eq("dpi", dpi)
    .single();

  if (!data) return null;

  let nombres = "";
  let apellidos = "";
  
  if (data.nombre_completo.includes(",")) {
    const partes = data.nombre_completo.split(",");
    apellidos = partes[0].trim();
    nombres = partes.length > 1 ? partes[1].trim() : "";
  } else {
    nombres = data.nombre_completo;
  }

  return {
    nombres,
    apellidos,
    genero: data.genero?.toUpperCase().includes("FEMENINO") ? "F" : "M",
    encontrado: true
  };
}

export async function buscarDpiEnAfiliadosAction(dpi: string) {
  if (!dpi || dpi.length !== 13) return null;
  const supabase = await createClient();

  const { data } = await supabase
    .from("afiliados")
    .select("id, nombres, apellidos, lider_id")
    .eq("dpi", dpi)
    .maybeSingle();

  if (!data) return null;

  // Buscar el nombre del líder
  let liderNombre = "otro líder";
  if (data.lider_id) {
    const { data: perfil } = await supabase
      .from("info_perfil")
      .select("nombres, apellidos")
      .eq("user_id", data.lider_id)
      .maybeSingle();
    if (perfil) liderNombre = `${perfil.nombres} ${perfil.apellidos}`;
  }

  return {
    afiliadoNombre: `${data.nombres} ${data.apellidos}`,
    liderNombre,
    lider_id: data.lider_id,
    yaRegistrado: true,
  };
}
