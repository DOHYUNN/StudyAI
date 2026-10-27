export const statusLabels={submitted:'제출 완료',graded:'채점 완료',unsubmitted:'미제출',missing:'미제출 표시',excused:'면제',manual:'직접 확인',unknown:'상태 확인 필요'};
export const completed=a=>['submitted','graded','excused'].includes(a.status);
export const pending=a=>['unsubmitted','missing'].includes(a.status);
export function dueText(value){return value?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'long',day:'numeric',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value)):'마감일 미지정'}
export function deadlineLabel(a,now=Date.now()){
 if(!a.dueAt||completed(a))return null;const left=Date.parse(a.dueAt)-now;
 if(left<0)return '마감 지남';if(left<=24*60*60*1000)return '24시간 이내';if(left<=7*24*60*60*1000)return '7일 이내';return null;
}
export function visibleAssignments(items,{course='all',status='all',query='',sort='due'}={}){
 const q=query.trim().toLocaleLowerCase();
 return items.filter(a=>(course==='all'||a.courseId===course)&&(status==='all'||status==='pending'&&pending(a)||status==='complete'&&completed(a)||status==='check'&&!pending(a)&&!completed(a))&&(!q||`${a.name} ${a.courseName}`.toLocaleLowerCase().includes(q))).sort((a,b)=>{
  const av=a.dueAt?Date.parse(a.dueAt):null,bv=b.dueAt?Date.parse(b.dueAt):null;
  if(av===null&&bv!==null)return 1;if(bv===null&&av!==null)return -1;
  return (av!==null&&bv!==null?(sort==='recent'?bv-av:av-bv):0)||a.courseName.localeCompare(b.courseName,'ko')||a.name.localeCompare(b.name,'ko');
 });
}

// Calendar boundaries always follow the school's Asia/Seoul time zone.
export function schoolDate(value=new Date()){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));
 const get=t=>parts.find(p=>p.type===t).value;return `${get('year')}-${get('month')}-${get('day')}`;
}
export function shiftMonth(month,delta){const [y,m]=month.split('-').map(Number),d=new Date(Date.UTC(y,m-1+delta,1));return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`}
export function monthDays(month){
 const [y,m]=month.split('-').map(Number),first=new Date(Date.UTC(y,m-1,1)),offset=first.getUTCDay(),count=new Date(Date.UTC(y,m,0)).getUTCDate();
 return Array.from({length:Math.ceil((offset+count)/7)*7},(_,i)=>{const d=new Date(Date.UTC(y,m-1,1-offset+i));const key=d.toISOString().slice(0,10);return {key,day:d.getUTCDate(),inMonth:key.startsWith(month)}});
}
export function groupDeadlines(items){const groups={undated:[]};for(const a of items){const key=a.dueAt?schoolDate(a.dueAt):'undated';(groups[key]??=[]).push(a)}return groups}
