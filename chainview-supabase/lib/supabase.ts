import { createClient } from "@supabase/supabase-js";
// Both values are public by design (URL + publishable key); row-level security protects the data.
// Defaults let the site work even if the Cloudflare environment variables were not set.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jwyvazdswiwbchbotgvc.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_A8ZJcWK-SrZ3tu_vWpmncw_OYyLyo-o";
export const supabase = createClient(url, key);
