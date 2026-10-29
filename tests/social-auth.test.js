import test from 'node:test';
import assert from 'node:assert/strict';
import {configuredProviders,realUser,startSocialLogin,requireAccount,loginCallbackError} from '../src/social-auth.js';
test('social providers are explicitly enabled and duplicate or unsupported values are discarded',()=>{
 assert.deepEqual(configuredProviders('google, kakao,google,unknown'),['google']);assert.deepEqual(configuredProviders(),[]);
});
test('OAuth redirects only to the current site root and does not request extra scopes',async()=>{
 let args;const client={auth:{signInWithOAuth:async value=>{args=value;return {error:null}}}};
 await startSocialLogin(client,'google',['google'],'https://studyai-9ju.pages.dev/somewhere?next=https://evil.example');
 assert.deepEqual(args,{provider:'google',options:{redirectTo:'https://studyai-9ju.pages.dev/'}});
 await assert.rejects(startSocialLogin(client,'kakao',['google'],'https://studyai-9ju.pages.dev/'));
 await assert.rejects(startSocialLogin(client,'google',['google'],'http://unsafe.example'));
});
test('cloud records require a real signed-in account, never silently create an anonymous account',async()=>{
 assert.equal(realUser({user:{is_anonymous:true}}),null);
 const anon={auth:{getSession:async()=>({data:{session:{user:{id:'a',is_anonymous:true}}}})}};
 await assert.rejects(requireAccount(anon),/소셜 로그인/);
 await assert.rejects(requireAccount(null),/연결 설정/);
 const s={user:{id:'u',is_anonymous:false}};assert.equal(await requireAccount({auth:{getSession:async()=>({data:{session:s}})}}),s);
});

test('OAuth cancellation cleans only error fields and never reflects provider text',()=>{
 const r=loginCallbackError('https://studyai-9ju.pages.dev/?keep=1&error=access_denied&error_description=Untrusted');
 assert.equal(r.url,'https://studyai-9ju.pages.dev/?keep=1');assert.ok(!r.message.includes('Untrusted'));
 assert.equal(loginCallbackError('https://studyai-9ju.pages.dev/?code=keep-me'),null);
 const h=loginCallbackError('https://studyai-9ju.pages.dev/#error=denied&error_code=403');assert.equal(h.url,'https://studyai-9ju.pages.dev/');
});
