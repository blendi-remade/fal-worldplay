"use client";

import { useState, useRef, useEffect } from "react";

interface HistoryItem {
  id: string;
  prompt: string;
  thumbnail?: string;
}

interface Props {
  items: HistoryItem[];
  selected: HistoryItem | null;
  onSelect: (item: HistoryItem | null) => void;
}

export default function HistoryDropdown({ items, selected, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative mb-4 text-left">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-xs font-medium transition-colors duration-150"
        style={{ color: "var(--text-tertiary)", background: "none" }}
        onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
        onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-tertiary)"}
      >
        {selected ? "Change selection" : "History"}
        <span className="inline-block ml-1 transition-transform duration-150" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>&#9662;</span>
      </button>

      {/* Selected preview */}
      {selected && (
        <div className="mt-2 flex items-center gap-3 p-2" style={{ background: "var(--bg-tertiary)", border: "1px solid var(--fal-purple-light)", borderRadius: 6 }}>
          {selected.thumbnail && (
            <img src={selected.thumbnail} alt="" className="w-12 h-12 object-cover shrink-0" style={{ borderRadius: 4 }} />
          )}
          <p className="text-xs flex-1 truncate" style={{ color: "var(--text-primary)" }}>
            {selected.prompt.slice(0, 80)}
          </p>
          <button
            type="button"
            onClick={() => { onSelect(null); setOpen(false); }}
            className="text-xs shrink-0 px-2 py-1 transition-colors duration-150"
            style={{ color: "var(--text-tertiary)", background: "none", border: "1px solid var(--border-color)", borderRadius: 4 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.borderColor = "var(--border-color-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-tertiary)"; e.currentTarget.style.borderColor = "var(--border-color)"; }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute left-0 right-0 z-20 mt-1 max-h-60 overflow-y-auto animate-fade-in"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-color-hover)", borderRadius: 6 }}
        >
          {items.map((item, i) => (
            <button
              key={`${item.id}-${i}`}
              type="button"
              onClick={() => { onSelect(item); setOpen(false); }}
              className="w-full flex items-center gap-3 p-2.5 text-left transition-colors duration-100"
              style={{
                background: selected?.id === item.id ? "var(--bg-tertiary)" : "transparent",
                borderBottom: i < items.length - 1 ? "1px solid var(--border-color)" : "none",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-tertiary)"}
              onMouseLeave={(e) => e.currentTarget.style.background = selected?.id === item.id ? "var(--bg-tertiary)" : "transparent"}
            >
              {item.thumbnail ? (
                <img src={item.thumbnail} alt="" className="w-10 h-10 object-cover shrink-0" style={{ borderRadius: 4 }} />
              ) : null}
              <span className="text-xs truncate" style={{ color: "var(--text-primary)" }}>
                {item.prompt.slice(0, 70)}{item.prompt.length > 70 ? "..." : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
