"use client";

import { useState, useEffect, type ReactNode } from "react";

/**
 * Client-side authentication boundary that verifies the Supabase JWT in local
 * storage and either renders the planner app or shows the login form.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  /**
   * Returns whether the stored JWT is missing, malformed, or past its exp claim.
   */
  function isJwtExpired(token: string | null) {
    if (!token) return true;

    try {
      const parts = token.split(".");
      if (parts.length < 2) return true;
      const payload = JSON.parse(
        atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      if (!payload || typeof payload.exp !== "number") return true;
      const now = Math.floor(Date.now() / 1000);
      return payload.exp <= now;
    } catch {
      return true;
    }
  }

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    // This stays in an effect because the auth decision depends on
    // localStorage and must not diverge between server and client renders.
    const token = window.localStorage.getItem("sam_auth_token");

    if (!token) {
      setIsAuthenticated(false);
      setIsChecking(false);
      return;
    }

    if (isJwtExpired(token)) {
      // Token expired: clear and notify app to re-auth
      try {
        window.localStorage.removeItem("sam_auth_token");
        window.dispatchEvent(new CustomEvent("sam:auth:invalid"));
      } catch {
        // noop
      }

      setIsAuthenticated(false);
      setIsChecking(false);
      return;
    }

    setIsAuthenticated(true);
    setIsChecking(false);

    const handler = () => {
      setIsAuthenticated(false);
      setIsChecking(false);
    };

    window.addEventListener("sam:auth:invalid", handler);

    return () => {
      window.removeEventListener("sam:auth:invalid", handler);
    };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      setError("Database connection not configured.");
      return;
    }

    try {
      // Authenticate via Supabase REST API
      const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          apikey: anonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Invalid email or password");
      }

      const data = await response.json();

      // Save the real user token to local storage
      window.localStorage.setItem("sam_auth_token", data.access_token);
      setIsAuthenticated(true);
    } catch (err: unknown) {
      // FIX: Replaced 'any' with 'unknown' and added a type check
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to log in");
      }
    }
  }

  if (isChecking) {
    return null;
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f7f3] p-4 text-slate-950">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-white p-8 rounded-[1.5rem] shadow-xl border border-slate-200"
      >
        <h1 className="text-xl font-bold mb-6 text-center tracking-tight">
          SAM Login
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-slate-900 text-white font-medium p-2.5 rounded-lg hover:bg-slate-800 transition-colors mt-2"
          >
            Enter Planner
          </button>
        </div>
      </form>
    </div>
  );
}
