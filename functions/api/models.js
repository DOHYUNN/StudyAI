import {authMode} from '../../shared/chatkhu.js';
import {hasAccess} from '../../shared/access.js';
import {availableModels} from '../../shared/models.js';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
// Read-only model metadata. Never calls generateContent.
export async function onRequestGet({request,env}){
 if(authMode(env)!=='access-code'||!await hasAccess(request,env.STUDYAI_ACCESS_CODE))return json({error:'접속 암호를 먼저 입력해 주세요.'},401);
 if(!env.CHATKHU_API_KEY)return json({error:'ChatKHU API 키 설정이 필요합니다.'},503);
 try{return json({models:await availableModels(env)})}catch{return json({error:'모델 목록을 불러오지 못했습니다. 키 권한을 확인해 주세요.'},502)}
}
