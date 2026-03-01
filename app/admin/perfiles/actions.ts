// app/admin/perfiles/actions.ts
"use server";

import { getAuthenticatedAdmin, logAudit } from "@/lib/adminService";

export async function setPlan(
  profileId: string,
  plan: "free" | "plus" | "platino" | "diamante",
) {
  console.log("[ADMIN ACTION] setPlan HIT", { profileId, plan });

  const auth = await getAuthenticatedAdmin();
  if (!auth) {
    console.log("[ADMIN ACTION] setPlan NO AUTH");
    return { error: "No autorizado" };
  }

  const updateData: Record<string, unknown> = {
    plan_actual: plan,
    plan_estado: "activo",
    updated_at: new Date().toISOString(),
  };

  if (plan !== "free") {
    const now = new Date();
    const planFin = new Date();
    planFin.setDate(planFin.getDate() + 30);
    updateData.plan_inicio = now.toISOString();
    updateData.plan_fin = planFin.toISOString();
  }

  const { data, error } = await auth.serviceClient
    .from("profiles")
    .update(updateData)
    .eq("id", profileId)
    .select("id, plan_actual");

  if (error) return { error: error.message };
  if (!data || data.length === 0)
    return { error: "Update no afectó ninguna fila (0 rows)" };

  await logAudit(
    auth.serviceClient,
    auth.adminId,
    "perfil_set_plan",
    "profiles",
    profileId,
    {
      plan,
    },
  );

  return { success: true };
}

export async function toggleSuspend(profileId: string, suspend: boolean) {
  console.log("[ADMIN ACTION] toggleSuspend HIT", { profileId, suspend });

  const auth = await getAuthenticatedAdmin();
  if (!auth) return { error: "No autorizado" };

  const { data, error } = await auth.serviceClient
    .from("profiles")
    .update({ is_suspended: suspend, updated_at: new Date().toISOString() })
    .eq("id", profileId)
    .select("id, is_suspended");

  if (error) return { error: error.message };
  if (!data || data.length === 0)
    return { error: "Update no afectó ninguna fila (0 rows)" };

  await logAudit(
    auth.serviceClient,
    auth.adminId,
    suspend ? "perfil_suspender" : "perfil_reactivar",
    "profiles",
    profileId,
  );

  return { success: true };
}

export async function toggleAdmin(profileId: string, makeAdmin: boolean) {
  console.log("[ADMIN ACTION] toggleAdmin HIT", { profileId, makeAdmin });

  const auth = await getAuthenticatedAdmin();
  if (!auth) return { error: "No autorizado" };

  if (profileId === auth.adminId) {
    return { error: "No podes modificar tu propio rol de admin" };
  }

  // Si tu sistema real usa profiles.rol, cambiá esta parte:
  // .update({ rol: makeAdmin ? "admin" : "user" })
  const { data, error } = await auth.serviceClient
    .from("profiles")
    .update({ is_admin: makeAdmin, updated_at: new Date().toISOString() })
    .eq("id", profileId)
    .select("id, is_admin");

  if (error) return { error: error.message };
  if (!data || data.length === 0)
    return { error: "Update no afectó ninguna fila (0 rows)" };

  await logAudit(
    auth.serviceClient,
    auth.adminId,
    makeAdmin ? "perfil_hacer_admin" : "perfil_quitar_admin",
    "profiles",
    profileId,
  );

  return { success: true };
}
