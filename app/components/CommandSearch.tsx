"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { TaskWithRelations } from "@/lib/types";
import { getPriorityColor, formatDeadline } from "@/lib/utils";
import StatusCircle from "./StatusCircle";

interface CommandSearchProps {
  tasks: TaskWithRelations[];
  onSelectTask: (task: TaskWithRelations) => void;
  onStatusAdvance: (taskId: string) => void;
}

export default function CommandSearch({
  tasks,
  onSelectTask,
  onStatusAdvance,
}: CommandSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = query.trim()
    ? tasks.filter((t) => {
        const q = query.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.contacts?.name.toLowerCase().includes(q) ||
          t.contacts?.company?.toLowerCase().includes(q) ||
          t.waiting_on?.toLowerCase().includes(q) ||
          t.assigned_to?.toLowerCase().includes(q) ||
          t.projects?.name.toLowerCase().includes(q)
        );
      })
    : [];

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      onSelectTask(filtered[selectedIndex]);
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && setOpen(false)}
      className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-sand-dark overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-sand-dark">
          <Search size={18} className="text-stone shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Sök uppgifter..."
            className="flex-1 bg-transparent text-sm text-stone-dark placeholder:text-stone-light focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-sand-dark text-[10px] font-mono text-stone">
            ESC
          </kbd>
          <button
            onClick={() => setOpen(false)}
            className="sm:hidden text-stone hover:text-stone-dark"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto scrollbar-thin">
          {query.trim() && filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-stone">
              Inga resultat för &ldquo;{query}&rdquo;
            </div>
          )}

          {!query.trim() && (
            <div className="px-4 py-8 text-center text-sm text-stone">
              Börja skriva för att söka bland uppgifter...
            </div>
          )}

          {filtered.map((task, i) => (
            <button
              key={task.id}
              onClick={() => {
                onSelectTask(task);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                i === selectedIndex ? "bg-sea/5" : "hover:bg-sand-dark"
              }`}
            >
              <StatusCircle
                status={task.status}
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusAdvance(task.id);
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-dark truncate">
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {task.projects && (
                    <span className="text-[11px] text-stone">
                      {task.projects.name}
                    </span>
                  )}
                  {task.deadline && (
                    <span className="text-[11px] font-mono text-stone">
                      {formatDeadline(task.deadline)}
                    </span>
                  )}
                </div>
              </div>
              <div
                className={`w-1.5 h-6 rounded-full ${getPriorityColor(task.priority).replace("border-", "bg-")}`}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
