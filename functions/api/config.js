export function onRequestGet({env}) {
 return Response.json({enabled:env.FREE_TIER_CONFIRMED==='true'&&!!env.GEMINI_API_KEY&&!!env.GEMINI_MODEL&&!!env.SUPABASE_URL&&!!env.SUPABASE_ANON_KEY},{headers:{'Cache-Control':'no-store'}});
}
