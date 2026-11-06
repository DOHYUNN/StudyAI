import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {exampleRoadmap,initialRoadmap,exampleSuggestion,exampleLearning} from '../src/review-examples.js';
import {validateCatalog,emptyPlan,storageKey} from '../src/roadmap/model.js';
import {validateRoadmapProfile,validateRoadmapSuggestion} from '../shared/ai-roadmap.js';
import {schoolDate,groupDeadlines,visibleAssignments} from '../src/learning.js';
const catalog=validateCatalog(JSON.parse(readFileSync(new URL('../src/roadmap/catalog.json',import.meta.url))));
test('first guest sees public curriculum example without replacing saved or account plans',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key)??null};
 assert.ok(initialRoadmap(catalog,null,storage).items.length>0);
 assert.deepEqual(initialRoadmap(catalog,'account',storage),emptyPlan(catalog));
 values.set(storageKey(catalog,null),JSON.stringify(emptyPlan(catalog)));
 assert.deepEqual(initialRoadmap(catalog,null,storage),emptyPlan(catalog));
 const existing=exampleRoadmap(catalog);existing.items[0].position.y=321;
 values.set(storageKey(catalog,null),JSON.stringify(existing));
 assert.equal(initialRoadmap(catalog,null,storage).items[0].position.y,321);
});
test('public draft is valid real curriculum data and explicitly not generated',()=>{
 const profile=validateRoadmapProfile({catalogId:catalog.id,situation:'공개 체험용 학습 계획',startSemester:1,semesterCount:2,maxCredits:15,trackId:'',completedCourseIds:[]},catalog);
 const sample=validateRoadmapSuggestion(exampleSuggestion(catalog),profile,catalog);
 assert.match(sample.summary,/AI가 현재 입력을 분석한 결과가 아닙니다/);
 assert.ok(sample.courses.length>0);
});
test('calendar examples are timezone-correct synthetic data with no personal URLs or credentials',()=>{
 const now=new Date('2026-11-06T16:00:00Z'),sample=exampleLearning(now);
 assert.equal(sample.example,true);
 assert.equal(groupDeadlines(sample.assignments)[schoolDate(now)].length,2);
 assert.ok(visibleAssignments(sample.assignments,{status:'complete'}).length>0);
 assert.ok(visibleAssignments(sample.assignments,{status:'pending'}).length>0);
 for(const a of sample.assignments){assert.match(a.id,/^example-/);assert.match(a.description,/가상 과제/);assert.equal(a.url,undefined)}
 assert.doesNotMatch(JSON.stringify(sample),/Bearer|access_token|user_id|@/);
});
