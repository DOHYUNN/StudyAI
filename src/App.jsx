import React, {useState,useEffect,useRef,lazy,Suspense} from 'react';
import {BookOpen,MessageCircle,Route,Play,Bookmark,Settings,ArrowUpRight,ArrowRight,ArrowUp,Check,Sparkles,Target,X,Search,Cloud,Paperclip,FileText} from 'lucide-react';
import {subjects,resources,demoReply} from './data';
import {readState,persistState,supabase,profileSyncReady,session,saveCloud,loadCloud} from './storage';
import ChatVerification from './ChatVerification';
import LearningPanel from './LearningPanel';
import AccountDialog from './AccountDialog';
import {realUser,loginCallbackError} from './social-auth';
import {prepareFiles} from './attachments';
import {formatSize} from '../shared/attachments';
const navs=[['coach','채팅',MessageCircle],['learning','내 학습',BookOpen],['roadmap','로드맵',Route],['library','학습 자료',Play],['saved','저장한 자료',Bookmark]];
const RoadmapPlanner=lazy(()=>import('./RoadmapPlanner'));
const initial=readState();
function FilePreview({file,onClose}){
 const [url,setUrl]=useState('');
 useEffect(()=>{if(!file?.data)return;const raw=atob(file.data),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));const u=URL.createObjectURL(new Blob([bytes],{type:file.mimeType}));setUrl(u);return()=>URL.revokeObjectURL(u)},[file]);
 useEffect(()=>{const close=e=>{if(e.key==='Escape')onClose()};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close)},[onClose]);
 return <div className="modal-backdrop" onClick={onClose}><section className="file-preview" role="dialog" aria-modal="true" aria-labelledby="file-preview-title" onClick={e=>e.stopPropagation()}><header><h2 id="file-preview-title">{file.name}</h2><button className="icon-button" onClick={onClose} aria-label="파일 미리보기 닫기"><X size={20}/></button></header><p>{formatSize(file.size)} · {file.mimeType==='application/pdf'?'PDF 문서':'이미지'}</p>{url&&(file.mimeType==='application/pdf'?<iframe src={url} title={`${file.name} 미리보기`}/>:<img src={url} alt={`${file.name} 첨부 미리보기`}/>)}<small>원본 파일은 이 페이지에서만 임시로 유지됩니다.</small></section></div>
}
function Icon({name:Comp,...props}) {return <Comp size={20} strokeWidth={1.7} {...props}/>}
export default function App(){
 const [roadmapVisited,setRoadmapVisited]=useState(false);
 const [page,setPage]=useState('coach'),[selected,setSelected]=useState(subjects.some(s=>s.id===initial.selected)?initial.selected:subjects[0].id);
 const [progress,setProgress]=useState(initial.progress||{}),[saved,setSaved]=useState(Array.isArray(initial.saved)?initial.saved.filter(id=>resources.some(r=>r.id===id)):[]),[goal,setGoal]=useState(initial.goal||'매일 20분 공부하기');
 const [messages,setMessages]=useState([]),[level,setLevel]=useState({}),[input,setInput]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[modal,setModal]=useState(false),[goalDraft,setGoalDraft]=useState(''),[query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[live,setLive]=useState(false),[cloudBusy,setCloudBusy]=useState(false);
 const [accountOpen,setAccountOpen]=useState(false),[accountUser,setAccountUser]=useState(null),[accountLoading,setAccountLoading]=useState(!!supabase);
 const [connectionHealth,setConnectionHealth]=useState('unknown');
 const [checkingConnection,setCheckingConnection]=useState(false),[connectionCheck,setConnectionCheck]=useState('');
 const [verificationToken,setVerificationToken]=useState(''),[verificationReset,setVerificationReset]=useState(0);
 const [connection,setConnection]=useState({enabled:false,authMode:null,authenticated:false}),[accessCode,setAccessCode]=useState(''),[accessBusy,setAccessBusy]=useState(false);
 const [attachments,setAttachments]=useState([]),[fileReading,setFileReading]=useState(false),[previewFile,setPreviewFile]=useState(null);
 const fileInput=useRef(null),fileReadingRef=useRef(false),fileSessions=useRef(new Map()),conversationVersion=useRef(0),chatRequest=useRef(null);
 const end=useRef(null),sending=useRef(false),subject=subjects.find(s=>s.id===selected),steps=subject.steps,done=progress[selected]||[],chat=messages.filter(m=>m.subject===selected);
 const state={selected,progress,saved,goal};
 useEffect(()=>{const failure=loginCallbackError(window.location.href);if(failure){window.history.replaceState(null,'',failure.url);setNotice(failure.message);setAccountOpen(true)}},[]);
 useEffect(()=>{if(!supabase)return;let active=true,revision=0,currentId=null;
  supabase.auth.getSession().then(({data,error})=>{if(!active||revision)return;const u=realUser(data.session);currentId=u?.id||null;setAccountUser(u);setAccountLoading(false);if(error)setNotice('로그인 상태를 확인하지 못했습니다. 다시 로그인해 주세요.')}).catch(()=>{if(active&&!revision){setAccountLoading(false);setNotice('로그인 상태를 확인하지 못했습니다.')}});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,s)=>{if(!active)return;revision++;const u=realUser(s);if(event==='SIGNED_OUT'||currentId&&currentId!==u?.id)newConversation();currentId=u?.id||null;setAccountUser(u);setAccountLoading(false)});
  return()=>{active=false;subscription.unsubscribe()};
 },[]);
 useEffect(()=>{if(!persistState(state))setNotice('학습 설정을 브라우저에 저장하지 못했습니다.')},[selected,progress,saved,goal]);
 async function refreshConnection(){const res=await fetch('/api/config',{cache:'no-store'});if(!res.ok)return;const v=await res.json();setConnection(v);if(v.error)setNotice(v.error);setLive(v.enabled===true&&(v.authMode==='turnstile'?true:v.authMode==='access-code'?v.authenticated:!!supabase))}
 useEffect(()=>{refreshConnection().catch(()=>{});},[]);
 async function unlock(event){event.preventDefault();if(accessBusy)return;setAccessBusy(true);try{const res=await fetch('/api/access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:accessCode})});const data=await res.json();if(!res.ok)throw new Error(data.error);setAccessCode('');await refreshConnection();setNotice('AI 채팅 접속을 허용했습니다.')}catch(e){setNotice(e.message||'접속을 확인해 주세요.')}finally{setAccessBusy(false)}}
 async function lockChat(){await fetch('/api/access',{method:'DELETE'});await refreshConnection()}
 async function checkConnection(){if(!verificationToken||checkingConnection)return;setCheckingConnection(true);setConnectionCheck('');try{const res=await fetch('/api/models',{method:'POST',headers:{'X-StudyAI-Turnstile':verificationToken}});const data=await res.json();if(!res.ok)throw new Error(data.error);setConnectionHealth('verified');setConnectionCheck(`연결 확인 완료 · ${data.model} · 답변 생성 없음`)}catch(e){setConnectionHealth('error');setConnectionCheck(e.message||'연결을 확인해 주세요.')}finally{setVerificationToken('');setVerificationReset(n=>n+1);setCheckingConnection(false)}}

 useEffect(()=>{if(notice){const t=setTimeout(()=>setNotice(''),5000);return()=>clearTimeout(t)}},[notice]);
 useEffect(()=>{if(page==='coach')end.current?.scrollIntoView({behavior:'smooth',block:'nearest'})},[messages,busy,page]);
 function go(p){if(p==='roadmap')setRoadmapVisited(true);setPage(p)}
 function newConversation(){
  conversationVersion.current+=1;chatRequest.current?.abort();chatRequest.current=null;
  sending.current=false;fileReadingRef.current=false;fileSessions.current.clear();
  setMessages([]);setLevel({});setInput('');setAttachments([]);setPreviewFile(null);setBusy(false);setFileReading(false);setNotice('');setModal(false);
  if(fileInput.current)fileInput.current.value='';
  setVerificationToken('');setVerificationReset(n=>n+1);setPage('coach');
  window.scrollTo(0,0);
 }
 useEffect(()=>{
  const leave=()=>newConversation();const restore=event=>{if(event.persisted)newConversation()};
  window.addEventListener('pagehide',leave);window.addEventListener('pageshow',restore);
  return()=>{window.removeEventListener('pagehide',leave);window.removeEventListener('pageshow',restore);chatRequest.current?.abort()};
 },[]);
 function toggleStep(i){setProgress(p=>({...p,[selected]:(p[selected]||[]).includes(i)?p[selected].filter(x=>x!==i):[...(p[selected]||[]),i]}))}
 function toggleSave(id){setSaved(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id])}
 async function addFiles(event){
  const files=Array.from(event.target.files||[]);event.target.value='';
  if(!files.length || fileReadingRef.current || sending.current)return;
  const version=conversationVersion.current;fileReadingRef.current=true;setFileReading(true);
  try{const prepared=await prepareFiles(files,attachments);if(version===conversationVersion.current)setAttachments(prepared)}catch(e){if(version===conversationVersion.current)setNotice(e.message)}finally{if(version===conversationVersion.current){fileReadingRef.current=false;setFileReading(false)}}
 }
 async function send(text=input,confirmed=level[selected]){
  if(sending.current||fileReadingRef.current||(!text.trim()&&!attachments.length))return;
  if(connectionHealth==='error'){setNotice('설정에서 AI 연결을 다시 확인해 주세요.');return;}
  if(connection.enabled&&!live){setNotice('접속 암호를 먼저 입력해 주세요.');return;}
  if(live&&connection.authMode==='turnstile'&&!verificationToken){setNotice('사용자 확인 중입니다. 잠시 후 다시 시도해 주세요.');return;}
  const version=conversationVersion.current,controller=new AbortController();chatRequest.current=controller;
  const turnstileToken=verificationToken;
  const topic=subject,history=chat.slice(-8),files=attachments;
  const question=text.trim()||'첨부 자료의 핵심 내용을 설명하고, 이 과목을 공부할 순서를 제안해 줘.';
  sending.current=true;setBusy(true);setInput('');setAttachments([]);go('coach');
  const user={id:crypto.randomUUID(),role:'user',text:question,subject:topic.id,attachments:files.map(({id,name,size,mimeType})=>({id,name,size,mimeType}))};
  const previousFiles=fileSessions.current.get(topic.id);
  if(files.length)fileSessions.current.set(topic.id,{messageId:user.id,files});
  setMessages(m=>[...m,user].slice(-100));
  try{let answer;
   if(live){
    const currentFiles=fileSessions.current.get(topic.id);
    const payload=[...history,user].map(m=>({role:m.role,text:m.text,...(currentFiles?.messageId===m.id?{attachments:currentFiles.files.map(({name,size,mimeType,data})=>({name,size,mimeType,data}))}:{})}));
    const auth=connection.authMode==='supabase'?await session():null;const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth.access_token}`}:{ }),...(connection.authMode==='turnstile'?{'X-StudyAI-Turnstile':turnstileToken}:{})},body:JSON.stringify({subject:topic.name,level:confirmed||null,messages:payload}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(45000)])});
    const data=await res.json();if(!res.ok){if(res.status===401)await refreshConnection();throw new Error(data.error||'답변을 받지 못했어요. 잠시 후 다시 시도해 주세요.')}answer=data.reply;
   } else {
    await new Promise(r=>setTimeout(r,650));
    answer=files.length?`${files.map(f=>f.name).join(', ')} 파일 ${files.length}개를 첨부했어요.\n\n현재는 데모 모드라 파일 내용을 읽거나 분석하지 않았습니다. ChatKHU 연결 후 첨부한 강의 자료나 문제 사진을 바탕으로 설명과 학습 코칭을 받을 수 있어요.`:demoReply(topic,question,confirmed);
   }
   if(version!==conversationVersion.current)return;
   setMessages(m=>[...m,{id:crypto.randomUUID(),role:'assistant',text:answer,subject:topic.id}].slice(-100));
  }catch(e){
   if(version!==conversationVersion.current||controller.signal.aborted)return;
   if(files.length){setAttachments(files);if(previousFiles)fileSessions.current.set(topic.id,previousFiles);else fileSessions.current.delete(topic.id)}
   setNotice(e.name==='TimeoutError'?'응답 시간이 초과됐어요. 잠시 후 다시 시도해 주세요.':e.message);
  }finally{if(version===conversationVersion.current){chatRequest.current=null;if(connection.authMode==='turnstile'){setVerificationToken('');setVerificationReset(n=>n+1)}setBusy(false);sending.current=false}}
 }
 async function cloudAction(load=false){setCloudBusy(true);try{if(load){const d=await loadCloud();if(!d){setNotice('저장된 클라우드 기록이 없어요.');return}if(d.progress)setProgress(d.progress);if(Array.isArray(d.saved))setSaved(d.saved);if(typeof d.goal==='string')setGoal(d.goal);setNotice('클라우드 기록을 불러왔어요.')}else{await saveCloud(state);setNotice('Supabase에 학습 기록을 저장했어요.')}}catch{setNotice('클라우드 연결을 확인해 주세요. 소셜 로그인과 학습 기록 저장 설정을 확인해 주세요.')}finally{setCloudBusy(false)}}

 function ResourceCard({r}){return <article className="resource"><span className="resource-icon"><Play size={20}/></span><div className="resource-body"><small>{subjects.find(s=>s.id===r.subject).name} · {r.tag}</small><a href={r.url} target="_blank" rel="noreferrer" className="resource-title">{r.title}<ArrowUpRight size={16}/></a><span className="resource-source">YouTube 검색</span></div><button className={`icon-button ${saved.includes(r.id)?'bookmarked':''}`} aria-label={saved.includes(r.id)?`${r.title} 저장 취소`:`${r.title} 저장`} onClick={()=>toggleSave(r.id)}><Bookmark size={18} fill={saved.includes(r.id)?'currentColor':'none'}/></button></article>}
 function Composer(){return <form className="composer" onSubmit={e=>{e.preventDefault();send()}}>
  <input ref={fileInput} className="sr-only" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" multiple onChange={addFiles} disabled={busy||fileReading} tabIndex={-1} aria-label="첨부 파일 선택"/>
  {attachments.length>0&&<div className="attachment-list">{attachments.map(f=><div className="attachment-chip" key={f.id}><button type="button" className="attachment-open" onClick={()=>setPreviewFile(f)} aria-label={`${f.name} 미리보기`}>{f.mimeType.startsWith('image/')?<img src={`data:${f.mimeType};base64,${f.data}`} alt=""/>:<FileText size={23}/>}<span><strong>{f.name}</strong><small>{formatSize(f.size)}</small></span></button><button type="button" className="icon-button" disabled={busy||fileReading} aria-label={`${f.name} 첨부 취소`} onClick={()=>setAttachments(a=>a.filter(x=>x.id!==f.id))}><X size={14}/></button></div>)}</div>}
  <label htmlFor={'chat-question'} className="sr-only">학습 질문</label><textarea id={'chat-question'} value={input} onChange={e=>setInput(e.target.value)} maxLength={2000} placeholder={attachments.length?'첨부 자료에서 궁금한 점을 물어보세요.':'개념을 질문하거나 학습 계획을 요청하세요.'} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send()}}}/>
  <div className="composer-bottom"><div className="composer-tools"><button type="button" className="attach-button" onClick={()=>fileInput.current?.click()} disabled={busy||fileReading||attachments.length>=3} aria-label="PDF 또는 이미지 첨부"><Paperclip size={17}/><span>{fileReading?'읽는 중…':'파일 첨부'}</span></button><span>{subject.name} · {live?'ChatKHU':'데모'}</span></div><button className="send" disabled={(!input.trim()&&!attachments.length)||busy||fileReading||(connection.enabled&&!live)||(live&&connection.authMode==='turnstile'&&!verificationToken)||connectionHealth==='error'} aria-label="질문 보내기"><ArrowUp size={20}/></button></div>
  <p className="attachment-help">PDF · JPG · PNG / 파일당 2 MB / 최대 3개{live?' · 전송 시 ChatKHU에서 분석':''}</p>
 </form>}
 return <div className="app">
 <header className="topbar">
  <a className="brand" href="#" aria-label="StudyAI 새 대화 시작" title="새 대화 시작" onClick={e=>{e.preventDefault();newConversation()}}><span className="brand-icon"><BookOpen size={23}/></span>Study<span className="brand-ai">AI</span></a>
  <nav aria-label="주 메뉴">{navs.map(([id,label,I])=><button key={id} className={page===id?'active':''} aria-current={page===id?'page':undefined} onClick={()=>go(id)}><Icon name={I} size={17}/>{label}{id==='saved'&&saved.length>0&&<span className="count">{saved.length}</span>}</button>)}</nav>
  <div className="topbar-right"><button className="account-button" disabled={accountLoading} onClick={()=>setAccountOpen(true)}>{accountLoading?'확인 중…':accountUser?'내 계정':'로그인'}</button><span className="mode-label"><span className="status-dot"/>{live?(connectionHealth==='verified'?'AI 연결 확인됨':connectionHealth==='error'?'AI 연결 확인 필요':'ChatKHU 설정됨'):connection.enabled?'접속 암호 필요':'연결 설정 대기'}</span><button className={`icon-button settings-button ${page==='settings'?'active':''}`} onClick={()=>go('settings')} aria-label="설정"><Settings size={20}/></button></div>
 </header>
 <main className={page==='coach'?`chat-main ${chat.length?'has-messages':'is-empty'}`:page==='roadmap'?'content-main planner-main':'content-main'}>
 {page!=='coach'&&<div className="page-heading"><h1>{page==='learning'?'내 학습':page==='roadmap'?'전공 로드맵':page==='library'?'학습 자료':page==='saved'?'저장한 자료':'설정'}</h1></div>}
 {page==='coach'&&<section className="chat-workspace" aria-label="학습 채팅">
  <div className="chat-toolbar"><label className="subject-select">과목<select aria-label="학습 과목" value={selected} onChange={e=>{setSelected(e.target.value);setAttachments([])}} disabled={busy||fileReading}>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><button className="text-button" onClick={()=>go('roadmap')}><Route size={16}/>로드맵 보기<ArrowUpRight size={14}/></button></div>
  {chat.length===0?<div className="chat-intro"><span className="intro-icon"><Sparkles size={30}/></span><h1>무엇을 공부할까요?</h1><p>전공 개념 질문부터 자료 분석, 학습 계획까지.</p><div className="subject-tabs" aria-label="과목 선택">{subjects.map(s=><button key={s.id} className={selected===s.id?'selected':''} aria-pressed={selected===s.id} disabled={busy||fileReading} onClick={()=>{setSelected(s.id);setAttachments([])}}>{s.name}</button>)}</div></div>:<div className="chat-messages" role="log" aria-label="대화 내용" aria-live="polite">{chat.map(m=><div key={m.id} className={`message ${m.role}`}><span className="message-label">{m.role==='user'?'나':<><Sparkles size={15}/> StudyAI</>}</span><div>{m.attachments?.length>0&&<div className="sent-attachments">{m.attachments.map(f=>{const local=fileSessions.current.get(m.subject)?.files.find(x=>x.id===f.id);return <button key={f.id} type="button" className="sent-file" disabled={!local} onClick={()=>setPreviewFile(local)}><FileText size={17}/><span>{f.name}<small>{formatSize(f.size)} · {local?'파일 보기':'원본 재첨부 필요'}</small></span></button>})}</div>}{m.text}</div></div>)}{!level[selected]&&<div className="level-confirm"><p>현재 이해도</p>{['처음 배워요','기초는 알아요','문제에 적용하고 싶어요'].map(v=><button key={v} onClick={()=>{setLevel(l=>({...l,[selected]:v}));send(`현재 수준: ${v}. 이 수준에 맞게 학습 코칭을 해줘.`,v)}} disabled={busy||fileReading}>{v}</button>)}</div>}{busy&&<div className="thinking"><span/>답변 작성 중…</div>}<div ref={end}/></div>}
  <div className="composer-area">{connection.enabled&&connection.authMode==='turnstile'&&<ChatVerification siteKey={connection.siteKey} reset={verificationReset} onToken={setVerificationToken}/>}{connection.authMode==='access-code'&&!connection.authenticated&&<form className="access-form" onSubmit={unlock}><label htmlFor="chat-access">AI 채팅 접속 암호</label><div><input id="chat-access" type="password" autoComplete="current-password" value={accessCode} onChange={e=>setAccessCode(e.target.value)} maxLength={128} required placeholder="관리자에게 받은 접속 암호"/><button className="primary" disabled={accessBusy||!accessCode}>{accessBusy?'확인 중…':'접속'}</button></div><small>학교 크레딧 보호용 암호입니다. ChatKHU API 키를 입력하지 마세요.</small></form>}{Composer()}<p className="chat-disclaimer">{live?'AI 답변은 부정확할 수 있습니다. 중요한 내용은 교재와 확인하세요.':connection.enabled?'접속 암호 입력 후 실제 AI 채팅을 사용할 수 있습니다.':'연결 설정 대기 · 현재 예시 답변만 제공하며 첨부 파일은 분석하지 않습니다.'}</p></div>
  {chat.length===0&&<div className="quick-actions"><button disabled={busy||fileReading} onClick={()=>send(`${subject.lesson}을 쉽게 설명해 줘`)}><BookOpen size={19}/><span>개념 설명<small>{subject.lesson}</small></span><ArrowUpRight size={16}/></button><button disabled={busy||fileReading} onClick={()=>send(`${subject.name} 학습 로드맵을 만들어 줘`)}><Route size={19}/><span>학습 계획<small>단계별 공부 순서</small></span><ArrowUpRight size={16}/></button><button disabled={busy||fileReading} onClick={()=>fileInput.current?.click()}><Paperclip size={19}/><span>자료 질문<small>강의 PDF · 문제 사진</small></span><ArrowUpRight size={16}/></button></div>}
  {chat.length>0&&<div className="chat-links"><button className="text-button" onClick={()=>go('roadmap')}><Route size={15}/>학습 로드맵</button><button className="text-button" onClick={()=>{setFilter(selected);go('library')}}><Play size={15}/>관련 강의 찾기</button></div>}
 </section>}
 <div hidden={page!=='learning'}><LearningPanel active={page==='learning'} resetKey={conversationVersion.current}/></div>
 {roadmapVisited&&<div hidden={page!=='roadmap'}><Suspense fallback={<div className="empty-state">로드맵 편집기를 불러오는 중…</div>}><RoadmapPlanner userId={accountUser?.id}/></Suspense></div>}
 {(page==='library'||page==='saved')&&<><div className="library-toolbar"><div className="subject-tabs"><button className={filter==='all'?'selected':''} onClick={()=>setFilter('all')}>전체 과목</button>{subjects.map(s=><button key={s.id} className={filter===s.id?'selected':''} onClick={()=>setFilter(s.id)}>{s.name}</button>)}</div><label className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="자료 검색" aria-label="자료 검색"/></label></div><p className="resource-note">직접 재생하는 영상 목록이 아닌, 주제별 YouTube 강의 검색 모음입니다.</p><div className="resource-grid">{resources.filter(r=>(page!=='saved'||saved.includes(r.id))&&(filter==='all'||r.subject===filter)&&r.title.includes(query)).map(r=><ResourceCard key={r.id} r={r}/>)}</div>{!resources.some(r=>(page!=='saved'||saved.includes(r.id))&&(filter==='all'||r.subject===filter)&&r.title.includes(query))&&<div className="empty-state"><Bookmark size={35}/><h2>{page==='saved'?'아직 저장한 자료가 없어요':'검색 결과가 없어요'}</h2><p>다른 과목을 선택하거나 관심 있는 자료의 책갈피를 눌러보세요.</p><button className="primary" onClick={()=>{setFilter('all');setQuery('');go('library')}}>학습 자료 둘러보기 <ArrowRight size={16}/></button></div>}</>}
 {page==='settings'&&<div className="settings-grid"><section className="settings-card"><Target/><h2>나의 학습 목표</h2><p>{goal}</p><button className="primary" onClick={()=>{setGoalDraft(goal);setModal(true)}}>목표 수정하기</button></section><section className="settings-card"><Cloud/><h2>학습 기록 보관</h2><p>진도, 저장한 자료, 학습 목표만 브라우저에 저장합니다. 대화와 첨부 파일은 저장하지 않으며, 페이지를 나가거나 새로고침하면 초기화됩니다.</p><div className="connection-state">{profileSyncReady?'클라우드 학습 기록 설정됨':'클라우드 학습 기록 저장 준비 중'}</div><div className="button-row"><button className="primary" disabled={!accountUser||!profileSyncReady||cloudBusy} onClick={()=>cloudAction()}>클라우드에 저장</button><button className="secondary" disabled={!accountUser||!profileSyncReady||cloudBusy} onClick={()=>cloudAction(true)}>불러오기</button></div><small>학습 기록 저장은 별도 테이블 설정 후 사용할 수 있습니다. 대화와 첨부 파일은 동기화하지 않습니다.</small></section><section className="settings-card"><Sparkles/><h2>AI 연결 상태</h2><p>{live?'ChatKHU 서버 설정이 적용되었습니다. 아래 버튼으로 키와 모델 권한을 확인할 수 있습니다. 학교 크레딧이나 사용 한도 오류가 발생하면 요청을 중단합니다.':'지금은 데모 체험 모드입니다. ChatKHU 연결 전에는 예시 응답으로 화면 흐름을 확인할 수 있어요.'}</p><span className="pill">{live?(connectionHealth==='verified'?'AI 연결 확인됨':connectionHealth==='error'?'AI 연결 확인 필요':'ChatKHU 설정됨'):'외부 AI 호출 없음'}</span>{connection.enabled&&connection.authMode==='turnstile'&&<div className="connection-check"><ChatVerification siteKey={connection.siteKey} reset={verificationReset} onToken={setVerificationToken}/><button className="secondary" disabled={!verificationToken||checkingConnection} onClick={checkConnection}>{checkingConnection?'확인 중…':'AI 연결 확인'}</button><small role="status">{connectionCheck||'키와 모델 목록만 확인하며 답변을 생성하지 않습니다.'}</small></div>}{connection.authMode==='access-code'&&connection.authenticated&&<button className="secondary" onClick={lockChat}>AI 접속 잠그기</button>}</section></div>}

 </main>{accountOpen&&<AccountDialog user={accountUser} loading={accountLoading} onClose={()=>setAccountOpen(false)} onSignedOut={()=>newConversation()}/ >}{previewFile&&<FilePreview file={previewFile} onClose={()=>setPreviewFile(null)}/ >}{notice&&<div className="toast" role="status">{notice}<button className="icon-button" onClick={()=>setNotice('')} aria-label="알림 닫기"><X size={16}/></button></div>}{modal&&<div className="modal-backdrop" onClick={()=>setModal(false)}><form role="dialog" aria-modal="true" aria-labelledby="goal-title" className="modal" onClick={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();if(goalDraft.trim()){setGoal(goalDraft.trim());setModal(false);setNotice('새로운 학습 목표를 저장했어요.')}}}><button type="button" className="modal-close icon-button" onClick={()=>setModal(false)} aria-label="닫기"><X/></button><h2 id="goal-title">학습 목표 수정</h2><label htmlFor="goal">학습 목표</label><input id="goal" autoFocus value={goalDraft} onChange={e=>setGoalDraft(e.target.value)} maxLength={80} required onKeyDown={e=>{if(e.key==='Escape')setModal(false)}}/><button className="primary" type="submit">목표 저장하기 <Check size={17}/></button></form></div>}</div>
}
