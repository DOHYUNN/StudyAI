import {chatkhuReady} from '../../shared/chatkhu.js';
export function onRequestGet({env}) {
 return Response.json({enabled:chatkhuReady(env),provider:'chatkhu'},{headers:{'Cache-Control':'no-store'}});
}
