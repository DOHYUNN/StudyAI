import {preferencesOnly,readPreferences,persistPreferences} from './preferences';
import { createClient } from '@supabase/supabase-js';
import {requireAccount} from './social-auth';
export const supabase = import.meta.env.VITE_SUPABASE_URL && (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY) ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY,{auth:{flowType:'pkce',detectSessionInUrl:true}}) : null;
export const profileSyncReady=import.meta.env.VITE_PROFILE_SYNC_ENABLED==='true';
export const readState=readPreferences;
export const persistState=persistPreferences;
export async function session() { return requireAccount(supabase); }
export async function saveCloud(payload) { const s=await session(); const {error}=await supabase.from('study_profiles').upsert({user_id:s.user.id,payload:preferencesOnly(payload),updated_at:new Date().toISOString()}); if(error) throw error; }
export async function loadCloud() { const s=await session(); const {data,error}=await supabase.from('study_profiles').select('payload').eq('user_id',s.user.id).maybeSingle(); if(error) throw error; return data?.payload?preferencesOnly(data.payload):undefined; }
