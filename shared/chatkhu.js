// Chat access and cloud record storage can be configured independently.
export function authMode(env) {
 if(env.TURNSTILE_SITE_KEY&&env.TURNSTILE_SECRET_KEY)return 'turnstile';
 if(typeof env.STUDYAI_ACCESS_CODE==='string'&&env.STUDYAI_ACCESS_CODE.length>=16&&env.STUDYAI_ACCESS_CODE.length<=128)return 'access-code';
 if(env.SUPABASE_URL&&env.SUPABASE_ANON_KEY)return 'supabase';
 return null;
}
export function chatkhuReady(env) {
 return env.CHATKHU_CREDITS_CONFIRMED === 'true'
  && typeof env.CHATKHU_API_KEY === 'string' && !!env.CHATKHU_API_KEY.trim()
  && (env.CHATKHU_MODEL===undefined || env.CHATKHU_MODEL==='' || typeof env.CHATKHU_MODEL === 'string' && /^gemini-[a-zA-Z0-9._-]+$/.test(env.CHATKHU_MODEL))
  && !!authMode(env);
}

export function gatewayKey(env){
 let key=typeof env.CHATKHU_API_KEY==='string'?env.CHATKHU_API_KEY.trim():'';
 if((key.startsWith('"')&&key.endsWith('"'))||(key.startsWith("'")&&key.endsWith("'")))key=key.slice(1,-1).trim();
 return key.replace(/^Bearer\s+/i,'').trim();
}
