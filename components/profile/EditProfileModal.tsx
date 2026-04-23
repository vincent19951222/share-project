"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchBoardState } from "@/lib/api";
import { AVATAR_OPTIONS, type AvatarKey } from "@/lib/avatars";
import { useBoard } from "@/lib/store";

interface EditProfileModalProps {
  currentUsername: string;
  currentAvatarKey: string;
  onClose: () => void;
}

export function EditProfileModal({
  currentUsername,
  currentAvatarKey,
  onClose,
}: EditProfileModalProps) {
  const router = useRouter();
  const { dispatch } = useBoard();
  const [username, setUsername] = useState(currentUsername);
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarKey>(
    currentAvatarKey as AvatarKey,
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  async function handleSave() {
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, avatarKey: selectedAvatar }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error || "更新失败");
        setLoading(false);
        return;
      }

      const snapshot = await fetchBoardState();
      dispatch({ type: "APPLY_REMOTE_SNAPSHOT", snapshot });
      window.dispatchEvent(new Event("board:profile-updated"));
      router.refresh();
      onClose();
    } catch {
      setError("网络异常，请稍后再试");
      setLoading(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/30" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-[201] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-slate-800 bg-white p-6 shadow-[4px_4px_0_0_#1f2937]">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-800">编辑资料</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-slate-200 text-slate-400 transition-colors hover:border-slate-800 hover:text-slate-800"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="pl-1 text-xs font-bold uppercase tracking-wider text-sub">
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="brutal-input"
              disabled={loading}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="pl-1 text-xs font-bold uppercase tracking-wider text-sub">
              头像
            </label>
            <div className="grid grid-cols-4 gap-2">
              {AVATAR_OPTIONS.map((avatar) => (
                <button
                  key={avatar.key}
                  type="button"
                  onClick={() => setSelectedAvatar(avatar.key)}
                  disabled={loading}
                  className={`aspect-square w-full overflow-hidden rounded-xl border-2 transition-all ${
                    selectedAvatar === avatar.key
                      ? "scale-105 border-slate-800 shadow-[0_3px_0_0_#1f2937] ring-2 ring-yellow-300"
                      : "border-slate-200 hover:border-slate-400"
                  }`}
                >
                  <img
                    src={avatar.url}
                    alt={avatar.label}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border-2 border-red-200 bg-red-50 p-3 text-sm font-bold text-red-500">
              {error}
            </div>
          )}

          <div className="mt-2 flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-xl border-2 border-slate-200 py-3 text-sm font-bold transition-colors hover:border-slate-800 disabled:opacity-50"
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
