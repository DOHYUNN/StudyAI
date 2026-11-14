import {gatewayKey} from './chatkhu.js';
// Only metadata is requested here. Generation happens only in the explicit chat and roadmap POST handlers.
let cached;
export class ModelLookupError extends Error {constructor(message,status=null,code=null){super(message);this.status=status;this.code=code}}
export async function availableModels(env){
 const result=await fetch('https://factchat-cloud.mindlogic.ai/v1/gateway/models/?type=llm',{headers:{Authorization:`Bearer ${gatewayKey(env)}`,'User-Agent':'StudyAI/1.0','Accept':'application/json'},signal:AbortSignal.timeout(10000)});
 if(result.status===403){
  const body=await result.text();
  if(/^error code: 1010$/i.test(body.trim())){
   throw new ModelLookupError('ChatKHU 앞단의 Cloudflare가 모델 목록 요청을 차단했습니다 (1010).',403,'edge-block');
  }
  if(result.headers.get('Content-Type')?.includes('application/json')){
   let reason='상세 사유 없음';
   try {
    const error=JSON.parse(body);
    const message=error.detail?.message||error.error?.message||error.message||error.detail;
    if(typeof message==='string')reason=message.split(gatewayKey(env)).join('[redacted]').replace(/(?:baze|sk)[-_a-zA-Z0-9]{12,}/g,'[redacted]').replace(/[\w.+-]+@[\w.-]+/g,'[redacted]').slice(0,400);
   } catch {}
   throw new ModelLookupError(`ChatKHU Gateway 접근 거부 (HTTP 403): ${reason}`,403,'gateway-forbidden');
  }
  throw new ModelLookupError('ChatKHU 모델 목록이 차단되었습니다 (HTTP 403, Gateway JSON 응답 없음).',403,'non-json-forbidden');
 }
 if(!result.ok)throw new ModelLookupError(`ChatKHU 모델 목록 조회 오류 (HTTP ${result.status}). API 키와 Gateway 이용 권한을 확인해 주세요.`,result.status,'gateway-http');
 const data=await result.json();
 if(Array.isArray(data.data))return data.data.filter(m=>(!m.type||m.type==='llm')&&/^gemini-[a-zA-Z0-9._-]+$/.test(m.id||'')).map(m=>({id:m.id,name:m.display_name||m.id}));
 // Also understand the native Gemini model-list shape in tests/compatible deployments.
 if(Array.isArray(data.models))return data.models.filter(m=>m.supportedGenerationMethods?.includes('generateContent')).map(m=>({id:String(m.name||'').replace(/^models\//,''),name:m.displayName||m.name})).filter(m=>/^gemini-[a-zA-Z0-9._-]+$/.test(m.id));
 throw new ModelLookupError('ChatKHU 모델 목록의 응답 형식을 확인해야 합니다.',result.status,'model-format');
}
export async function resolveModel(env){
 if(env.GEMINI_API_KEY && env.GEMINI_FREE_TIER_CONFIRMED==='true')return 'gemini-3.5-flash-lite';
 if(env.CHATKHU_MODEL)return env.CHATKHU_MODEL;
 if(cached?.apiKey===env.CHATKHU_API_KEY&&cached.expires>Date.now())return cached.model;
 const models=await availableModels(env);
 const model=selectModel(models);cached={apiKey:env.CHATKHU_API_KEY,model,expires:Date.now()+300000};return model;
}
export function selectModel(models){
 // Prefer stable Flash variants by name. This does not assert any credit price.
 const rank=id=>(/flash-lite/.test(id)?0:/flash/.test(id)?10:20)+(/preview|experimental|exp-/.test(id)?100:0);
 models.sort((a,b)=>rank(a.id)-rank(b.id)||a.id.localeCompare(b.id));
 if(!models.length)throw new ModelLookupError('이 키로 사용할 수 있는 Gemini 채팅 모델이 없습니다. ChatKHU 모델 권한을 확인해 주세요.',200,'no-gemini-model');
 return models[0].id;
}
export function maxOutputTokens(env){const n=Number(env.CHATKHU_MAX_OUTPUT_TOKENS);return Number.isInteger(n)&&n>=64&&n<=1800?n:512}
