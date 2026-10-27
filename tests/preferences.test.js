import test from 'node:test';
import assert from 'node:assert/strict';
import {readPreferences,persistPreferences,preferencesOnly} from '../src/preferences.js';
function memoryStorage(value){const data=new Map(value?[['studyai-v1',JSON.stringify(value)]]:[]);return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)}}
test('legacy browser state is migrated without restoring or retaining conversations',()=>{
 const storage=memoryStorage({selected:'physics',progress:{physics:[0]},messages:[{text:'private question',attachments:[{name:'private.pdf'}]}],level:{physics:'private level'},goal:'study',saved:['physics-0']});
 const state=readPreferences(storage);
 assert.deepEqual(state,{selected:'physics',progress:{physics:[0]},goal:'study',saved:['physics-0']});
 const persisted=storage.getItem('studyai-v1');assert.ok(!persisted.includes('private'));assert.deepEqual(JSON.parse(persisted),state);
});
test('accidentally passing a conversation into persistence cannot save it',()=>{
 const storage=memoryStorage();assert.equal(persistPreferences({messages:['secret'],attachments:['secret.pdf'],level:{physics:'beginner'},selected:'math',goal:'learn'},storage),true);
 assert.deepEqual(JSON.parse(storage.getItem('studyai-v1')),{selected:'math',goal:'learn'});
 assert.deepEqual(preferencesOnly({messages:['cloud transcript'],saved:['math-0']}),{saved:['math-0']});
});
test('blocked storage and malformed old state cannot prevent an empty conversation start',()=>{
 const blocked={getItem(){throw Error('denied')},setItem(){throw Error('denied')}};
 assert.deepEqual(readPreferences(blocked),{});assert.equal(persistPreferences({goal:'learn'},blocked),false);
 const storage=memoryStorage();storage.setItem('studyai-v1','broken data');assert.deepEqual(readPreferences(storage),{});assert.equal(storage.getItem('studyai-v1'),null);
});
