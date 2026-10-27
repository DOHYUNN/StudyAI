const key='studyai-v1';
// Conversations, understanding levels and attachments must never enter storage.
export function preferencesOnly(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return {};
 const result={};
 for(const field of ['selected','progress','saved','goal'])if(Object.hasOwn(value,field))result[field]=value[field];
 return result;
}
export function readPreferences(provided){
 try{
  const storage=provided||globalThis.localStorage;
  const raw=storage.getItem(key);if(!raw)return {};
  let value;try{value=JSON.parse(raw)}catch{storage.removeItem(key);return {}}
  const preferences=preferencesOnly(value);
  // Remove conversation data left by older versions as soon as this app loads.
  try{storage.setItem(key,JSON.stringify(preferences))}catch{}
  return preferences;
 }catch{return {}}
}
export function persistPreferences(value,provided){
 try{(provided||globalThis.localStorage).setItem(key,JSON.stringify(preferencesOnly(value)));return true}catch{return false}
}
