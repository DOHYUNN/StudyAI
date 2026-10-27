import React,{useEffect,useRef,useState} from 'react';
let scriptPromise;
function loadWidget(){
 if(window.turnstile)return Promise.resolve(window.turnstile);
 if(!scriptPromise)scriptPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.defer=true;
  script.onload=()=>window.turnstile?resolve(window.turnstile):reject(new Error('확인 도구 로드 실패'));
  script.onerror=()=>{scriptPromise=null;script.remove();reject(new Error('확인 도구 로드 실패'))};document.head.appendChild(script);
 });
 return scriptPromise;
}
export default function ChatVerification({siteKey,reset,onToken}){
 const container=useRef(null),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let cancelled=false,widget=null;onToken('');setFailed(false);
  loadWidget().then(api=>{if(cancelled)return;widget=api.render(container.current,{sitekey:siteKey,action:'studyai-chat',theme:'light',size:'flexible',appearance:'interaction-only',callback:token=>onToken(token),'expired-callback':()=>onToken(''),'error-callback':()=>{onToken('');setFailed(true)}})}).catch(()=>{if(!cancelled)setFailed(true)});
  return()=>{cancelled=true;if(widget!==null)window.turnstile?.remove(widget)};
 },[siteKey,reset,retry,onToken]);
 return <div className="chat-verification"><div ref={container}/>{failed&&<span>사용자 확인을 불러오지 못했습니다. <button type="button" onClick={()=>setRetry(n=>n+1)}>다시 확인</button></span>}</div>;
}
