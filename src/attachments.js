import {MAX_FILES,MAX_FILE_BYTES,MAX_TOTAL_BYTES,detectMime,validName} from '../shared/attachments';
export async function prepareFiles(files, existing=[]) {
 if(existing.length+files.length>MAX_FILES)throw new Error('한 번에 최대 3개까지 첨부할 수 있어요.');
 if(files.some(f=>f.size===0||f.size>MAX_FILE_BYTES))throw new Error('비어 있지 않은 파일을 선택해 주세요. 파일당 최대 2 MB입니다.');
 if(existing.reduce((n,f)=>n+f.size,0)+files.reduce((n,f)=>n+f.size,0)>MAX_TOTAL_BYTES)throw new Error('첨부 파일은 합계 6 MB까지 보낼 수 있어요.');
 const prepared=[];
 for(const file of files){
  const bytes=new Uint8Array(await file.arrayBuffer());const mimeType=detectMime(bytes);
  if(!mimeType || !validName(file.name,mimeType) || file.type && file.type!==mimeType)throw new Error('PDF, JPG, PNG 형식의 올바른 파일만 첨부할 수 있어요.');
  const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(new Error('파일을 읽지 못했어요. 다시 선택해 주세요.'));reader.readAsDataURL(file)});
  prepared.push({id:crypto.randomUUID(),name:file.name,size:file.size,mimeType,data});
 }
 return [...existing,...prepared];
}
