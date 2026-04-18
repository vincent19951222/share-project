"use client";

import { useState } from "react";
import { SvgIcons } from "./SvgIcons";

interface PunchPopupProps {
  onSelect: (type: string) => void;
}

export function PunchPopup({ onSelect }: PunchPopupProps) {
  const [show, setShow] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        className="cell my-punch-btn text-xl cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          setShow((prev) => !prev);
        }}
      >
        +
      </button>
      <div className={`punch-popup ${show ? "show" : ""}`}>
        <button
          className="hover:bg-slate-100 p-1.5 rounded text-slate-800 w-10 h-10 flex items-center justify-center"
          title="力量"
          onClick={(e) => {
            e.stopPropagation();
            setShow(false);
            onSelect("力量");
          }}
          dangerouslySetInnerHTML={{ __html: SvgIcons.strength }}
        />
        <button
          className="hover:bg-slate-100 p-1.5 rounded text-slate-800 w-10 h-10 flex items-center justify-center"
          title="有氧"
          onClick={(e) => {
            e.stopPropagation();
            setShow(false);
            onSelect("有氧");
          }}
          dangerouslySetInnerHTML={{ __html: SvgIcons.run }}
        />
        <button
          className="hover:bg-slate-100 p-1.5 rounded text-slate-800 w-10 h-10 flex items-center justify-center"
          title="伸展"
          onClick={(e) => {
            e.stopPropagation();
            setShow(false);
            onSelect("伸展");
          }}
          dangerouslySetInnerHTML={{ __html: SvgIcons.stretch }}
        />
      </div>
    </div>
  );
}
