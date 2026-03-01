import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !service) {
      return NextResponse.json(
        { error: "Falta SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 },
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token)
      return NextResponse.json({ error: "Falta token" }, { status: 401 });

    const admin = createClient(url, service, {
      auth: { persistSession: false },
    });

    // valida token → user
    const { data: u, error: uErr } = await admin.auth.getUser(token);
    if (uErr || !u?.user)
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });

    // check is_admin en profiles
    const { data: p, error: pErr } = await admin
      .from("profiles")
      .select("is_admin")
      .eq("id", u.user.id)
      .single();

    if (pErr)
      return NextResponse.json({ error: pErr.message }, { status: 500 });
    if (!p?.is_admin)
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    // action
    const body = await req.json();
    const { targetUserId, action, value } = body;

    if (!targetUserId || !action) {
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
    }

    let update: any = { updated_at: new Date().toISOString() };

    if (action === "setPlan") {
      update.plan_actual = value; // "free" | "plus" | "platino" | "diamante"
      update.plan_estado = "activo";
    } else if (action === "suspend") {
      update.is_suspended = Boolean(value);
    } else if (action === "toggleAdmin") {
      update.is_admin = Boolean(value);
    } else {
      return NextResponse.json({ error: "Action inválida" }, { status: 400 });
    }

    const { data, error } = await admin
      .from("profiles")
      .update(update)
      .eq("id", targetUserId)
      .select("id")
      .maybeSingle();

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "0 rows" }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error servidor" },
      { status: 500 },
    );
  }
}
