const encoder=new TextEncoder();
const cookieName='__Host-studyai-access';
const lifetime=4*60*60;
async function signingKey(secret){return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify'])}
function hex(bytes){return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('')}
export async function equalCode(a,b){
 if(typeof a!=='string'||a.length>128)return false;
 const key=await signingKey(b);const sig=await crypto.subtle.sign('HMAC',key,encoder.encode(b));
 return crypto.subtle.verify('HMAC',key,sig,encoder.encode(a));
}
export async function createAccessCookie(secret,origin,now=Date.now()){
 const expires=Math.floor(now/1000)+lifetime,nonce=crypto.randomUUID();
 const payload=`${expires}.${nonce}`;
 const signature=hex(await crypto.subtle.sign('HMAC',await signingKey(secret),encoder.encode(`${origin}|${payload}`)));
 return `${cookieName}=${payload}.${signature}; Path=/; Max-Age=${lifetime}; HttpOnly; Secure; SameSite=Strict`;
}
export async function hasAccess(request,secret,now=Date.now()){
 const cookie=(request.headers.get('Cookie')||'').split(';').map(c=>c.trim()).find(c=>c.startsWith(`${cookieName}=`))?.slice(cookieName.length+1);
 if(!cookie)return false;
 const parts=cookie.split('.');if(parts.length!==3||!/^\d{10}$/.test(parts[0])||!/^[a-f0-9-]{36}$/.test(parts[1])||!/^[a-f0-9]{64}$/.test(parts[2]))return false;
 const expires=Number(parts[0]),seconds=Math.floor(now/1000);if(expires<=seconds||expires>seconds+lifetime)return false;
 const signature=Uint8Array.from(parts[2].match(/../g),h=>parseInt(h,16));
 return crypto.subtle.verify('HMAC',await signingKey(secret),signature,encoder.encode(`${new URL(request.url).origin}|${parts[0]}.${parts[1]}`));
}
