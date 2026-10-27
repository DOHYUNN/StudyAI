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
