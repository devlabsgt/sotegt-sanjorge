"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export type CampoDpi = "dpi_frontal_url" | "dpi_reverso_url";

const CAMPOS_PERMITIDOS: ReadonlySet<CampoDpi> = new Set([
  "dpi_frontal_url",
  "dpi_reverso_url",
]);

export async function actualizarCampoDpiAction(
  afiliadoId: string,
  campo: CampoDpi,
  path: string | null,
) {
  if (!afiliadoId) return { error: "ID de afiliado no proporcionado." };
  if (!CAMPOS_PERMITIDOS.has(campo)) return { error: "Campo no permitido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("afiliados")
    .update({ [campo]: path })
    .eq("id", afiliadoId);

  if (error) return { error: error.message };

  revalidatePath("/protected");
  return { success: true };
}
