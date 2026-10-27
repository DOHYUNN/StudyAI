import {chatkhuReady,authMode} from '../../shared/chatkhu.js';
import {hasAccess} from '../../shared/access.js';
export async function onRequestGet({env,request}) {
 const mode=authMode(env);
 const authenticated=mode==='access-code'&&!!request&&await hasAccess(request,env.STUDYAI_ACCESS_CODE);
 return Response.json({enabled:chatkhuReady(env),provider:'chatkhu',authMode:mode,authenticated},{headers:{'Cache-Control':'no-store'}});
}
