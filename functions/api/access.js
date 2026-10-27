import {authMode} from '../../shared/chatkhu.js';
import {equalCode,createAccessCookie} from '../../shared/access.js';
const reply=(body,status=200,headers={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...headers}});
export async function onRequestPost({request,env}){
 const origin=new URL(request.url).origin;
 if(request.headers.get('Origin')!==origin)return reply({error:'허용되지 않은 요청입니다.'},403);
 if(authMode(env)!=='access-code')return reply({error:'접속 암호 설정이 필요합니다.'},503);
 try{
  // Bound the request before parsing; no model requests are made here.
  const reader=request.body?.getReader();if(!reader)return reply({error:'접속 암호를 입력해 주세요.'},400);
  const chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1024){await reader.cancel();return reply({error:'입력이 너무 깁니다.'},413)}chunks.push(value)}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
  const body=JSON.parse(new TextDecoder().decode(bytes));
  if(!await equalCode(body.code,env.STUDYAI_ACCESS_CODE))return reply({error:'접속 암호를 확인해 주세요.'},401);
  return reply({authenticated:true},200,{'Set-Cookie':await createAccessCookie(env.STUDYAI_ACCESS_CODE,origin)});
 }catch{return reply({error:'접속 요청을 확인해 주세요.'},400)}
}
export function onRequestDelete({request}){
 if(request.headers.get('Origin')!==new URL(request.url).origin)return reply({error:'허용되지 않은 요청입니다.'},403);
 return reply({authenticated:false},200,{'Set-Cookie':'__Host-studyai-access=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict'});
}
