export async function verifyTurnstile(request,env){
 const token=request.headers.get('X-StudyAI-Turnstile');
 if(typeof token!=='string'||!token||token.length>2048)return false;
 const origin=new URL(request.url).origin;
 if(request.headers.get('Origin')!==origin)return false;
 const result=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:token}),signal:AbortSignal.timeout(10000)});
 if(!result.ok)return false;
 const data=await result.json();
 return data.success===true&&data.hostname===new URL(origin).hostname&&data.action==='studyai-chat';
}
