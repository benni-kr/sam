"use client";

import { useState, useEffect, type ReactNode } from "react";

export function AuthGuard({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = window.localStorage.getItem("sam_auth_token");

    // We intentionally set state in this effect because we must wait for the
    // client to mount before reading localStorage to avoid Next.js SSR errors.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (token) setIsAuthenticated(true);

    setIsChecking(false);
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
              Crew Email
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
