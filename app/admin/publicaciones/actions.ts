"use server";

import { getAuthenticatedAdmin, logAudit } from "@/lib/adminService";

export async function toggleDisponible(
  pubId: string,
  disponible: boolean,
) {
  const auth = await getAuthenticatedAdmin();
  if (!auth) return { error: "No autorizado" };

  const { error } = await auth.serviceClient
    .from("publicaciones")
    .update({ disponible })
    .eq("id", pubId);

  if (error) return { error: error.message };

  await logAudit(auth.serviceClient, auth.adminId, disponible ? "pub_activar" : "pub_suspender", "publicaciones", pubId, { disponible });
  return { success: true };
}

export async function deletePub(pubId: string) {
  const auth = await getAuthenticatedAdmin();
  if (!auth) return { error: "No autorizado" };

  const { error } = await auth.serviceClient
    .from("publicaciones")
    .delete()
    .eq("id", pubId);

  if (error) return { error: error.message };

  await logAudit(auth.serviceClient, auth.adminId, "pub_eliminar", "publicaciones", pubId);
  return { success: true };
}
