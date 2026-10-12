import { createClient } from '@supabase/supabase-js';
export const supabase = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY) : null;
export function readState() { try { const v=JSON.parse(localStorage.getItem('studyai-v1')); return v && typeof v==='object' && !Array.isArray(v) ? v : {}; } catch { return {}; } }
export async function session() { if(!supabase) throw new Error('Supabase 연결 정보가 필요합니다.'); const {data,error}=await supabase.auth.getSession(); if(error) throw error; if(data.session) return data.session; const result=await supabase.auth.signInAnonymously(); if(result.error) throw result.error; return result.data.session; }
export async function saveCloud(payload) { const s=await session(); const {error}=await supabase.from('study_profiles').upsert({user_id:s.user.id,payload,updated_at:new Date().toISOString()}); if(error) throw error; }
export async function loadCloud() { const s=await session(); const {data,error}=await supabase.from('study_profiles').select('payload').eq('user_id',s.user.id).maybeSingle(); if(error) throw error; return data?.payload; }
