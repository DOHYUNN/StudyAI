import {defineConfig} from 'vite';
import {readFileSync} from 'node:fs';
import {onRequestGet,onRequestPost} from './functions/api/canvas.js';
function localCanvas(){return {name:'studyai-local-canvas',configureServer(server){
 server.middlewares.use(async(req,res,next)=>{
  if(req.url?.split('?')[0]!=='/api/canvas')return next();
  try{
   const env={LOCAL_CANVAS_MODE:'true'};
   try{for(const line of readFileSync(new URL('./.dev.vars',import.meta.url),'utf8').split(/\r?\n/)){if(line.startsWith('CANVAS_ACCESS_TOKEN='))env.CANVAS_ACCESS_TOKEN=line.slice('CANVAS_ACCESS_TOKEN='.length).trim().replace(/^(['"])(.*)\1$/,'$2')}}catch{}
   const request=new Request(`http://127.0.0.1:${server.config.server.port||5173}/api/canvas`,{method:req.method,headers:req.headers});
   const result=req.method==='GET'?onRequestGet({request,env}):req.method==='POST'?await onRequestPost({request,env}):new Response(null,{status:405});
   res.statusCode=result.status;for(const [k,v]of result.headers)res.setHeader(k,v);res.end(await result.text());
  }catch{res.statusCode=500;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'로컬 학습 정보 연결을 확인해 주세요.'}))}
 });
}}}
export default defineConfig({plugins:[localCanvas()]});
