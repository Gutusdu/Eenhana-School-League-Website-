import { createClient } from '@supabase/supabase-js';

// Publishable project configuration. These values are intended for browser use.
// Never place a Supabase secret/service_role key in this file.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://azssapwuqbncddhkzsmw.supabase.co';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Rlyhjk-hTm87b5B4cmt6fA_G0FUGWYM';

export const isConfigured = Boolean(url && key);
export const supabase = isConfigured ? createClient(url, key) : null;
