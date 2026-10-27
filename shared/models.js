// Only metadata is requested here. Generation happens exclusively in /api/chat.
let cached;
export class ModelLookupError extends Error {}
export async function availableModels(env){
 const result=await fetch('https://factchat-cloud.mindlogic.ai/v1/gateway/gemini/v1beta/models/?pageSize=1000',{headers:{Authorization:`Bearer ${env.CHATKHU_API_KEY}`},signal:AbortSignal.timeout(10000)});
 if(!result.ok)throw new ModelLookupError('ChatKHU 모델 목록을 확인할 수 없습니다. API 키와 이용 권한을 확인해 주세요.');
 const data=await result.json();
 return (Array.isArray(data.models)?data.models:[]).filter(m=>m.supportedGenerationMethods?.includes('generateContent')).map(m=>({id:String(m.name||'').replace(/^models\//,''),name:m.displayName||m.name})).filter(m=>/^gemini-[a-zA-Z0-9._-]+$/.test(m.id));
}
export async function resolveModel(env){
 if(env.CHATKHU_MODEL)return env.CHATKHU_MODEL;
 if(cached?.apiKey===env.CHATKHU_API_KEY&&cached.expires>Date.now())return cached.model;
 const models=await availableModels(env);
 // Prefer stable Flash variants by name. This does not assert any credit price.
 const rank=id=>(/flash-lite/.test(id)?0:/flash/.test(id)?10:20)+(/preview|experimental|exp-/.test(id)?100:0);
 models.sort((a,b)=>rank(a.id)-rank(b.id)||a.id.localeCompare(b.id));
 if(!models.length)throw new ModelLookupError('이 키로 사용할 수 있는 Gemini 채팅 모델이 없습니다. ChatKHU 모델 권한을 확인해 주세요.');
 const model=models[0].id;cached={apiKey:env.CHATKHU_API_KEY,model,expires:Date.now()+300000};return model;
}
export function maxOutputTokens(env){const n=Number(env.CHATKHU_MAX_OUTPUT_TOKENS);return Number.isInteger(n)&&n>=64&&n<=1800?n:512}
