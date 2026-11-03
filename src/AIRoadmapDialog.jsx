import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Sparkles,X,LoaderCircle,Check} from 'lucide-react';
import ChatVerification from './ChatVerification';
import {session} from './storage';
import {validateRoadmapProfile,validateRoadmapSuggestion,roadmapChecks} from '../shared/ai-roadmap';
const semesterName=s=>`${Math.ceil(s/2)}학년 ${s%2?1:2}학기`;
export default function AIRoadmapDialog({catalog,plan,connection,userId,initialTrack,onClose,onApply}){
 const [situation,setSituation]=useState(''),[startSemester,setStartSemester]=useState(1),[semesterCount,setSemesterCount]=useState(2),[maxCredits,setMaxCredits]=useState(15),[trackId,setTrackId]=useState(initialTrack||'');
 const [completed,setCompleted]=useState(()=>[...new Set([...(plan.completedCourseIds||[]),...plan.items.filter(i=>i.status==='done').map(i=>i.courseId)])]),[courseQuery,setCourseQuery]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[result,setResult]=useState(null),[mode,setMode]=useState('merge');
 const [token,setToken]=useState(''),[reset,setReset]=useState(0);
 const panel=useRef(null),request=useRef(null),sending=useRef(false),alive=useRef(true),closeRef=useRef(onClose);closeRef.current=onClose;
 const lookup=useMemo(()=>new Map(catalog.courses.map(c=>[c.id,c])),[catalog]);
 useEffect(()=>{
  alive.current=true;const previous=document.activeElement;panel.current?.focus();
  const keyboard=e=>{if(e.key==='Escape'){e.preventDefault();closeRef.current();return}if(e.key!=='Tab')return;const items=[...panel.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary')].filter(e=>e.getClientRects().length);if(!items.length){e.preventDefault();return}const first=items[0],last=items.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===panel.current)){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}};
  const overflow=document.body.style.overflow;document.body.style.overflow='hidden';document.addEventListener('keydown',keyboard);
  return()=>{alive.current=false;request.current?.abort();document.body.style.overflow=overflow;document.removeEventListener('keydown',keyboard);previous?.focus?.()};
 },[]);
 const ready=connection?.enabled&&(connection.authMode==='turnstile'||connection.authMode==='access-code'&&connection.authenticated||connection.authMode==='supabase'&&userId);
 async function generate(e){
  e.preventDefault();if(sending.current||!ready)return;
  let profile;try{profile=validateRoadmapProfile({catalogId:catalog.id,situation,startSemester,semesterCount,maxCredits,trackId,completedCourseIds:completed},catalog)}catch(err){setError(err.message);return}
  if(connection.authMode==='turnstile'&&!token){setError('사용자 확인이 끝나면 생성할 수 있습니다.');return}
  sending.current=true;setBusy(true);setError('');const controller=new AbortController();request.current=controller;
  try{
   const auth=connection.authMode==='supabase'?await session():null;
   const res=await fetch('/api/roadmap',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth.access_token}`}:{ }),...(connection.authMode==='turnstile'?{'X-StudyAI-Turnstile':token}:{})},body:JSON.stringify(profile),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(45000)])});
   const data=await res.json();if(!res.ok)throw Error(data.error||'AI 초안을 생성하지 못했습니다.');
   const suggestion=validateRoadmapSuggestion(data.suggestion,profile,catalog);
   if(alive.current&&!controller.signal.aborted)setResult({suggestion,profile,checks:roadmapChecks(suggestion,profile,catalog)});
  }catch(err){if(alive.current&&!controller.signal.aborted)setError(err.name==='TimeoutError'?'생성 시간이 초과됐습니다. 자동으로 재시도하지 않습니다.':err instanceof SyntaxError?'서버 응답을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.':err.message)}
  finally{sending.current=false;if(alive.current){setBusy(false);setToken('');setReset(n=>n+1)}}
 }
 const q=courseQuery.trim().replace(/\s/g,'').toLowerCase();
 return <div className="modal-backdrop ai-roadmap-backdrop"><section className="ai-roadmap-dialog" role="dialog" aria-modal="true" aria-labelledby="ai-roadmap-title" ref={panel} tabIndex={-1}>
  <header><div><span className="ai-roadmap-kicker"><Sparkles size={15}/>학습 계획 초안</span><h2 id="ai-roadmap-title">AI 로드맵</h2><p>현재 상황에 맞는 과목과 순서를 제안받고, 직접 수정하세요.</p></div><button type="button" className="icon-button" aria-label="AI 로드맵 닫기" onClick={onClose}><X size={20}/></button></header>
  <form onSubmit={generate}>
   <fieldset disabled={busy||!!result} className="ai-roadmap-fields">
    <div className="ai-roadmap-input-row"><label>시작 학기<select value={startSemester} onChange={e=>{const start=Number(e.target.value);setStartSemester(start);setSemesterCount(n=>Math.min(n,9-start))}}>{Array.from({length:8},(_,i)=><option key={i+1} value={i+1}>{semesterName(i+1)}</option>)}</select></label><label>계획 기간<select value={semesterCount} onChange={e=>setSemesterCount(Number(e.target.value))}>{Array.from({length:9-startSemester},(_,i)=><option key={i+1} value={i+1}>앞으로 {i+1}학기</option>)}</select></label><label>학기당 목표 학점<input type="number" min="3" max="24" step="1" required value={maxCredits} onChange={e=>setMaxCredits(Number(e.target.value))}/></label></div>
    <label>관심 분야<select value={trackId} onChange={e=>setTrackId(e.target.value)}><option value="">아직 미정 · 기초부터</option>{catalog.tracks.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
    <label>현재 상황과 학습 목표<textarea value={situation} onChange={e=>setSituation(e.target.value)} minLength={5} maxLength={800} required rows={4} placeholder="예: 로봇 분야에 관심이 있어요. 수학 기초가 부족해서 기초부터 배우고 싶고, 아르바이트 때문에 학기당 15학점 정도로 계획하고 싶어요."/></label><span className="ai-roadmap-counter">{situation.length}/800</span>
    <details className="ai-completed"><summary>이미 이수한 과목 선택 · {completed.length}개</summary><input type="search" aria-label="이수한 과목 검색" value={courseQuery} onChange={e=>setCourseQuery(e.target.value)} placeholder="과목명 또는 학수번호 검색"/><div>{catalog.courses.filter(c=>!q||`${c.name}${c.code}`.replace(/\s/g,'').toLowerCase().includes(q)).map(c=><label key={c.id}><input type="checkbox" checked={completed.includes(c.id)} onChange={e=>setCompleted(ids=>e.target.checked?[...ids,c.id]:ids.filter(id=>id!==c.id))}/><span>{c.name}<small>{c.code}</small></span></label>)}</div></details>
   </fieldset>
   {!result&&<><p className="ai-roadmap-cost">입력한 상황과 선택한 이수 과목을 ChatKHU로 전송합니다. 한 번에 최대 24과목을 제안하며, 생성 버튼을 누를 때 학교 제공 크레딧을 사용합니다. 자동 재시도하지 않습니다.</p>{!ready&&<p className="ai-roadmap-help">{connection?.enabled?'채팅에서 AI 접속을 완료하거나 로그인한 뒤 다시 열어 주세요.':'ChatKHU 연결 설정을 확인한 뒤 이용해 주세요.'}</p>}{ready&&connection.authMode==='turnstile'&&<ChatVerification siteKey={connection.siteKey} reset={reset} onToken={setToken}/>}<button className="primary ai-generate" type="submit" disabled={!ready||busy||situation.trim().length<5||connection?.authMode==='turnstile'&&!token}>{busy?<><LoaderCircle size={16} className="ai-spinning"/>초안 만드는 중…</>:<><Sparkles size={16}/>AI 초안 생성</>}</button></>}
  </form>
  {error&&<p className="ai-roadmap-error" role="alert">{error}</p>}
  {result&&<section className="ai-roadmap-preview" aria-label="AI 로드맵 초안"><h3>AI가 제안한 학습 플랜</h3><p>{result.suggestion.summary}</p><div className="ai-semester-list">{[...new Set(result.suggestion.courses.map(c=>c.semester))].sort((a,b)=>a-b).map(semester=><section key={semester}><h4>{semesterName(semester)}<span>{result.suggestion.courses.filter(c=>c.semester===semester).reduce((n,c)=>n+(lookup.get(c.courseId).credits||0),0)}학점</span></h4><ul>{result.suggestion.courses.filter(c=>c.semester===semester).map(c=><li key={c.courseId}><span>{lookup.get(c.courseId).name}<small>{c.courseId}</small></span><span>{lookup.get(c.courseId).credits}학점</span></li>)}</ul></section>)}</div>
   {result.checks.length>0&&<details className="ai-prerequisite-checks"><summary>선수과목 참고 사항 · {result.checks.length}개</summary>{result.checks.map(check=><p key={check}>{check}</p>)}</details>}
   {plan.items.length>0&&<fieldset className="ai-apply-mode"><legend>적용 방식</legend><label><input type="radio" name="ai-apply-mode" value="merge" checked={mode==='merge'} onChange={()=>setMode('merge')}/>기존 과목·위치를 유지하고 새 과목 추가</label><label><input type="radio" name="ai-apply-mode" value="replace" checked={mode==='replace'} onChange={()=>setMode('replace')}/>AI 초안으로 다시 구성</label></fieldset>}
   <p className="ai-roadmap-help">{plan.items.length&&mode==='merge'?'이미 있는 과목은 기존 학기와 위치를 유지합니다. ':''}초안을 적용한 뒤 카드를 옮기거나 제거할 수 있습니다. 실제 개설 시간표와 이수 기준은 별도로 확인해 주세요.</p>
   <footer><button type="button" className="secondary" onClick={()=>{setResult(null);setError('')}}>조건 수정</button><button type="button" className="primary" onClick={()=>{try{onApply(result.suggestion,result.profile,mode)}catch(err){setError(err.message)}}}><Check size={16}/>로드맵에 적용</button></footer>
  </section>}
 </section></div>;
}
