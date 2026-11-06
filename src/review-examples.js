import {schoolDate} from './learning.js';
import {emptyPlan,layoutItems,loadPlan,storageKey,validatePlan} from './roadmap/model.js';

// Public, hand-written examples. Never derived from a user's account or saved data.
export function exampleRoadmap(catalog){
 const ids=['AMTH1009','APHY1000','APCH1131','MEC104','MEC102','MEC101','MEC105','MEC202','MEC210','MEC220','MEC204','MEC240','MEC230'];
 const courses=ids.map(id=>catalog.courses.find(c=>c.id===id)).filter(Boolean);
 return validatePlan({...emptyPlan(catalog),items:layoutItems(courses.map(c=>({courseId:c.id,semester:c.recommendedSemester||1,status:'planned'})))},catalog);
}
export function initialRoadmap(catalog,userId,storage=globalThis.localStorage){
 if(!userId){try{if(storage.getItem(storageKey(catalog,userId))===null)return exampleRoadmap(catalog)}catch{return exampleRoadmap(catalog)}}
 return loadPlan(catalog,userId,storage);
}
export function exampleSuggestion(catalog){
 const plan=exampleRoadmap(catalog);
 return {summary:'기능을 둘러보기 위한 사전 작성 예시입니다. AI가 현재 입력을 분석한 결과가 아닙니다. 기초 과목에서 전공 기초로 이어지는 계획을 적용한 뒤 직접 수정해 보세요.',courses:plan.items.filter(i=>i.semester<=2).map(({courseId,semester})=>({courseId,semester}))};
}
export function exampleLearning(now=new Date()){
 const today=schoolDate(now),date=(delta)=>{const d=new Date(`${today}T12:00:00+09:00`);d.setUTCDate(d.getUTCDate()+delta);return `${schoolDate(d)}T23:59:00+09:00`};
 const courses=[{id:'example-math',name:'미분적분학 (예시)'},{id:'example-physics',name:'일반 물리 (예시)'},{id:'example-engineering',name:'공학수학 (예시)'}];
 const specs=[['극한과 연속 연습문제',0,0,'unsubmitted'],['힘과 운동 문제 풀이',1,0,'submitted'],['미분방정식 학습 정리',2,3,'unsubmitted'],['도함수 응용 과제',0,-3,'graded'],['에너지 보존 예습',1,7,'unsubmitted']];
 return {example:true,courses,fetchedAt:now.toISOString(),warnings:[],assignments:specs.map(([name,index,day,status],i)=>({id:`example-${i}`,courseId:courses[index].id,courseName:courses[index].name,name,status,kind:'과제',dueAt:date(day),submittedAt:['submitted','graded'].includes(status)?date(day-1):null,description:'달력과 제출 상태를 확인하기 위한 가상 과제입니다. 실제 학교 과제나 제출 기록이 아닙니다.',late:false,locked:false}))};
}
