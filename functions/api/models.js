import {authMode} from '../../shared/chatkhu.js';
import {hasAccess} from '../../shared/access.js';
import {verifyTurnstile} from '../../shared/turnstile.js';
import {availableModels,selectModel,ModelLookupError} from '../../shared/models.js';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
// Read-only model metadata. Never calls generateContent.
export async function onRequestGet({request,env}){
 if(authMode(env)!=='access-code'||!await hasAccess(request,env.STUDYAI_ACCESS_CODE))return json({error:'접속 암호를 먼저 입력해 주세요.'},401);
 if(!env.CHATKHU_API_KEY)return json({error:'ChatKHU API 키 설정이 필요합니다.'},503);
 try{return json({models:await availableModels(env)})}catch{return json({error:'모델 목록을 불러오지 못했습니다. 키 권한을 확인해 주세요.'},502)}
}

export async function onRequestPost({request,env}){
 if(authMode(env)!=='turnstile'||!(env.GEMINI_API_KEY&&env.GEMINI_FREE_TIER_CONFIRMED==='true')&&(!env.CHATKHU_API_KEY||env.CHATKHU_CREDITS_CONFIRMED!=='true'))return json({error:'AI 연결 설정을 확인해 주세요.'},503);
 try{
  if(!await verifyTurnstile(request,env))return json({error:'사용자 확인을 완료해 주세요.'},401);
  if(env.GEMINI_API_KEY&&env.GEMINI_FREE_TIER_CONFIRMED==='true'){
   const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite',{headers:{'x-goog-api-key':env.GEMINI_API_KEY.trim()}});
   if(!response.ok)return json({error:`Gemini 연결 확인 실패 (HTTP ${response.status}).`},502);
   return json({connected:true,model:'gemini-2.5-flash-lite'});
  }
  const models=await availableModels(env);
  const model=env.CHATKHU_MODEL||selectModel(models);
  if(!models.some(m=>m.id===model))return json({error:'지정한 모델을 이 키로 사용할 수 없습니다.'},502);
  return json({connected:true,model});
 }catch(e){return json({error:e instanceof ModelLookupError?e.message:'ChatKHU 연결 시간이 초과됐거나 응답을 읽지 못했습니다.',...(e instanceof ModelLookupError?{gatewayStatus:e.status,code:e.code}:{})},502)}
}
