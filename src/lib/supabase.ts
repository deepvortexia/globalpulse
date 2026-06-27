import { createClient } from "@supabase/supabase-js";

// Supabase environment configuration. The URL and anon key are public (exposed
// to the browser via NEXT_PUBLIC_*); the service role key is server-only and
// must never be imported into client components.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.",
  );
}

// Anon client — safe for reads (respects row-level security). Use this in
// pages, server components, and any read path that serves the public site.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service-role client — bypasses row-level security. Use ONLY in trusted
// server contexts (cron jobs / API routes that write articles). Lazily
// constructed so importing this module on the client doesn't crash when the
// service role key is absent from the browser bundle.
export function getServiceRoleClient() {
  if (!supabaseServiceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY — required for server-side writes.",
    );
  }
  return createClient(supabaseUrl!, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
