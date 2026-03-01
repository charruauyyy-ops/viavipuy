import { getSupabase } from "@/lib/supabaseClient";

let lastEventTime: Record<string, number> = {};

export async function trackProfileEvent(
  profileId: string,
  eventType: "view" | "whatsapp_click" | "favorite",
  meta?: Record<string, unknown>
) {
  const key = `${profileId}:${eventType}`;
  const now = Date.now();
  const minInterval = eventType === "view" ? 10000 : 3000;
  if (lastEventTime[key] && now - lastEventTime[key] < minInterval) return;
  lastEventTime[key] = now;

  try {
    const supabase = getSupabase();
    if (!supabase) return;

    await supabase.from("profile_events").insert({
      profile_id: profileId,
      event_type: eventType,
      meta: meta || null,
    });
  } catch {
  }
}
