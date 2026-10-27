// Secrets stay on the Pages server. This flag records the operator's credit check;
// it cannot inspect or change the school's billing settings.
export function chatkhuReady(env) {
 return env.CHATKHU_CREDITS_CONFIRMED === 'true'
  && typeof env.CHATKHU_API_KEY === 'string' && !!env.CHATKHU_API_KEY.trim()
  && typeof env.CHATKHU_MODEL === 'string' && /^gemini-[a-zA-Z0-9._-]+$/.test(env.CHATKHU_MODEL)
  && !!env.SUPABASE_URL && !!env.SUPABASE_ANON_KEY;
}
