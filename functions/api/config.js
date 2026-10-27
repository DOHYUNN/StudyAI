import {chatkhuReady,authMode} from '../../shared/chatkhu.js';
import {resolveModel} from '../../shared/models.js';
import {hasAccess} from '../../shared/access.js';
export async function onRequestGet({env,request}) {
 const mode=authMode(env);
 const authenticated=mode==='access-code'&&!!request&&await hasAccess(request,env.STUDYAI_ACCESS_CODE);
 let enabled=chatkhuReady(env),model=env.CHATKHU_MODEL||null,error=null;
 if(enabled&&authenticated){try{model=await resolveModel(env)}catch{enabled=false;error='ChatKHU 모델 연결을 확인해 주세요.'}}
 return Response.json({enabled,provider:'chatkhu',authMode:mode,authenticated,...(model?{model}:{}),...(error?{error}:{})},{headers:{'Cache-Control':'no-store'}});
}
