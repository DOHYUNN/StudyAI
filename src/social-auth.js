const supported=new Set(['google']);
export function configuredProviders(value=''){return [...new Set(value.split(',').map(v=>v.trim().toLowerCase()).filter(v=>supported.has(v)))]}
export function realUser(session){return session?.user&&!session.user.is_anonymous?session.user:null}
export async function startSocialLogin(client,provider,enabled,origin){
 if(!client)throw new Error('로그인 연결 설정을 준비 중입니다.');
 if(!supported.has(provider)||!enabled.includes(provider))throw new Error('아직 준비되지 않은 로그인 방식입니다.');
 const url=new URL(origin);
 if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw new Error('안전한 사이트 주소에서 로그인해 주세요.');
 const {error}=await client.auth.signInWithOAuth({provider,options:{redirectTo:`${url.origin}/`}});
 if(error)throw new Error('로그인 화면을 열지 못했습니다. 잠시 후 다시 시도해 주세요.');
}
export async function requireAccount(client){
 if(!client)throw new Error('로그인 연결 설정을 준비 중입니다.');
 const {data,error}=await client.auth.getSession();
 if(error||!realUser(data.session))throw new Error('소셜 로그인 후 이용해 주세요.');
 return data.session;
}
// Show a fixed message rather than reflecting untrusted OAuth error text.
export function loginCallbackError(href){
 const url=new URL(href),hash=new URLSearchParams(url.hash.slice(1));
 const failed=url.searchParams.has('error')||hash.has('error');
 if(!failed)return null;
 for(const key of ['error','error_code','error_description']){url.searchParams.delete(key);hash.delete(key)}
 url.hash=hash.toString();return {url:url.href,message:'로그인을 완료하지 못했습니다. 로그인 창에서 다시 시도해 주세요.'};
}
