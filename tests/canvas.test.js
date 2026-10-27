import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanAssignment,canvasList,canvasSnapshot,plainDescription} from '../shared/canvas.js';
import {onRequestGet,onRequestPost} from '../functions/api/canvas.js';
import {visibleAssignments,deadlineLabel} from '../src/learning.js';
const c={id:'9',name:'테스트 과목'};
test('assignment statuses preserve missing, completed, manual and unknown; private submission fields excluded',()=>{
 const a=cleanAssignment({id:1,name:'A',description:'<script>secret()</script><p>Hello &amp; world</p>',submission_types:['online_upload'],submission:{workflow_state:'graded',missing:true,score:0,body:'private',user_id:123}},c);
 assert.equal(a.status,'missing');assert.equal(a.description,'Hello & world');assert.ok(!JSON.stringify(a).includes('private'));assert.ok(!('score'in a));
 assert.equal(cleanAssignment({id:2,submission:{workflow_state:'graded',submitted_at:'2026-10-01T00:00:00Z',late:true}},c).status,'graded');
 assert.equal(cleanAssignment({id:3,submission_types:['on_paper']},c).status,'manual');assert.equal(cleanAssignment({id:4},c).status,'unknown');
 assert.equal(plainDescription('&#x110000;'),'');
});
test('production never uses a shared token and rejects foreign origins',async()=>{
 const env={CANVAS_OWNER_ID:'42',CANVAS_ACCESS_TOKEN:'secret-shared-token'};
 const req=(origin)=>new Request('https://example.com/api/canvas',{method:'POST',headers:{Origin:origin}});
 assert.equal((await onRequestPost({request:req('https://other.com'),env})).status,403);
 assert.equal((await onRequestPost({request:req('https://example.com'),env})).status,401);
 const cfg=await onRequestGet({request:new Request('https://example.com/api/canvas'),env}).json();assert.equal(cfg.localConfigured,false);assert.ok(!JSON.stringify(cfg).includes('secret'));
});
test('pagination stays on school origin, uses GET, rejects credential-leaking links',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(url,opts)=>{calls++;assert.equal(new URL(url).hostname,'khcanvas.khu.ac.kr');assert.equal(opts.redirect,'manual');assert.equal(opts.headers.Authorization,'Bearer test-token');return Response.json([{id:calls}],{headers:calls===1?{Link:'<https://khcanvas.khu.ac.kr/api/v1/courses?page=2>; rel="next"'}:{}})};
 try{assert.equal((await canvasList('/api/v1/courses?per_page=100','test-token')).length,2);globalThis.fetch=async()=>Response.json([],{headers:{Link:'<https://evil.example/api/v1/courses>; rel="next"'}});await assert.rejects(canvasList('/api/v1/courses','test-token'),/주소/)}finally{globalThis.fetch=original}
});
test('owner mismatch stops before reading any courses',async()=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({id:'41'})};
 try{await assert.rejects(canvasSnapshot('test-token','42'),/본인/);assert.equal(calls,1)}finally{globalThis.fetch=original}
});
test('snapshot includes completed tasks and reports partial course failures',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async url=>{
 const p=new URL(url).pathname;
 if(p.endsWith('/profile'))return Response.json({id:'42',name:'private name'});
 if(p==='/api/v1/courses')return Response.json([{id:'9',name:'A',workflow_state:'available'},{id:'10',name:'B',workflow_state:'available'}]);
 if(p.includes('/10/'))return new Response('',{status:403});
 return Response.json([{id:'1',submission:{workflow_state:'submitted'}}]);
 };
 try{const result=await canvasSnapshot('test-token','42');assert.equal(result.assignments[0].status,'submitted');assert.equal(result.warnings.length,1);assert.ok(!JSON.stringify(result).includes('private name'))}finally{globalThis.fetch=original}
});
test('filters include done assignments and sort undated items last',()=>{
 const items=[{name:'a',courseId:'1',courseName:'A',status:'submitted',dueAt:null},{name:'b',courseId:'1',courseName:'A',status:'unsubmitted',dueAt:'2026-11-01T00:00:00Z'}];
 assert.equal(visibleAssignments(items)[0].name,'b');assert.equal(visibleAssignments(items,{status:'complete'}).length,1);assert.equal(visibleAssignments(items,{status:'pending',query:'b'}).length,1);assert.equal(deadlineLabel(items[0]),null);
});

test('calendar uses Seoul due dates across midnight and groups undated tasks',async()=>{
 const {schoolDate,groupDeadlines}=await import('../src/learning.js');
 assert.equal(schoolDate('2026-10-27T15:00:00Z'),'2026-10-28');
 assert.equal(schoolDate('2026-10-27T14:59:59Z'),'2026-10-27');
 const items=[{id:'a',dueAt:'2026-10-27T15:00:00Z'},{id:'b',dueAt:null}];
 const grouped=groupDeadlines(items);assert.equal(grouped['2026-10-28'][0].id,'a');assert.equal(grouped.undated[0].id,'b');
});
test('month grid handles leap years, week alignment and year rollover',async()=>{
 const {monthDays,shiftMonth}=await import('../src/learning.js');
 const feb=monthDays('2024-02');assert.equal(feb.filter(d=>d.inMonth).length,29);assert.equal(feb[0].key,'2024-01-28');assert.equal(feb.length%7,0);
 assert.equal(monthDays('2026-08').length,42);assert.equal(shiftMonth('2026-12',1),'2027-01');assert.equal(shiftMonth('2026-01',-1),'2025-12');
});
