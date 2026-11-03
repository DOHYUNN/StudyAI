import rawCatalog from '../../shared/roadmap-catalog.generated.js';
import {validateCatalog} from '../../src/roadmap/model.js';
import {validateRoadmapProfile,validateRoadmapSuggestion,roadmapChecks,roadmapPrompt,MAX_AI_COURSES} from '../../shared/ai-roadmap.js';
import {chatkhuReady,authMode,gatewayKey} from '../../shared/chatkhu.js';
import {verifyTurnstile} from '../../shared/turnstile.js';
import {hasAccess} from '../../shared/access.js';
import {resolveModel,maxOutputTokens,ModelLookupError} from '../../shared/models.js';
const catalog=validateCatalog(rawCatalog),MAX_BYTES=12000;
const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
export async function onRequestPost({request,env}){
 if(!chatkhuReady(env))return json({error:'ChatKHU 연결 설정 후 AI 로드맵을 사용할 수 있습니다.'},503);
 if(request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'허용되지 않은 요청입니다.'},403);
 try{
  const mode=authMode(env);
  if(mode==='turnstile'){
   if(!await verifyTurnstile(request,env))return json({error:'사용자 확인 후 다시 시도해 주세요.'},401);
  }else if(mode==='access-code'){
   if(!await hasAccess(request,env.STUDYAI_ACCESS_CODE))return json({error:'채팅에서 AI 접속을 완료한 뒤 다시 시도해 주세요.'},401);
  }else{
   const authorization=request.headers.get('Authorization');if(!authorization?.startsWith('Bearer '))return json({error:'로그인 후 다시 시도해 주세요.'},401);
   const auth=await fetch(`${env.SUPABASE_URL}/auth/v1/user`,{headers:{Authorization:authorization,apikey:env.SUPABASE_ANON_KEY},signal:AbortSignal.timeout(8000)});
   if(!auth.ok)return json({error:'로그인 상태를 다시 확인해 주세요.'},401);
   const user=await auth.json();if(!user.id||user.is_anonymous)return json({error:'로그인 후 다시 시도해 주세요.'},401);
  }
  if(Number(request.headers.get('Content-Length'))>MAX_BYTES)return json({error:'입력 내용이 너무 깁니다.'},413);
  const reader=request.body?.getReader();if(!reader)return json({error:'학습 상황을 입력해 주세요.'},400);
  let size=0,raw='',decoder=new TextDecoder();while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BYTES){await reader.cancel();return json({error:'입력 내용이 너무 깁니다.'},413)}raw+=decoder.decode(value,{stream:true})}raw+=decoder.decode();
  let profile;try{profile=validateRoadmapProfile(JSON.parse(raw),catalog)}catch(e){return json({error:e instanceof SyntaxError?'입력 형식이 올바르지 않습니다.':e.message},400)}
  const model=await resolveModel(env);
  const result=await fetch(`https://factchat-cloud.mindlogic.ai/v1/gateway/gemini/v1beta/models/${model}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'StudyAI/1.0',Authorization:`Bearer ${gatewayKey(env)}`},body:JSON.stringify({systemInstruction:{parts:[{text:roadmapPrompt(profile,catalog)}]},contents:[{role:'user',parts:[{text:'입력 조건에 맞는 학습 로드맵 초안을 작성해 주세요.'}]}],generationConfig:{maxOutputTokens:maxOutputTokens(env),temperature:0.2,responseMimeType:'application/json',responseSchema:{type:'OBJECT',properties:{summary:{type:'STRING'},courses:{type:'ARRAY',maxItems:MAX_AI_COURSES,items:{type:'OBJECT',properties:{courseId:{type:'STRING'},semester:{type:'INTEGER',minimum:profile.startSemester,maximum:profile.startSemester+profile.semesterCount-1}},required:['courseId','semester']}}},required:['summary','courses']}}}),signal:AbortSignal.any([request.signal,AbortSignal.timeout(30000)])});
  if(result.status===402)return json({error:'학교 제공 크레딧이 부족해 생성을 중단했습니다.'},402);
  if(result.status===429)return json({error:'사용 한도에 도달했거나 요청이 몰리고 있습니다. 자동으로 재시도하지 않습니다.'},429);
  if(result.status===401||result.status===403)return json({error:'ChatKHU API 키 또는 모델 이용 권한을 확인해 주세요.'},502);
  if(!result.ok)return json({error:'ChatKHU 로드맵 생성에 실패했습니다. 연결 설정을 확인해 주세요.'},502);
  const data=await result.json(),candidate=data.candidates?.[0];
  if(candidate?.finishReason==='MAX_TOKENS')return json({error:'출력 길이 한도 안에 초안을 완성하지 못했습니다. 계획 기간을 줄여 다시 요청해 주세요.'},502);
  const text=candidate?.content?.parts?.filter(p=>!p.thought).map(p=>p.text||'').join('').trim();
  let suggestion;try{suggestion=validateRoadmapSuggestion(JSON.parse((text||'').replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'')),profile,catalog)}catch(e){return json({error:e instanceof SyntaxError?'AI가 올바른 초안을 반환하지 못했습니다. 기존 로드맵은 변경하지 않았습니다.':e.message},502)}
  return json({suggestion,checks:roadmapChecks(suggestion,profile,catalog)});
 }catch(e){return json({error:e instanceof ModelLookupError?e.message:'AI 로드맵 연결이 지연되고 있습니다. 자동으로 재시도하지 않습니다.'},502)}
}
