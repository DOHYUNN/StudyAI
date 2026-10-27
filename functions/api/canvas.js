import {canvasToken,canvasSnapshot,CanvasError} from '../../shared/canvas.js';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store, private','Pragma':'no-cache'}});
function localMode(request,env){return env.LOCAL_CANVAS_MODE==='true'&&['127.0.0.1','localhost'].includes(new URL(request.url).hostname)}
export function onRequestGet({request,env}){
 const local=localMode(request,env);
 return json({available:local||!!env.CANVAS_OWNER_ID,localConfigured:local&&!!canvasToken(env.CANVAS_ACCESS_TOKEN),personalOnly:true});
}
export async function onRequestPost({request,env}){
 const origin=new URL(request.url).origin;
 if(request.headers.get('Origin')!==origin)return json({error:'이 웹사이트에서 연결해 주세요.'},403);
 const local=localMode(request,env);
 if(!local&&!/^\d+$/.test(env.CANVAS_OWNER_ID||''))return json({error:'개인 LearningX 연결 설정을 준비 중입니다.'},503);
 const authorization=request.headers.get('Authorization')||'';
 // The production endpoint NEVER reads a shared Canvas access token from env.
 const token=canvasToken(authorization.replace(/^Bearer\s+/i,''))||(local?canvasToken(env.CANVAS_ACCESS_TOKEN):'');
 if(!token)return json({error:'LearningX 앱 토큰을 입력해 주세요.'},401);
 const controller=new AbortController(),cancel=()=>controller.abort();request.signal.addEventListener('abort',cancel,{once:true});
 const timer=setTimeout(cancel,45000);
 try{return json(await canvasSnapshot(token,local?null:env.CANVAS_OWNER_ID,controller.signal))}
 catch(e){return json({error:e instanceof CanvasError?e.message:'학교 연결 시간이 초과됐거나 통신에 실패했습니다.'},e instanceof CanvasError?e.status:502)}
 finally{clearTimeout(timer);request.signal.removeEventListener('abort',cancel)}
}
