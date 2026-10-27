import {authMode} from '../../shared/chatkhu.js';
import {hasAccess} from '../../shared/access.js';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
// Read-only model metadata. Never calls generateContent.
export async function onRequestGet({request,env}){
 if(authMode(env)!=='access-code'||!await hasAccess(request,env.STUDYAI_ACCESS_CODE))return json({error:'접속 암호를 먼저 입력해 주세요.'},401);
 if(!env.CHATKHU_API_KEY)return json({error:'ChatKHU API 키 설정이 필요합니다.'},503);
 try{
  const result=await fetch('https://factchat-cloud.mindlogic.ai/v1/gateway/gemini/v1beta/models/',{headers:{Authorization:`Bearer ${env.CHATKHU_API_KEY}`},signal:AbortSignal.timeout(10000)});
  if(!result.ok)return json({error:'모델 목록을 불러오지 못했습니다. 키 권한을 확인해 주세요.'},502);
  const data=await result.json();
  const models=(Array.isArray(data.models)?data.models:[]).filter(m=>m.supportedGenerationMethods?.includes('generateContent')).map(m=>({id:String(m.name||'').replace(/^models\//,''),name:m.displayName||m.name})).filter(m=>/^gemini-[a-zA-Z0-9._-]+$/.test(m.id));
  return json({models});
 }catch{return json({error:'모델 목록 연결을 확인해 주세요.'},502)}
}
