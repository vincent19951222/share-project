"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AVATAR_OPTIONS, type AvatarKey } from "@/lib/avatars";

interface EditProfileModalProps {
  currentUsername: string;
  currentAvatarKey: string;
  onClose: () => void;
}

export function EditProfileModal({ currentUsername, currentAvatarKey, onClose }: EditProfileModalProps) {
  const router = useRouter();
  const [username, setUsername] = useState(currentUsername);
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarKey>(currentAvatarKey as AvatarKey);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  async function handleSave() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, avatarKey: selectedAvatar }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "更新失败");
        setLoading(false);
        return;
      }

      router.refresh();
      onClose();
    } catch {
      setError("网络错误，请重试");
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[200]" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border-2 border-slate-800 rounded-2xl shadow-[4px_4px_0_0_#1f2937] z-[201] w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-slate-800">编辑资料</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg border-2 border-slate-200 hover:border-slate-800 transition-colors text-slate-400 hover:text-slate-800"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-sub tracking-wider uppercase pl-1">
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="brutal-input"
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-sub tracking-wider uppercase pl-1">
              头像
            </label>
            <div className="grid grid-cols-4 gap-2">
              {AVATAR_OPTIONS.map((avatar) => (
                <button
                  key={avatar.key}
                  type="button"
                  onClick={() => setSelectedAvatar(avatar.key)}
                  disabled={loading}
                  className={`w-full aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                    selectedAvatar === avatar.key
                      ? "border-slate-800 shadow-[0_3px_0_0_#1f2937] scale-105 ring-2 ring-yellow-300"
                      : "border-slate-200 hover:border-slate-400"
                  }`}
                >
                  <img src={avatar.url} alt={avatar.label} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm font-bold bg-red-50 border-2 border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 text-sm font-bold border-2 border-slate-200 rounded-xl hover:border-slate-800 transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !username.trim()}
              className="quest-btn flex-1 py-3 text-sm disabled:opacity-50"
            >
              {loading ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
