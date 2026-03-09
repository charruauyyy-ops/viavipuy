import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/mi-cuenta";

  // URL pública fija (server-safe)
  const siteUrl = process.env.APP_URL as string;

  if (!siteUrl) {
    return NextResponse.redirect(
      new URL("/login?error=missing_app_url", "https://viavipuy.com")
    );
  }

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        return NextResponse.redirect(new URL(next, siteUrl));
      }
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=auth_callback_failed", siteUrl)
  );
}
