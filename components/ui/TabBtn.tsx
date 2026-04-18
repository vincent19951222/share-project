"use client";

import type { ReactNode, ButtonHTMLAttributes } from "react";

interface TabBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  active?: boolean;
}

export function TabBtn({ children, active, className = "", ...props }: TabBtnProps) {
  return (
    <button className={`tab-btn ${active ? "active" : "inactive"} ${className}`} {...props}>
      {children}
    </button>
  );
}
