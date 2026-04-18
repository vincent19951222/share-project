"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "登录失败");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("网络错误，请重试");
      setLoading(false);
    }
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-sub tracking-wider uppercase pl-1">
          Username
        </label>
        <div className="input-group">
          <input
            type="text"
            placeholder="Enter username"
            className="brutal-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
          />
          <svg viewBox="0 0 24 24" className="input-icon" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-sub tracking-wider uppercase pl-1">
          Password
        </label>
        <div className="input-group">
          <input
            type="password"
            placeholder="Enter password"
            className="brutal-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          <svg viewBox="0 0 24 24" className="input-icon" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
      </div>

      {error && (
        <div className="text-red-500 text-sm font-bold bg-red-50 border-2 border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="quest-btn w-full py-4 text-lg mt-4 flex gap-2 disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
        {loading ? "LOGGING IN..." : "START QUEST"}
      </button>
    </form>
  );
}
