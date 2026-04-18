"use client";

import type { ReactNode, ButtonHTMLAttributes } from "react";

interface QuestBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function QuestBtn({ children, className = "", ...props }: QuestBtnProps) {
  return (
    <button className={`quest-btn ${className}`} {...props}>
      {children}
    </button>
  );
}
