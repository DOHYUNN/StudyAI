export const CANVAS_ORIGIN='https://khcanvas.khu.ac.kr';
export class CanvasError extends Error{constructor(message,status=502){super(message);this.status=status}}
export function canvasToken(value){
 if(typeof value!=='string')return '';
 const token=value.trim().replace(/^Bearer\s+/i,'').trim();
 return token.length>=10&&token.length<=4096&&!/[\s\x00-\x1f]/.test(token)?token:'';
}
export function plainDescription(html){
 return String(html||'').slice(0,60000).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<(br\s*\/?|\/p|\/div|\/li|\/h[1-6])>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&#(x[0-9a-f]+|\d+);/gi,(_,v)=>{const n=v[0].toLowerCase()==='x'?parseInt(v.slice(1),16):Number(v);return n>0&&n<=0x10ffff?String.fromCodePoint(n):''}).replace(/\n[ \t]*\n(?:[ \t]*\n)+/g,'\n\n').trim().slice(0,12000);
}
const id=value=>/^\d+$/.test(String(value))?String(value):null;
export function cleanAssignment(a,course){
 const aid=id(a.id);if(!aid)return null;
 const s=a.submission&&typeof a.submission==='object'?a.submission:null;
 const submitted=!!s?.submitted_at||['submitted','pending_review'].includes(s?.workflow_state);
 const manual=(a.submission_types||[]).length>0&&(a.submission_types||[]).every(t=>['on_paper','none','not_graded'].includes(t));
 let status='unknown';
 if(s?.excused)status='excused';
 else if(s?.missing&&!submitted)status='missing';
 else if(s?.workflow_state==='graded')status='graded';
 else if(submitted)status='submitted';
 else if(manual)status='manual';
 else if(s?.workflow_state==='unsubmitted')status='unsubmitted';
 const date=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?value:null;
 return {id:aid,courseId:course.id,courseName:course.name,name:String(a.name||'이름 없는 과제').slice(0,300),description:plainDescription(a.description),dueAt:date(a.due_at),unlockAt:date(a.unlock_at),lockAt:date(a.lock_at),locked:a.locked_for_user===true,status,submittedAt:date(s?.submitted_at),late:s?.late===true,kind:(a.submission_types||[]).includes('online_quiz')?'퀴즈':'과제',url:`${CANVAS_ORIGIN}/courses/${course.id}/assignments/${aid}`};
}
function trustedUrl(url,expectedPath){
 const u=new URL(url,CANVAS_ORIGIN);
 if(u.origin!==CANVAS_ORIGIN||u.username||u.password||u.pathname!==expectedPath)throw new CanvasError('학교 서버의 페이지 연결 주소를 확인할 수 없습니다.');
 return u;
}
async function get(url,token,signal){
 const res=await fetch(url,{headers:{Authorization:`Bearer ${token}`,Accept:'application/json+canvas-string-ids','User-Agent':'StudyAI-ReadOnly/1.0'},redirect:'manual',signal});
 if(res.status===401)throw new CanvasError('LearningX 토큰이 만료됐거나 올바르지 않습니다. 다시 연결해 주세요.',401);
 if(res.status===403)throw new CanvasError('이 계정에 해당 학습 정보 조회 권한이 없습니다.',403);
 if(res.status===429)throw new CanvasError('학교 서버 요청 한도에 도달했습니다. 잠시 후 새로고침해 주세요.',429);
 if(!res.ok)throw new CanvasError('학교 서버에서 정보를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.');
 try{return {data:await res.json(),link:res.headers.get('Link')||''}}catch{throw new CanvasError('학교 서버의 응답 형식을 확인해 주세요.')}
}
export async function canvasList(path,token,signal){
 const expectedPath=new URL(path,CANVAS_ORIGIN).pathname;let url=trustedUrl(path,expectedPath),rows=[];
 for(let page=0;page<20;page++){
  const {data,link}=await get(url.href,token,signal);if(!Array.isArray(data))throw new CanvasError('학교 목록 응답을 읽지 못했습니다.');rows.push(...data);
  const next=link.split(',').map(part=>part.match(/<([^>]+)>\s*;\s*rel="next"/)).find(Boolean)?.[1];
  if(!next)return rows;url=trustedUrl(next,expectedPath);
 }
 throw new CanvasError('조회할 항목이 많아 전체 목록을 가져오지 못했습니다. 조회 범위를 확인해 주세요.',413);
}
export async function canvasSnapshot(token,ownerId,signal){
 const {data:profile}=await get(`${CANVAS_ORIGIN}/api/v1/users/self/profile`,token,signal);
 if(!id(profile?.id))throw new CanvasError('본인 계정을 확인할 수 없습니다.',401);
 if(ownerId&&String(profile.id)!==String(ownerId))throw new CanvasError('현재는 제작자 본인 계정의 개인 연동만 지원합니다.',403);
 const raw=await canvasList('/api/v1/courses?enrollment_type=student&enrollment_state=active&per_page=100',token,signal);
 const courses=raw.filter(c=>id(c.id)&&c.workflow_state==='available').map(c=>({id:id(c.id),name:String(c.name||'이름 없는 과목').slice(0,300)}));
 if(courses.length>30)throw new CanvasError('동시 조회 가능한 과목 수를 초과했습니다.',413);
 const assignments=[],warnings=[];let cursor=0;
 async function worker(){while(cursor<courses.length){const course=courses[cursor++];try{
  const rows=await canvasList(`/api/v1/courses/${course.id}/assignments?include%5B%5D=submission&per_page=100`,token,signal);
  assignments.push(...rows.map(a=>cleanAssignment(a,course)).filter(Boolean));
 }catch(e){if(e instanceof CanvasError&&[401,429].includes(e.status))throw e;warnings.push({courseId:course.id,courseName:course.name,message:e instanceof CanvasError?e.message:'과제 목록을 가져오지 못했습니다.'})}}}
 await Promise.all(Array.from({length:Math.min(2,courses.length)},worker));
 return {courses,assignments,warnings,fetchedAt:new Date().toISOString()};
}
