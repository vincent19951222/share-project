"use client";

import { useState, useEffect } from "react";

interface ToastData {
  avatarSvg: string;
  text: string;
}

export function Toast({ data }: { data: ToastData | null }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!data) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(timer);
  }, [data]);

  if (!data) return null;

  return (
    <div
      className={`absolute bottom-4 right-4 bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2 transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
      }`}
    >
      <div
        className="w-6 h-6 text-white"
        dangerouslySetInnerHTML={{ __html: data.avatarSvg }}
      />
      <span>{data.text}</span>
    </div>
  );
}
