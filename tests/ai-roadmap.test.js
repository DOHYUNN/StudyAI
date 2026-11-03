import test from 'node:test';
import assert from 'node:assert/strict';
import rawCatalog from '../src/roadmap/catalog.json' with {type:'json'};
import {validateCatalog,emptyPlan,addCourse,planTotals,planWarnings} from '../src/roadmap/model.js';
import {validateRoadmapProfile,validateRoadmapSuggestion,roadmapChecks,applyRoadmapSuggestion} from '../shared/ai-roadmap.js';
import {onRequestPost} from '../functions/api/roadmap.js';
import {createAccessCookie} from '../shared/access.js';
const catalog=validateCatalog(rawCatalog),lookup=id=>catalog.courses.find(c=>c.id===id);
const profile={catalogId:catalog.id,situation:'수학 기초부터 로봇 분야를 공부하고 싶어요.',startSemester:1,semesterCount:2,maxCredits:15,trackId:'',completedCourseIds:[]};
const suggestion={summary:'기초 수학을 먼저 익힌 뒤 공학수학으로 연결합니다.',courses:[{courseId:'AMTH1009',semester:1},{courseId:'APHY1000',semester:1},{courseId:'MEC102',semester:2}]};
const env={CHATKHU_CREDITS_CONFIRMED:'true',CHATKHU_API_KEY:'mock-roadmap-key',CHATKHU_MODEL:'gemini-test',STUDYAI_ACCESS_CODE:'mock-roadmap-access-code'};
const cookie=(await createAccessCookie(env.STUDYAI_ACCESS_CODE,'https://example.com')).split(';')[0];
const request=(body=profile,headers={})=>new Request('https://example.com/api/roadmap',{method:'POST',headers:{Origin:'https://example.com',Cookie:cookie,...headers},body:typeof body==='string'?body:JSON.stringify(body)});
const answer=(value=suggestion,finishReason='STOP')=>Response.json({candidates:[{finishReason,content:{parts:[{thought:true,text:'not a public answer'},{text:JSON.stringify(value)}]}}]});
test('AI profile bounds period, credits and situation and excludes unrelated private fields',()=>{
 assert.deepEqual(validateRoadmapProfile({...profile,messages:['private'],accessToken:'secret'},catalog),profile);
 for(const p of [{...profile,situation:'a'},{...profile,situation:'가'.repeat(801)},{...profile,startSemester:8,semesterCount:2},{...profile,maxCredits:25},{...profile,completedCourseIds:['invented']},{...profile,trackId:'invented'},{...profile,catalogId:'other'}])assert.throws(()=>validateRoadmapProfile(p,catalog));
});
test('AI proposals reject unknown/duplicate/completed courses, wrong semesters and excess credits',()=>{
 assert.deepEqual(validateRoadmapSuggestion(suggestion,profile,catalog),suggestion);
 for(const value of [{...suggestion,courses:[{courseId:'fake',semester:1}]},{...suggestion,courses:[suggestion.courses[0],suggestion.courses[0]]},{...suggestion,courses:[{courseId:'MEC102',semester:3}]},{...suggestion,courses:[]},{...suggestion,summary:'x'.repeat(701)}])assert.throws(()=>validateRoadmapSuggestion(value,profile,catalog));
 assert.throws(()=>validateRoadmapSuggestion(suggestion,{...profile,completedCourseIds:['AMTH1009']},catalog));assert.throws(()=>validateRoadmapSuggestion(suggestion,{...profile,maxCredits:3},catalog));
});
test('merging keeps existing placement and personal edges, while replacing requires an explicit mode',()=>{
 let plan=addCourse(addCourse(emptyPlan(catalog),lookup('AMTH1009'),1),lookup('APHY1000'),2);plan.items[0].position={x:25,y:173.5};plan.edges=[{source:'AMTH1009',target:'APHY1000'}];
 const before=structuredClone(plan),merged=applyRoadmapSuggestion(plan,suggestion,profile,catalog);
 assert.deepEqual(plan,before);assert.deepEqual(merged.items.find(i=>i.courseId==='AMTH1009').position,{x:25,y:173.5});assert.equal(merged.items.find(i=>i.courseId==='APHY1000').semester,2);assert.deepEqual(merged.edges,plan.edges);assert.equal(merged.items.length,3);
 const replaced=applyRoadmapSuggestion(plan,suggestion,profile,catalog,'replace');assert.equal(replaced.items.find(i=>i.courseId==='APHY1000').semester,1);assert.deepEqual(replaced.edges,[]);
});
test('selected completed courses are retained for prerequisites and counted once after save validation',()=>{
 const p={...profile,completedCourseIds:['AMTH1009']},draft={summary:'이미 이수한 미적분을 바탕으로 공학수학을 시작합니다.',courses:[{courseId:'MEC102',semester:2}]};
 const plan=addCourse(emptyPlan(catalog),lookup('AMTH1009'),1);plan.items[0].status='done';
 const applied=applyRoadmapSuggestion(plan,draft,p,catalog,'replace');assert.equal(planTotals(applied,catalog).doneCredits,3);assert.equal(planWarnings(applied,catalog).filter(w=>w.startsWith('공학수학1:')).length,0);assert.deepEqual(applied.completedCourseIds,['AMTH1009']);assert.deepEqual(roadmapChecks(draft,p,catalog),[]);
});
test('AI prerequisite checks support mandatory AND and alternate OR prerequisites without hard semester locks',()=>{
 const p={...profile,startSemester:3,semesterCount:3,completedCourseIds:['APCH1131']};
 const draft={summary:'열공학 기초',courses:[{courseId:'MEC220',semester:3},{courseId:'MEC273',semester:4},{courseId:'MEC321',semester:5}]};
 assert.deepEqual(roadmapChecks(draft,p,catalog).filter(c=>c.startsWith('열전달:')),[]);
 assert.ok(roadmapChecks({...draft,courses:draft.courses.slice(1)},p,catalog).some(c=>c.startsWith('열전달:')));
 assert.doesNotThrow(()=>validateRoadmapSuggestion({summary:'다른 학기로 자유롭게 배치',courses:[{courseId:'MEC102',semester:1}]},profile,catalog));
});
test('disabled, foreign-origin and unauthenticated requests never call a model',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('unexpected external call')};
 try{assert.equal((await onRequestPost({env:{},request:request()})).status,503);assert.equal((await onRequestPost({env,request:request(profile,{Origin:'https://other.com'})})).status,403);assert.equal((await onRequestPost({env,request:request(profile,{Cookie:''})})).status,401);assert.equal(calls,0)}finally{globalThis.fetch=original}
});
test('oversized and malformed requests stop before generation',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;throw Error('unexpected external call')};
 try{assert.equal((await onRequestPost({env,request:request('x'.repeat(12001))})).status,413);assert.equal((await onRequestPost({env,request:request('{')})).status,400);assert.equal((await onRequestPost({env,request:request({...profile,completedCourseIds:['FAKE']})})).status,400);assert.equal(calls,0)}finally{globalThis.fetch=original}
});
test('one authenticated request uses the configured token limit and returns only a validated proposal',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(url,options)=>{calls++;assert.match(url,/gemini-test:generateContent$/);const body=JSON.parse(options.body);assert.equal(body.generationConfig.maxOutputTokens,64);assert.equal(body.generationConfig.responseMimeType,'application/json');assert.equal(options.headers.Authorization,'Bearer mock-roadmap-key');assert.ok(body.systemInstruction.parts[0].text.includes('AMTH1009'));return answer()};
 try{const res=await onRequestPost({env:{...env,CHATKHU_MAX_OUTPUT_TOKENS:'64'},request:request()});assert.equal(res.status,200);const data=await res.json();assert.deepEqual(data.suggestion,suggestion);assert.equal(calls,1);assert.ok(!JSON.stringify(data).includes('mock-roadmap-key'));assert.ok(!JSON.stringify(data).includes('not a public answer'))}finally{globalThis.fetch=original}
});
test('quota and gateway errors never retry or fall back to another model',async()=>{
 const original=globalThis.fetch;
 try{for(const status of [402,429,401,403,500]){let calls=0;globalThis.fetch=async()=>{calls++;return new Response('',{status})};const res=await onRequestPost({env,request:request()});assert.equal(res.status,status===402||status===429?status:502);assert.equal(calls,1)}}finally{globalThis.fetch=original}
});
test('truncated, invalid and fabricated model answers cannot be applied',async()=>{
 const original=globalThis.fetch;
 try{for(const response of [()=>answer(suggestion,'MAX_TOKENS'),()=>answer({...suggestion,courses:[{courseId:'FAKE101',semester:1}]}),()=>Response.json({candidates:[{content:{parts:[{text:'not JSON'}]}}]})]){let calls=0;globalThis.fetch=async()=>{calls++;return response()};assert.equal((await onRequestPost({env,request:request()})).status,502);assert.equal(calls,1)}}finally{globalThis.fetch=original}
});
test('Turnstile validation is required before exactly one roadmap generation',async()=>{
 const original=globalThis.fetch,turnstile={...env,TURNSTILE_SITE_KEY:'mock-site',TURNSTILE_SECRET_KEY:'mock-secret'};let calls=[];
 try{globalThis.fetch=async(url)=>{calls.push(url);if(url.includes('siteverify'))return Response.json({success:true,hostname:'example.com',action:'studyai-chat'});return answer()};
 assert.equal((await onRequestPost({env:turnstile,request:request()})).status,401);assert.equal(calls.length,0);
 assert.equal((await onRequestPost({env:turnstile,request:request(profile,{'X-StudyAI-Turnstile':'mock-token'})})).status,200);assert.equal(calls.length,2);
 calls=[];globalThis.fetch=async(url)=>{calls.push(url);return Response.json({success:false})};assert.equal((await onRequestPost({env:turnstile,request:request(profile,{'X-StudyAI-Turnstile':'used-token'})})).status,401);assert.equal(calls.length,1);
 }finally{globalThis.fetch=original}
});
test('Supabase authentication rejects anonymous users before generation',async()=>{
 const original=globalThis.fetch;let calls=0;
 try{globalThis.fetch=async(url)=>{calls++;assert.match(url,/\/auth\/v1\/user$/);return Response.json({id:'anonymous',is_anonymous:true})};assert.equal((await onRequestPost({env:{CHATKHU_CREDITS_CONFIRMED:'true',CHATKHU_API_KEY:'mock',CHATKHU_MODEL:'gemini-test',SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'mock'},request:request(profile,{Authorization:'Bearer mock'})})).status,401);assert.equal(calls,1)}finally{globalThis.fetch=original}
});
