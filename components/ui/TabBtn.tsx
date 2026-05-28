"use client";

import type { ReactNode, ButtonHTMLAttributes } from "react";

interface TabBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  active?: boolean;
  pending?: boolean;
}

export function TabBtn({ children, active, pending = false, className = "", ...props }: TabBtnProps) {
  return (
    <button
      aria-busy={pending || undefined}
      className={`tab-btn ${active ? "active" : "inactive"}${pending ? " pending" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
