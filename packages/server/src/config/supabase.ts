import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "./index";

let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabase) {
    if (!config.supabaseUrl || !config.supabaseServiceKey) {
      throw new Error("Supabase not configured");
    }
    supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
  }
  return supabase;
}
