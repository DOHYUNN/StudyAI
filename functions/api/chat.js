const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export function validate(body){
 return body && typeof body.subject==='string' && body.subject.length>0 && body.subject.length<=100 && (body.level==null || typeof body.level==='string'&&body.level.length<=100) && Array.isArray(body.messages) && body.messages.length>0 && body.messages.length<=10 && body.messages.every(m=>m&&['user','assistant'].includes(m.role)&&typeof m.text==='string'&&m.text.trim().length>0&&m.text.length<=4000) && body.messages.at(-1).role==='user';
}
export async function onRequestPost({request,env}){
 if(env.FREE_TIER_CONFIRMED!=='true'||!env.GEMINI_API_KEY||!env.GEMINI_MODEL||!env.SUPABASE_URL||!env.SUPABASE_ANON_KEY)return json({error:'AI 연결 준비 중입니다. 무료 요금제 확인과 서버 설정이 필요합니다.'},503);
 if(!/^[a-zA-Z0-9._-]+$/.test(env.GEMINI_MODEL))return json({error:'AI 모델 설정을 확인해 주세요.'},503);
 if(request.headers.get('Origin') && request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'허용되지 않은 요청입니다.'},403);
 const authorization=request.headers.get('Authorization');
 if(!authorization?.startsWith('Bearer '))return json({error:'학습 세션을 먼저 연결해 주세요.'},401);
 try{
  const auth=await fetch(`${env.SUPABASE_URL}/auth/v1/user`,{headers:{Authorization:authorization,apikey:env.SUPABASE_ANON_KEY},signal:AbortSignal.timeout(8000)});
  if(!auth.ok)return json({error:'학습 세션이 만료됐어요. 새로고침 후 다시 시도해 주세요.'},401);
  const raw=await request.text();if(raw.length>20000)return json({error:'질문이 너무 깁니다. 내용을 줄여주세요.'},413);
  let body;try{body=JSON.parse(raw)}catch{return json({error:'올바른 질문 형식이 아닙니다.'},400)}
  if(!validate(body))return json({error:'질문 내용과 과목을 확인해 주세요.'},400);
  const system=`당신은 한국어로 대화하는 대학생 전공 학습 코치 StudyAI입니다. 학생을 타인과 비교하거나 학습 수준을 단정하지 마세요. 학습 수준이 확인되지 않았다면 이해한 내용과 어려운 점을 질문하고, 좁은 범위로 추정한 수준이 맞는지 확인받으세요. 확인 후에는 질문에 정확히 답하고 실행 가능한 단계별 로드맵과 짧은 연습 문제를 제안하세요. 모르는 사실은 모른다고 답하세요. 실제 유튜브 영상이나 URL을 지어내지 말고 검색 키워드를 안내하세요. 답변은 간결한 한국어 일반 텍스트로 작성하세요. 선택 과목: ${body.subject}. 학생이 확인한 이해도: ${body.level||'아직 확인되지 않음'}.`;
  const result=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':env.GEMINI_API_KEY},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:body.messages.map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.text}]})),generationConfig:{maxOutputTokens:1800,temperature:0.6}}),signal:AbortSignal.timeout(30000)});
  if(result.status===429)return json({error:'무료 AI 사용 한도에 도달했거나 요청이 몰리고 있어요. 잠시 후 다시 시도해 주세요. 유료 서비스로 전환하지 않습니다.'},429);
  if(!result.ok)return json({error:'AI 연결에 실패했어요. 서버의 API 키와 무료 지원 모델 설정을 확인해 주세요.'},502);
  const data=await result.json();const reply=data.candidates?.[0]?.content?.parts?.filter(p=>!p.thought).map(p=>p.text||'').join('').trim();
  if(!reply)return json({error:'답변을 만들지 못했어요. 질문을 조금 바꿔보세요.'},502);
  return json({reply});
 }catch{return json({error:'연결이 지연되고 있어요. 잠시 후 다시 시도해 주세요.'},502)}
}
