import {authMode} from '../../shared/chatkhu.js';
import {hasAccess} from '../../shared/access.js';
import {verifyTurnstile} from '../../shared/turnstile.js';
import {ModelLookupError} from '../../shared/models.js';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
// Read-only model metadata. Never calls generateContent.
export async function onRequestGet({request,env}) {
 if(authMode(env)!=='access-code'||!await hasAccess(request,env.STUDYAI_ACCESS_CODE))return json({error:'접속 암호를 먼저 입력해 주세요.'},401);
 if(!env.GEMINI_API_KEY||env.GEMINI_FREE_TIER_CONFIRMED!=='true')return json({error:'Gemini 연결 설정을 확인해 주세요.'},503);
 return json({models:[{id:'gemini-2.5-flash-lite',name:'Gemini 2.5 Flash-Lite'}]});
}

export async function onRequestPost({request,env}){
 if(authMode(env)!=='turnstile'||!env.GEMINI_API_KEY||env.GEMINI_FREE_TIER_CONFIRMED!=='true')return json({error:'AI 연결 설정을 확인해 주세요.'},503);
 try{
  if(!await verifyTurnstile(request,env))return json({error:'사용자 확인을 완료해 주세요.'},401);
  if(env.GEMINI_API_KEY&&env.GEMINI_FREE_TIER_CONFIRMED==='true'){
   const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite',{headers:{'x-goog-api-key':env.GEMINI_API_KEY.trim()}});
   if(!response.ok)return json({error:`Gemini 연결 확인 실패 (HTTP ${response.status}).`},502);
   const check=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',{method:'POST',headers:{'x-goog-api-key':env.GEMINI_API_KEY.trim(),'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:'Hi'}]}],generationConfig:{maxOutputTokens:4,thinkingConfig:{thinkingBudget:0}}})});
   if(!check.ok){const error=await check.json().catch(()=>({}));return json({error:`Gemini generation HTTP ${check.status}: ${String(error.error?.status||'unknown')}`},502)}
   const answer=await check.json();return json({connected:true,model:'gemini-2.5-flash-lite',usage:answer.usageMetadata});
  }

 }catch(e){return json({error:e instanceof ModelLookupError?e.message:'Gemini 연결 시간이 초과됐거나 응답을 읽지 못했습니다.',...(e instanceof ModelLookupError?{gatewayStatus:e.status,code:e.code}:{})},502)}
}
