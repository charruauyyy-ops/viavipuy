// lib/adminService.ts
"use server";

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getRouteSupabase } from "@/lib/supabaseRoute";
import { getServerSupabase } from "@/lib/supabaseServer";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any>;

function getServiceClient(): AnySupabase | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function isAdminByRol(serviceClient: AnySupabase, userId: string) {
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("rol")
    .eq("id", userId)
    .maybeSingle();

  return profile?.rol === "admin";
}

/**
 * getAuthenticatedAdmin:
 * - Route Handlers: pasar (req, res) para que supabase lea cookies del request.
 * - Server Actions: llamar sin args, usa supabase server (cookies via next/headers).
 */
export async function getAuthenticatedAdmin(
  req?: NextRequest,
  res?: NextResponse,
): Promise<{ adminId: string; serviceClient: AnySupabase } | null> {
  const serviceClient = getServiceClient();
  if (!serviceClient) return null;

  // Caso ROUTE HANDLER
  if (req && res) {
    const supabase = getRouteSupabase(req, res);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;
    const ok = await isAdminByRol(serviceClient, user.id);
    if (!ok) return null;

    return { adminId: user.id, serviceClient };
  }

  // Caso SERVER ACTION
  const serverSupabase = await getServerSupabase();
  if (!serverSupabase) return null;

  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  if (!user) return null;
  const ok = await isAdminByRol(serviceClient, user.id);
  if (!ok) return null;

  return { adminId: user.id, serviceClient };
}

// Alias para que tu código viejo siga andando si lo usa en actions
export async function getAuthenticatedAdminAction(): Promise<{
  adminId: string;
  serviceClient: AnySupabase;
} | null> {
  return getAuthenticatedAdmin();
}

export async function logAudit(
  supabase: AnySupabase,
  adminId: string,
  action: string,
  targetTable: string,
  targetId: string,
  details?: Record<string, unknown>,
) {
  try {
    await supabase.from("admin_audit").insert({
      admin_id: adminId,
      action,
      target_table: targetTable,
      target_id: targetId,
      details: details || {},
    });
  } catch {
    // no bloquear operación principal
  }
}
