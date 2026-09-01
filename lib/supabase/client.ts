/**
 * Shared Supabase Browser Client
 *
 * Provides a memoized Supabase client instance configured with environment
 * variables and auth header delegation for REST and Realtime channels.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPlannerScope } from "@/features/planner/lib/planner-scope";

let browserClient: SupabaseClient | null = null;

export function getClientAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("sam_auth_token");
}

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const plannerScope = getPlannerScope();

  if (!url || !anonKey) {
    return null;
  }

  return {
    url,
    anonKey,
    plannerScope,
  };
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (browserClient) {
    return browserClient;
  }

  const config = getSupabaseConfig();
  if (!config) {
    return null;
  }

  browserClient = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) => {
        const token = getClientAuthToken();
        const headers = new Headers(init?.headers);

        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }

        return fetch(input, {
          ...init,
          headers,
        });
      },
    },
  });

  const token = getClientAuthToken();
  if (token) {
    void browserClient.realtime.setAuth(token);
  }

  return browserClient;
}
