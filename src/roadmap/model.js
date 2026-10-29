export const PLAN_VERSION=1;
export const courseKey=(catalog,course)=>`${catalog.id}:${course.id}`;
export function emptyPlan(catalog){return {version:PLAN_VERSION,catalogId:catalog.id,items:[],edges:[]}}
const text=(v,max=200)=>typeof v==='string'?v.trim().slice(0,max):'';
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const page=v=>Number.isInteger(v)&&v>0&&v<=1000?v:null;
export function validateCatalog(value){
 if(!value||!Array.isArray(value.courses)||value.courses.length>1000||!text(value.id))throw new Error('교육과정 자료 형식을 확인해 주세요.');
 const ids=new Set(),codes=new Set();
 const courses=value.courses.map(c=>{
  if(!c||!text(c.id)||ids.has(text(c.id))||!text(c.name)||!text(c.code))throw new Error('과목 ID·학수번호·과목명이 없거나 중복된 자료입니다.');
  if(codes.has(text(c.code,80)))throw new Error('같은 교육과정에 중복된 학수번호가 있습니다.');
  ids.add(text(c.id));codes.add(text(c.code,80));
  return {id:text(c.id),code:text(c.code,80),name:text(c.name),credits:finite(c.credits)&&c.credits>=0&&c.credits<=30?c.credits:null,category:text(c.category,80)||'이수구분 미확인',recommendedSemester:Number.isInteger(c.recommendedSemester)&&c.recommendedSemester>=1&&c.recommendedSemester<=8?c.recommendedSemester:null,aliases:Array.isArray(c.aliases)?c.aliases.filter(a=>typeof a==='string').slice(0,20).map(a=>text(a)):[],note:text(c.note,2000),sourcePage:page(c.sourcePage),recommendedYears:(Array.isArray(c.recommendedYears)?c.recommendedYears:[]).filter(y=>Number.isInteger(y)&&y>=1&&y<=4),offeredSemesters:(Array.isArray(c.offeredSemesters)?c.offeredSemesters:[]).filter(s=>s===1||s===2)};
 });
 const tracks=(Array.isArray(value.tracks)?value.tracks:[]).slice(0,30).map(t=>({id:text(t.id),name:text(t.name),courseIds:(Array.isArray(t.courseIds)?t.courseIds:[]).filter(id=>ids.has(id)),note:text(t.note,1000),badgeName:text(t.badgeName),sourcePage:page(t.sourcePage)})).filter(t=>t.id&&t.name);
 const relations=(Array.isArray(value.relations)?value.relations:[]).slice(0,3000).filter(r=>ids.has(r.source)&&ids.has(r.target)&&r.source!==r.target&&['required','recommended'].includes(r.kind)).map(r=>({source:r.source,target:r.target,kind:r.kind,note:text(r.note,1000),groupId:text(r.groupId),anyOf:r.anyOf===true,sourcePage:page(r.sourcePage)}));
 let sourceUrl='';try{const u=new URL(value.sourceUrl);if(['https:','http:'].includes(u.protocol))sourceUrl=u.href}catch{}
 const prerequisiteGroups=Array.isArray(value.prerequisiteGroups)?value.prerequisiteGroups.map(g=>{
  if(!text(g.id)||!ids.has(g.target)||!Array.isArray(g.options)||!g.options.length||g.options.some(id=>!ids.has(id)||id===g.target))throw new Error('선수과목 택일 조건을 확인해 주세요.');
  return {id:text(g.id),target:g.target,options:[...new Set(g.options)],sourcePage:page(g.sourcePage)};
 }):relations.filter(r=>r.kind==='required').map((r,i)=>({id:`legacy-${i}`,target:r.target,options:[r.source],sourcePage:r.sourcePage}));
 const n=v=>finite(v)&&v>=0?v:null,req=value.requirements||{};
 return {id:text(value.id),university:text(value.university),department:text(value.department),curriculumYear:Number.isInteger(value.curriculumYear)?value.curriculumYear:null,sourceTitle:text(value.sourceTitle),sourceUrl,verified:value.verified===true,courses,tracks,relations,prerequisiteGroups,sourcePages:(Array.isArray(value.sourcePages)?value.sourcePages:[]).map(page).filter(Boolean),policyNotes:(Array.isArray(value.policyNotes)?value.policyNotes:[]).slice(0,15).map(v=>text(v,1000)),requirements:{singleMajor:{total:n(req.singleMajor?.total),basic:n(req.singleMajor?.basic),required:n(req.singleMajor?.required),elective:n(req.singleMajor?.elective)},graduationCredits:n(req.graduationCredits),englishCourses:n(req.englishCourses),softwareCredits:n(req.softwareCredits),note:text(req.note,1500)}};
}
export function validatePlan(value,catalog){
 if(value?.version!==PLAN_VERSION||value.catalogId!==catalog.id||!Array.isArray(value.items)||value.items.length>1000)throw new Error('현재 교육과정과 맞는 로드맵 파일을 선택해 주세요.');
 const known=new Set(catalog.courses.map(c=>c.id)),seen=new Set();
 const items=value.items.map(i=>{
  if(!i||!known.has(i.courseId)||seen.has(i.courseId)||!Number.isInteger(i.semester)||i.semester<1||i.semester>8)throw new Error('과목 또는 학기 정보가 올바르지 않습니다.');
  seen.add(i.courseId);const position=i.position&&finite(i.position.x)&&finite(i.position.y)&&Math.abs(i.position.x)<100000&&Math.abs(i.position.y)<100000?{x:i.position.x,y:i.position.y}:null;
  return {courseId:i.courseId,semester:i.semester,status:['planned','taking','done'].includes(i.status)?i.status:'planned',position};
 });
 const official=catalog.relations.filter(r=>seen.has(r.source)&&seen.has(r.target));
 const edges=[];for(const e of (Array.isArray(value.edges)?value.edges:[]).slice(0,3000))if(e&&seen.has(e.source)&&seen.has(e.target)&&canConnect([...official,...edges],e.source,e.target))edges.push({source:e.source,target:e.target});
 return {version:PLAN_VERSION,catalogId:catalog.id,items,edges};
}
export function canConnect(edges,source,target){
 if(!source||!target||source===target||edges.some(e=>e.source===source&&e.target===target))return false;
 const queue=[target],seen=new Set();while(queue.length){const id=queue.pop();if(id===source)return false;if(seen.has(id))continue;seen.add(id);for(const e of edges)if(e.source===id)queue.push(e.target)}return true;
}
export function addCourse(plan,course,semester=course.recommendedSemester||1){
 if(plan.items.some(i=>i.courseId===course.id))return plan;
 return {...plan,items:[...plan.items,{courseId:course.id,semester,status:'planned',position:null}]};
}
export function removeCourse(plan,id){return {...plan,items:plan.items.filter(i=>i.courseId!==id),edges:plan.edges.filter(e=>e.source!==id&&e.target!==id)}}
export function layoutItems(items){const counts={};return items.map(i=>({...i,position:{x:(i.semester-1)*290+25,y:75+(counts[i.semester]=(counts[i.semester]||0)+1)*145-145}}))}
export function planWarnings(plan,catalog){
 const byId=new Map(plan.items.map(i=>[i.courseId,i])),lookup=new Map(catalog.courses.map(c=>[c.id,c])),warnings=[];
 const groups=catalog.prerequisiteGroups||catalog.relations.filter(r=>r.kind==='required').map((r,i)=>({id:`legacy-${i}`,target:r.target,options:[r.source]}));
 for(const g of groups){const target=byId.get(g.target);if(!target)continue;
  const options=g.options.map(id=>byId.get(id)).filter(Boolean);
  if(options.some(i=>i.status==='done'||i.semester<target.semester))continue;
  const names=g.options.map(id=>lookup.get(id)?.name||id).join(' 또는 '),prefix=`${lookup.get(g.target)?.name||g.target}: `;
  warnings.push(prefix+(options.length?`선수과목을 이전 학기에 배치해 주세요: ${names}${g.options.length>1?' 중 하나':''}`:`선수과목 계획이 필요합니다: ${names}${g.options.length>1?' 중 하나':''}`));
 }
 for(const item of plan.items){const c=lookup.get(item.courseId),term=item.semester%2?1:2;if(c?.offeredSemesters?.length&&!c.offeredSemesters.includes(term))warnings.push(`${c.name}: 편성표는 ${c.offeredSemesters.join('·')}학기 개설입니다. 실제 시간표를 확인해 주세요.`)}
 return [...new Set(warnings)];
}
export function planTotals(plan,catalog){const lookup=new Map(catalog.courses.map(c=>[c.id,c])),credits=i=>lookup.get(i.courseId)?.credits||0;return {credits:plan.items.reduce((n,i)=>n+credits(i),0),doneCredits:plan.items.filter(i=>i.status==='done').reduce((n,i)=>n+credits(i),0),unknownCredits:plan.items.filter(i=>lookup.get(i.courseId)?.credits===null).length}}
export function storageKey(catalog,userId){return `studyai-roadmap-v1:${userId||'guest'}:${catalog.id}`}
export function loadPlan(catalog,userId,storage=globalThis.localStorage){try{const raw=storage.getItem(storageKey(catalog,userId));return raw?validatePlan(JSON.parse(raw),catalog):emptyPlan(catalog)}catch{return emptyPlan(catalog)}}
export function savePlan(plan,catalog,userId,storage=globalThis.localStorage){try{storage.setItem(storageKey(catalog,userId),JSON.stringify(validatePlan(plan,catalog)));return true}catch{return false}}
