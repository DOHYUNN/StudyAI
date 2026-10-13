export const MAX_FILES = 3;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_TOTAL_BYTES = MAX_FILES * MAX_FILE_BYTES;
export const MAX_REQUEST_BYTES = 9 * 1024 * 1024;
export const MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
export const formatSize = bytes => bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
export function detectMime(bytes) {
 if(bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff) return 'image/jpeg';
 if([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)) return 'image/png';
 // PDF headers can appear within the first 1024 bytes.
 const head=Array.from(bytes.slice(0,1024), b=>String.fromCharCode(b)).join('');
 if(head.includes('%PDF-')) return 'application/pdf';
 return null;
}
export function validName(name,mime) {
 return typeof name==='string' && name.length>0 && name.length<=200 && !/[\x00-\x1f]/.test(name) && ({'application/pdf':/\.pdf$/i,'image/jpeg':/\.jpe?g$/i,'image/png':/\.png$/i}[mime])?.test(name);
}
export function validAttachment(file) {
 if(!file || !MIME_TYPES.includes(file.mimeType) || !validName(file.name,file.mimeType) || !Number.isInteger(file.size) || file.size<=0 || file.size>MAX_FILE_BYTES || typeof file.data!=='string') return false;
 if(file.data.length!==4*Math.ceil(file.size/3) || !/^[A-Za-z0-9+/]*={0,2}$/.test(file.data)) return false;
 try {const decoded=atob(file.data);return decoded.length===file.size && detectMime(Uint8Array.from(decoded.slice(0,1024),c=>c.charCodeAt(0)))===file.mimeType;} catch {return false;}
}
export function validAttachments(files) {
 return Array.isArray(files) && files.length<=MAX_FILES && files.every(validAttachment) && files.reduce((n,f)=>n+f.size,0)<=MAX_TOTAL_BYTES;
}
export function toGeminiContents(messages) {
 return messages.map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.text},...(m.attachments||[]).map(f=>({inlineData:{mimeType:f.mimeType,data:f.data}}))]}));
}
