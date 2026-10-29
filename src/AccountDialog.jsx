import React,{useEffect,useRef,useState} from 'react';
import {X,LogOut,UserRound} from 'lucide-react';
import {supabase} from './storage';
import {startSocialLogin,configuredProviders} from './social-auth';
export const loginProviders=configuredProviders(import.meta.env.VITE_AUTH_PROVIDERS||'');
const names={google:'Google'};
export default function AccountDialog({user,loading,onClose,onSignedOut}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const panel=useRef(null);
 useEffect(()=>{
  const previous=document.activeElement;panel.current?.focus();
  function key(e){if(e.key==='Escape')onClose();if(e.key==='Tab'){const all=[...panel.current.querySelectorAll('button:not(:disabled),a[href]')];const first=all[0],last=all.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===panel.current)){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}}
  document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);previous?.focus()};
 },[]);
 async function login(provider){setBusy(true);setError('');try{await startSocialLogin(supabase,provider,loginProviders,window.location.origin)}catch(e){setError(e.message);setBusy(false)}}
 async function logout(){setBusy(true);setError('');try{const {error}=await supabase.auth.signOut({scope:'local'});if(error)throw error;onSignedOut();onClose()}catch{setError('로그아웃하지 못했습니다. 다시 시도해 주세요.');setBusy(false)}}
 return <div className="modal-backdrop" onClick={onClose}><section ref={panel} tabIndex={-1} className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-heading" onClick={e=>e.stopPropagation()}><button className="icon-button modal-close" onClick={onClose} aria-label="로그인 창 닫기"><X size={20}/></button><div className="account-symbol"><UserRound size={25}/></div><h2 id="account-heading">{user?'내 계정':'StudyAI 로그인'}</h2>{loading?<p role="status">로그인 상태 확인 중…</p>:user?<><p className="account-name">{user.user_metadata?.full_name||user.user_metadata?.name||'StudyAI 사용자'}</p>{user.email&&<p className="account-email">{user.email}</p>}<button className="secondary account-logout" disabled={busy} onClick={logout}><LogOut size={16}/>{busy?'처리 중…':'로그아웃'}</button></>:<><p>사용하던 계정으로 간편하게 시작하세요.</p><div className="social-buttons">{supabase&&loginProviders.length?loginProviders.map(provider=><button key={provider} className={`social-login ${provider}`} disabled={busy} onClick={()=>login(provider)}><span className="social-provider-mark" aria-hidden="true">G</span>{busy?'로그인 화면으로 이동 중…':`${names[provider]}로 계속하기`}</button>):<div className="account-pending" role="status">소셜 로그인 연결을 준비 중입니다.</div>}</div><button className="text-button account-guest" onClick={onClose}>로그인 없이 계속하기</button></>}<small>대화와 첨부 파일은 저장하지 않습니다. 학교 LearningX 연결은 별도로 진행합니다.</small>{error&&<p className="account-error" role="alert">{error}</p>}</section></div>
}
