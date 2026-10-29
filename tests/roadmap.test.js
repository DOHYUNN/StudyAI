import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCatalog,emptyPlan,validatePlan,addCourse,removeCourse,layoutItems,canConnect,planWarnings,planTotals,savePlan,loadPlan,storageKey} from '../src/roadmap/model.js';
const catalog=validateCatalog({id:'uni-me-2026',university:'테스트 대학',department:'기계공학과',curriculumYear:2026,courses:[{id:'a',code:'C101',name:'일반화학',credits:3},{id:'b',code:'C201',name:'일반화학',credits:3},{id:'m',code:'M101',name:'공학수학',credits:null}],relations:[{source:'a',target:'b',kind:'required'}]});
test('same course names remain distinct by course ID and code; duplicates are rejected',()=>{
 let p=emptyPlan(catalog);p=addCourse(p,catalog.courses[0]);p=addCourse(p,catalog.courses[1]);p=addCourse(p,catalog.courses[0]);assert.equal(p.items.length,2);
 assert.throws(()=>validateCatalog({...catalog,courses:[...catalog.courses,{id:'other',name:'A',code:'C101 '}]}));
 assert.throws(()=>validateCatalog({...catalog,courses:[...catalog.courses,{id:'a ',name:'A',code:'XX'}]}));
});
test('personal connections reject cycles, self-links and duplicates including existing prerequisite edges',()=>{
 const edges=[{source:'a',target:'b'},{source:'b',target:'c'}];assert.equal(canConnect(edges,'c','a'),false);assert.equal(canConnect(edges,'a','a'),false);assert.equal(canConnect(edges,'a','b'),false);assert.equal(canConnect(edges,'a','c'),true);
});
test('prerequisite warnings distinguish missing and late prerequisites; completed prerequisites are accepted',()=>{
 let p=addCourse(emptyPlan(catalog),catalog.courses[1],2);assert.equal(planWarnings(p,catalog).length,1);
 p=addCourse(p,catalog.courses[0],3);assert.equal(planWarnings(p,catalog).length,1);p.items[1].status='done';assert.deepEqual(planWarnings(p,catalog),[]);
});
test('import validates curriculum version, course identity, semester, and strips unrelated payload',()=>{
 const p=addCourse(emptyPlan(catalog),catalog.courses[0],1);assert.throws(()=>validatePlan({...p,catalogId:'other-major'},catalog));assert.throws(()=>validatePlan({...p,items:[{courseId:'foreign',semester:1}]},catalog));assert.throws(()=>validatePlan({...p,items:[{courseId:'a',semester:9}]},catalog));
 const clean=validatePlan({...p,messages:['private'],accessToken:'secret',items:[{...p.items[0],position:{x:Infinity,y:1}}]},catalog);assert.ok(!('messages'in clean));assert.ok(!('accessToken'in clean));assert.equal(clean.items[0].position,null);
});
test('account and curriculum-specific local plans reload safely and remove connected edges',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 let p=addCourse(addCourse(emptyPlan(catalog),catalog.courses[0],1),catalog.courses[1],2);p.edges=[{source:'a',target:'b'}];assert.ok(savePlan(p,catalog,'user-a',storage));assert.equal(loadPlan(catalog,'user-a',storage).items.length,2);assert.equal(loadPlan(catalog,'user-b',storage).items.length,0);
 assert.notEqual(storageKey(catalog,'user-a'),storageKey({...catalog,id:'2025'},'user-a'));assert.equal(removeCourse(p,'a').edges.length,0);
});
test('layout follows assigned semesters and unknown credits are explicit',()=>{
 let p=addCourse(addCourse(emptyPlan(catalog),catalog.courses[0],1),catalog.courses[2],4);const items=layoutItems(p.items);assert.ok(items[1].position.x>items[0].position.x);assert.equal(planTotals(p,catalog).credits,3);assert.equal(planTotals(p,catalog).unknownCredits,1);
});

import {readFileSync} from 'node:fs';
const mechanical=validateCatalog(JSON.parse(readFileSync(new URL('../src/roadmap/catalog.json',import.meta.url),'utf8')));
const byCode=code=>mechanical.courses.find(c=>c.code===code);
function actualPlan(entries){let p=emptyPlan(mechanical);for(const [code,semester,status='planned']of entries){p=addCourse(p,byCode(code),semester);p.items.at(-1).status=status}return p}
test('2026 PDF catalog has exact code identities, zero-credit requirements and fourteen source modules',()=>{
 assert.equal(mechanical.courses.length,67);assert.equal(mechanical.tracks.length,14);assert.equal(mechanical.prerequisiteGroups.length,40);assert.equal(mechanical.relations.length,46);
 assert.equal(byCode('APCH1131').name,'일반화학');assert.equal(byCode('APHY1000').name,'물리학1');assert.equal(byCode('MEC100').credits,0);assert.deepEqual(byCode('MEC102').offeredSemesters,[2]);
 assert.equal(mechanical.courses.filter(c=>c.category==='전공기초').reduce((n,c)=>n+c.credits,0),18);assert.equal(mechanical.courses.filter(c=>c.category==='전공필수').reduce((n,c)=>n+c.credits,0),9);
 assert.equal(byCode('MEC370').category,'졸업논문 선수 택1');assert.ok(!byCode('IE215'));assert.equal(mechanical.tracks.find(t=>t.name==='로봇공학').courseIds.length,3);
});
test('heat transfer requires thermodynamics AND one fluid/aerodynamics option, never both alternatives',()=>{
 let p=actualPlan([['MEC321',5],['MEC220',3],['MEC230',4],['APCH1131',1]]);
 assert.equal(planWarnings(p,mechanical).filter(w=>w.startsWith('열전달:')).length,0);
 p=actualPlan([['MEC321',5],['MEC220',3],['MEC273',3],['APCH1131',1]]);assert.equal(planWarnings(p,mechanical).filter(w=>w.startsWith('열전달:')).length,0);
 p=actualPlan([['MEC321',5],['MEC230',4]]);assert.ok(planWarnings(p,mechanical).some(w=>w.startsWith('열전달:')&&w.includes('열역학')));
 p=actualPlan([['MEC321',5],['MEC220',3],['MEC230',6]]);assert.ok(planWarnings(p,mechanical).some(w=>w.startsWith('열전달:')&&w.includes('이전 학기')));
});
test('graduation-paper prerequisite experiment is an alternative; both capstones remain required',()=>{
 const p=actualPlan([['MEC400',8],['MEC370',5],['MEC305',5],['MEC405',7]]);
 assert.equal(planWarnings(p,mechanical).filter(w=>w.startsWith('졸업논문(기계공학):')).length,0);
 const missing=removeCourse(p,'MEC405');assert.ok(planWarnings(missing,mechanical).some(w=>w.startsWith('졸업논문(기계공학):')&&w.includes('캡스톤디자인2')));
});
test('imported custom edges cannot reverse or duplicate official prerequisite links',()=>{
 const p=actualPlan([['AMTH1009',1],['MEC102',2]]);p.edges=[{source:'MEC102',target:'AMTH1009'},{source:'AMTH1009',target:'MEC102'}];assert.deepEqual(validatePlan(p,mechanical).edges,[]);
});
