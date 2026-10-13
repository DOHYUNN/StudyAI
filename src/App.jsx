import React, {useState,useEffect,useRef} from 'react';
import {BookOpen,MessageCircle,Route,Play,Bookmark,Settings,ArrowUpRight,ArrowRight,ArrowUp,Check,Sparkles,Target,X,Search,Cloud,Paperclip,FileText} from 'lucide-react';
import {subjects,resources,demoReply} from './data';
import {readState,supabase,session,saveCloud,loadCloud} from './storage';
import {prepareFiles} from './attachments';
import {formatSize} from '../shared/attachments';
const navs=[['coach','채팅',MessageCircle],['roadmap','로드맵',Route],['library','학습 자료',Play],['saved','저장한 자료',Bookmark]];
const initial=readState();
function FilePreview({file,onClose}){
 const [url,setUrl]=useState('');
 useEffect(()=>{if(!file?.data)return;const raw=atob(file.data),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));const u=URL.createObjectURL(new Blob([bytes],{type:file.mimeType}));setUrl(u);return()=>URL.revokeObjectURL(u)},[file]);
 useEffect(()=>{const close=e=>{if(e.key==='Escape')onClose()};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close)},[onClose]);
 return <div className="modal-backdrop" onClick={onClose}><section className="file-preview" role="dialog" aria-modal="true" aria-labelledby="file-preview-title" onClick={e=>e.stopPropagation()}><header><h2 id="file-preview-title">{file.name}</h2><button className="icon-button" onClick={onClose} aria-label="파일 미리보기 닫기"><X size={20}/></button></header><p>{formatSize(file.size)} · {file.mimeType==='application/pdf'?'PDF 문서':'이미지'}</p>{url&&(file.mimeType==='application/pdf'?<iframe src={url} title={`${file.name} 미리보기`}/>:<img src={url} alt={`${file.name} 첨부 미리보기`}/>)}<small>원본 파일은 이 페이지에서만 임시로 유지됩니다.</small></section></div>
}
function Icon({name:Comp,...props}) {return <Comp size={20} strokeWidth={1.7} {...props}/>}
export default function App(){
 const [page,setPage]=useState('coach'),[selected,setSelected]=useState(subjects.some(s=>s.id===initial.selected)?initial.selected:subjects[0].id);
 const [progress,setProgress]=useState(initial.progress||{}),[saved,setSaved]=useState(Array.isArray(initial.saved)?initial.saved.filter(id=>resources.some(r=>r.id===id)):[]),[goal,setGoal]=useState(initial.goal||'매일 20분 공부하기');
 const [messages,setMessages]=useState(Array.isArray(initial.messages)?initial.messages:[]),[level,setLevel]=useState(initial.level||{}),[input,setInput]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[modal,setModal]=useState(false),[goalDraft,setGoalDraft]=useState(''),[query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[live,setLive]=useState(false),[cloudBusy,setCloudBusy]=useState(false);
 const [attachments,setAttachments]=useState([]),[fileReading,setFileReading]=useState(false),[previewFile,setPreviewFile]=useState(null);
 const fileInput=useRef(null),fileReadingRef=useRef(false),fileSessions=useRef(new Map());
 const end=useRef(null),sending=useRef(false),subject=subjects.find(s=>s.id===selected),steps=subject.steps,done=progress[selected]||[],chat=messages.filter(m=>m.subject===selected);
 const state={selected,progress,saved,goal,messages,level};
 useEffect(()=>{try{localStorage.setItem('studyai-v1',JSON.stringify(state))}catch{setNotice('브라우저 저장 공간이 부족해 변경 사항을 저장하지 못했어요.')}},[selected,progress,saved,goal,messages,level]);
 useEffect(()=>{fetch('/api/config').then(r=>r.ok?r.json():null).then(v=>setLive(v?.enabled===true)).catch(()=>{});},[]);
 useEffect(()=>{if(notice){const t=setTimeout(()=>setNotice(''),5000);return()=>clearTimeout(t)}},[notice]);
 useEffect(()=>{if(page==='coach')end.current?.scrollIntoView({behavior:'smooth',block:'nearest'})},[messages,busy,page]);
 function go(p){setPage(p)}
 function toggleStep(i){setProgress(p=>({...p,[selected]:(p[selected]||[]).includes(i)?p[selected].filter(x=>x!==i):[...(p[selected]||[]),i]}))}
 function toggleSave(id){setSaved(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id])}
 async function addFiles(event){
  const files=Array.from(event.target.files||[]);event.target.value='';
  if(!files.length || fileReadingRef.current || sending.current)return;
  fileReadingRef.current=true;setFileReading(true);
  try{setAttachments(await prepareFiles(files,attachments))}catch(e){setNotice(e.message)}finally{fileReadingRef.current=false;setFileReading(false)}
 }
 async function send(text=input,confirmed=level[selected]){
  if(sending.current||fileReadingRef.current||(!text.trim()&&!attachments.length))return;
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
    const auth=await session();const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${auth.access_token}`},body:JSON.stringify({subject:topic.name,level:confirmed||null,messages:payload}),signal:AbortSignal.timeout(45000)});
    const data=await res.json();if(!res.ok)throw new Error(data.error||'답변을 받지 못했어요. 잠시 후 다시 시도해 주세요.');answer=data.reply;
   } else {
    await new Promise(r=>setTimeout(r,650));
    answer=files.length?`${files.map(f=>f.name).join(', ')} 파일 ${files.length}개를 첨부했어요.\n\n현재는 데모 모드라 파일 내용을 읽거나 분석하지 않았습니다. Gemini 연결 후 첨부한 강의 자료나 문제 사진을 바탕으로 설명과 학습 코칭을 받을 수 있어요.`:demoReply(topic,question,confirmed);
   }
   setMessages(m=>[...m,{id:crypto.randomUUID(),role:'assistant',text:answer,subject:topic.id}].slice(-100));
  }catch(e){
   if(files.length){setAttachments(files);if(previousFiles)fileSessions.current.set(topic.id,previousFiles);else fileSessions.current.delete(topic.id)}
   setNotice(e.name==='TimeoutError'?'응답 시간이 초과됐어요. 잠시 후 다시 시도해 주세요.':e.message);
  }finally{setBusy(false);sending.current=false}
 }
 async function cloudAction(load=false){setCloudBusy(true);try{if(load){const d=await loadCloud();if(!d){setNotice('저장된 클라우드 기록이 없어요.');return}if(d.progress)setProgress(d.progress);if(Array.isArray(d.saved))setSaved(d.saved);if(typeof d.goal==='string')setGoal(d.goal);if(Array.isArray(d.messages))setMessages(d.messages);if(d.level)setLevel(d.level);setNotice('클라우드 기록을 불러왔어요.')}else{await saveCloud(state);setNotice('Supabase에 학습 기록을 저장했어요.')}}catch{setNotice('클라우드 연결을 확인해 주세요. Supabase 설정, 익명 로그인 및 테이블 준비가 필요해요.')}finally{setCloudBusy(false)}}

 function ResourceCard({r}){return <article className="resource"><span className="resource-icon"><Play size={20}/></span><div className="resource-body"><small>{subjects.find(s=>s.id===r.subject).name} · {r.tag}</small><a href={r.url} target="_blank" rel="noreferrer" className="resource-title">{r.title}<ArrowUpRight size={16}/></a><span className="resource-source">YouTube 검색</span></div><button className={`icon-button ${saved.includes(r.id)?'bookmarked':''}`} aria-label={saved.includes(r.id)?`${r.title} 저장 취소`:`${r.title} 저장`} onClick={()=>toggleSave(r.id)}><Bookmark size={18} fill={saved.includes(r.id)?'currentColor':'none'}/></button></article>}
 function Composer(){return <form className="composer" onSubmit={e=>{e.preventDefault();send()}}>
  <input ref={fileInput} className="sr-only" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" multiple onChange={addFiles} disabled={busy||fileReading} tabIndex={-1} aria-label="첨부 파일 선택"/>
  {attachments.length>0&&<div className="attachment-list">{attachments.map(f=><div className="attachment-chip" key={f.id}><button type="button" className="attachment-open" onClick={()=>setPreviewFile(f)} aria-label={`${f.name} 미리보기`}>{f.mimeType.startsWith('image/')?<img src={`data:${f.mimeType};base64,${f.data}`} alt=""/>:<FileText size={23}/>}<span><strong>{f.name}</strong><small>{formatSize(f.size)}</small></span></button><button type="button" className="icon-button" disabled={busy||fileReading} aria-label={`${f.name} 첨부 취소`} onClick={()=>setAttachments(a=>a.filter(x=>x.id!==f.id))}><X size={14}/></button></div>)}</div>}
  <label htmlFor={'chat-question'} className="sr-only">학습 질문</label><textarea id={'chat-question'} value={input} onChange={e=>setInput(e.target.value)} maxLength={2000} placeholder={attachments.length?'첨부 자료에서 궁금한 점을 물어보세요.':'개념을 질문하거나 학습 계획을 요청하세요.'} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send()}}}/>
  <div className="composer-bottom"><div className="composer-tools"><button type="button" className="attach-button" onClick={()=>fileInput.current?.click()} disabled={busy||fileReading||attachments.length>=3} aria-label="PDF 또는 이미지 첨부"><Paperclip size={17}/><span>{fileReading?'읽는 중…':'파일 첨부'}</span></button><span>{subject.name} · {live?'Gemini':'데모'}</span></div><button className="send" disabled={(!input.trim()&&!attachments.length)||busy||fileReading} aria-label="질문 보내기"><ArrowUp size={20}/></button></div>
  <p className="attachment-help">PDF · JPG · PNG / 파일당 2 MB / 최대 3개{live?' · 전송 시 Gemini에서 분석':''}</p>
 </form>}
 return <div className="app">
 <header className="topbar">
  <a className="brand" href="#" onClick={e=>{e.preventDefault();go('coach')}}><span className="brand-icon"><BookOpen size={23}/></span>Study<span className="brand-ai">AI</span></a>
  <nav aria-label="주 메뉴">{navs.map(([id,label,I])=><button key={id} className={page===id?'active':''} aria-current={page===id?'page':undefined} onClick={()=>go(id)}><Icon name={I} size={17}/>{label}{id==='saved'&&saved.length>0&&<span className="count">{saved.length}</span>}</button>)}</nav>
  <div className="topbar-right"><span className="mode-label"><span className="status-dot"/>{live?'AI 연결됨':'데모 모드'}</span><button className={`icon-button settings-button ${page==='settings'?'active':''}`} onClick={()=>go('settings')} aria-label="설정"><Settings size={20}/></button></div>
 </header>
 <main className={page==='coach'?`chat-main ${chat.length?'has-messages':'is-empty'}`:'content-main'}>
 {page!=='coach'&&<div className="page-heading"><h1>{page==='roadmap'?'학습 로드맵':page==='library'?'학습 자료':page==='saved'?'저장한 자료':'설정'}</h1></div>}
 {page==='coach'&&<section className="chat-workspace" aria-label="학습 채팅">
  <div className="chat-toolbar"><label className="subject-select">과목<select aria-label="학습 과목" value={selected} onChange={e=>{setSelected(e.target.value);setAttachments([])}} disabled={busy||fileReading}>{subjects.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><button className="text-button" onClick={()=>go('roadmap')}><Route size={16}/>로드맵 보기<ArrowUpRight size={14}/></button></div>
  {chat.length===0?<div className="chat-intro"><span className="intro-icon"><Sparkles size={30}/></span><h1>무엇을 공부할까요?</h1><p>전공 개념 질문부터 자료 분석, 학습 계획까지.</p><div className="subject-tabs" aria-label="과목 선택">{subjects.map(s=><button key={s.id} className={selected===s.id?'selected':''} aria-pressed={selected===s.id} disabled={busy||fileReading} onClick={()=>{setSelected(s.id);setAttachments([])}}>{s.name}</button>)}</div></div>:<div className="chat-messages" role="log" aria-label="대화 내용" aria-live="polite">{chat.map(m=><div key={m.id} className={`message ${m.role}`}><span className="message-label">{m.role==='user'?'나':<><Sparkles size={15}/> StudyAI</>}</span><div>{m.attachments?.length>0&&<div className="sent-attachments">{m.attachments.map(f=>{const local=fileSessions.current.get(m.subject)?.files.find(x=>x.id===f.id);return <button key={f.id} type="button" className="sent-file" disabled={!local} onClick={()=>setPreviewFile(local)}><FileText size={17}/><span>{f.name}<small>{formatSize(f.size)} · {local?'파일 보기':'원본 재첨부 필요'}</small></span></button>})}</div>}{m.text}</div></div>)}{!level[selected]&&<div className="level-confirm"><p>현재 이해도</p>{['처음 배워요','기초는 알아요','문제에 적용하고 싶어요'].map(v=><button key={v} onClick={()=>{setLevel(l=>({...l,[selected]:v}));send(`현재 수준: ${v}. 이 수준에 맞게 학습 코칭을 해줘.`,v)}} disabled={busy||fileReading}>{v}</button>)}</div>}{busy&&<div className="thinking"><span/>답변 작성 중…</div>}<div ref={end}/></div>}
  <div className="composer-area">{Composer()}<p className="chat-disclaimer">{live?'AI 답변은 부정확할 수 있습니다. 중요한 내용은 교재와 확인하세요.':'데모 모드 · 예시 답변만 제공하며, 첨부 파일은 분석하지 않습니다.'}</p></div>
  {chat.length===0&&<div className="quick-actions"><button disabled={busy||fileReading} onClick={()=>send(`${subject.lesson}을 쉽게 설명해 줘`)}><BookOpen size={19}/><span>개념 설명<small>{subject.lesson}</small></span><ArrowUpRight size={16}/></button><button disabled={busy||fileReading} onClick={()=>send(`${subject.name} 학습 로드맵을 만들어 줘`)}><Route size={19}/><span>학습 계획<small>단계별 공부 순서</small></span><ArrowUpRight size={16}/></button><button disabled={busy||fileReading} onClick={()=>fileInput.current?.click()}><Paperclip size={19}/><span>자료 질문<small>강의 PDF · 문제 사진</small></span><ArrowUpRight size={16}/></button></div>}
  {chat.length>0&&<div className="chat-links"><button className="text-button" onClick={()=>go('roadmap')}><Route size={15}/>학습 로드맵</button><button className="text-button" onClick={()=>{setFilter(selected);go('library')}}><Play size={15}/>관련 강의 찾기</button></div>}
 </section>}
 {page==='roadmap'&&<><div className="subject-tabs">{subjects.map(s=><button key={s.id} className={selected===s.id?'selected':''} onClick={()=>setSelected(s.id)}>{s.name}</button>)}</div><div className="roadmap-banner"><div><span className="eyebrow">MY LEARNING ROADMAP</span><h2>{subject.name}, 기초 학습 순서</h2><p>입문용 예시 계획입니다. AI 코치와 대화하며 자신에게 맞는 학습 순서를 찾아보세요.</p></div><div className="progress-ring" style={{'--progress':`${done.length*25}%`}}><span>{done.length*25}<small>%</small></span></div></div><div className="roadmap-list">{steps.map((s,i)=><article key={s} className={done.includes(i)?'finished':''}><button className="step-checkbox" aria-label={`${s} ${done.includes(i)?'완료 취소':'완료'}`} onClick={()=>toggleStep(i)}>{done.includes(i)?<Check size={20}/>:String(i+1).padStart(2,'0')}</button><div><span className="eyebrow">STEP 0{i+1} · {done.includes(i)?'학습 완료':'학습 전'}</span><h3>{s}</h3><p>개념을 살펴보고, 작은 예제를 풀고, 자신의 말로 설명해 보세요.</p></div><button className="text-button" onClick={()=>send(`${s} 학습을 도와줘`)}>채팅으로 질문 <ArrowUpRight size={16}/></button></article>)}</div></>}
 {(page==='library'||page==='saved')&&<><div className="library-toolbar"><div className="subject-tabs"><button className={filter==='all'?'selected':''} onClick={()=>setFilter('all')}>전체 과목</button>{subjects.map(s=><button key={s.id} className={filter===s.id?'selected':''} onClick={()=>setFilter(s.id)}>{s.name}</button>)}</div><label className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="자료 검색" aria-label="자료 검색"/></label></div><p className="resource-note">직접 재생하는 영상 목록이 아닌, 주제별 YouTube 강의 검색 모음입니다.</p><div className="resource-grid">{resources.filter(r=>(page!=='saved'||saved.includes(r.id))&&(filter==='all'||r.subject===filter)&&r.title.includes(query)).map(r=><ResourceCard key={r.id} r={r}/>)}</div>{!resources.some(r=>(page!=='saved'||saved.includes(r.id))&&(filter==='all'||r.subject===filter)&&r.title.includes(query))&&<div className="empty-state"><Bookmark size={35}/><h2>{page==='saved'?'아직 저장한 자료가 없어요':'검색 결과가 없어요'}</h2><p>다른 과목을 선택하거나 관심 있는 자료의 책갈피를 눌러보세요.</p><button className="primary" onClick={()=>{setFilter('all');setQuery('');go('library')}}>학습 자료 둘러보기 <ArrowRight size={16}/></button></div>}</>}
 {page==='settings'&&<div className="settings-grid"><section className="settings-card"><Target/><h2>나의 학습 목표</h2><p>{goal}</p><button className="primary" onClick={()=>{setGoalDraft(goal);setModal(true)}}>목표 수정하기</button></section><section className="settings-card"><Cloud/><h2>학습 기록 보관</h2><p>진도와 저장한 자료, 대화는 이 브라우저에 자동 저장됩니다. Supabase 연결 후에는 클라우드에 수동으로 보관할 수 있어요.</p><div className="connection-state">{supabase?'Supabase 연결 정보 설정됨':'Supabase 연결 준비 중'}</div><div className="button-row"><button className="primary" disabled={!supabase||cloudBusy} onClick={()=>cloudAction()}>클라우드에 저장</button><button className="secondary" disabled={!supabase||cloudBusy} onClick={()=>cloudAction(true)}>불러오기</button></div><small>익명 계정은 현재 브라우저에서 유지됩니다. 다른 기기와의 동기화는 정식 로그인 연동 후 지원됩니다.</small></section><section className="settings-card"><Sparkles/><h2>AI 연결 상태</h2><p>{live?'Gemini 연결이 활성화되어 있어요. 무료 한도에 도달하면 요청을 중단합니다.':'지금은 데모 체험 모드입니다. Gemini 연결 전에는 예시 응답으로 화면 흐름을 확인할 수 있어요.'}</p><span className="pill">{live?'AI 연결됨':'외부 AI 호출 없음'}</span></section></div>}

 </main>{previewFile&&<FilePreview file={previewFile} onClose={()=>setPreviewFile(null)}/ >}{notice&&<div className="toast" role="status">{notice}<button className="icon-button" onClick={()=>setNotice('')} aria-label="알림 닫기"><X size={16}/></button></div>}{modal&&<div className="modal-backdrop" onClick={()=>setModal(false)}><form role="dialog" aria-modal="true" aria-labelledby="goal-title" className="modal" onClick={e=>e.stopPropagation()} onSubmit={e=>{e.preventDefault();if(goalDraft.trim()){setGoal(goalDraft.trim());setModal(false);setNotice('새로운 학습 목표를 저장했어요.')}}}><button type="button" className="modal-close icon-button" onClick={()=>setModal(false)} aria-label="닫기"><X/></button><h2 id="goal-title">학습 목표 수정</h2><label htmlFor="goal">학습 목표</label><input id="goal" autoFocus value={goalDraft} onChange={e=>setGoalDraft(e.target.value)} maxLength={80} required onKeyDown={e=>{if(e.key==='Escape')setModal(false)}}/><button className="primary" type="submit">목표 저장하기 <Check size={17}/></button></form></div>}</div>
}
