"use server";

import { getAuthenticatedAdmin, logAudit } from "@/lib/adminService";

export async function setVerifEstado(
  profileId: string,
  estado: "approved" | "rejected",
) {
  const auth = await getAuthenticatedAdmin();
  if (!auth) return { error: "No autorizado" };

  const updateData: Record<string, unknown> = { verification_status: estado };
  if (estado === "approved") {
    updateData.verified_at = new Date().toISOString();
  }

  const { error } = await auth.serviceClient
    .from("profiles")
    .update(updateData)
    .eq("id", profileId);

  if (error) return { error: error.message };

  await logAudit(auth.serviceClient, auth.adminId, estado === "approved" ? "verif_aprobar" : "verif_rechazar", "profiles", profileId, { estado });
  return { success: true };
}
