"use client";

import { useEffect, useRef } from "react";

interface DropdownOption {
  value: string;
  label: string;
  active?: boolean;
}

interface InlineDropdownProps {
  options: DropdownOption[];
  onSelect: (value: string) => void;
  onClose: () => void;
}

export default function InlineDropdown({
  options,
  onSelect,
  onClose,
}: InlineDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-40 mt-1 w-44 bg-white border border-sand-dark rounded-lg shadow-lg py-1 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(opt.value);
          }}
          className={`w-full flex items-center justify-between px-3 py-1.5 text-sm text-left transition-colors ${
            opt.active
              ? "text-sea font-medium bg-sea/5"
              : "text-stone-dark hover:bg-sand-dark"
          }`}
        >
          {opt.label}
          {opt.active && (
            <span className="text-[10px] text-stone font-mono">nuv.</span>
          )}
        </button>
      ))}
    </div>
  );
}
