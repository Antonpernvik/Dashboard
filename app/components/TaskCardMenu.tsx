"use client";

import { useEffect, useRef, useState } from "react";
import {
  TaskWithRelations,
  TaskStatus,
  TaskPriority,
  TaskAssignee,
  STATUS_LABELS,
  PRIORITY_LABELS,
} from "@/lib/types";
import { STATUS_ORDER } from "@/lib/utils";
import {
  MoreHorizontal,
  ArrowRight,
  Flag,
  User,
  Calendar,
  Trash2,
} from "lucide-react";

interface TaskCardMenuProps {
  task: TaskWithRelations;
  onUpdateTask: (taskId: string, updates: Partial<TaskWithRelations>) => void;
  onDeleteTask: (taskId: string) => void;
}

const PRIORITIES: TaskPriority[] = ["urgent", "high", "medium", "low"];

export default function TaskCardMenu({
  task,
  onUpdateTask,
  onDeleteTask,
}: TaskCardMenuProps) {
  const [open, setOpen] = useState(false);
  const [submenu, setSubmenu] = useState<
    "status" | "priority" | "assign" | "deadline" | null
  >(null);
  const [assignValue, setAssignValue] = useState(task.assigned_to || "");
  const [deadlineValue, setDeadlineValue] = useState(task.deadline || "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSubmenu(null);
        setConfirmDelete(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
    setSubmenu(null);
    setConfirmDelete(false);
  }

  function handleButtonClick(e: React.MouseEvent) {
    e.stopPropagation();
    setOpen((prev) => !prev);
    setSubmenu(null);
    setConfirmDelete(false);
  }

  const itemClass =
    "w-full flex items-center gap-2 px-3 py-1.5 text-sm text-stone-dark hover:bg-sand-dark rounded-md transition-colors text-left";

  return (
    <div ref={menuRef} className="relative" onContextMenu={handleContextMenu}>
      <button
        onClick={handleButtonClick}
        className="p-1 rounded-md text-stone opacity-0 group-hover:opacity-100 hover:bg-sand-dark transition-all"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-sand-dark rounded-lg shadow-lg z-40 py-1 overflow-hidden">
          {!submenu && !confirmDelete && (
            <>
              <button
                className={itemClass}
                onClick={(e) => {
                  e.stopPropagation();
                  setSubmenu("status");
                }}
              >
                <ArrowRight size={14} />
                Ändra status
              </button>
              <button
                className={itemClass}
                onClick={(e) => {
                  e.stopPropagation();
                  setSubmenu("priority");
                }}
              >
                <Flag size={14} />
                Ändra prioritet
              </button>
              <button
                className={itemClass}
                onClick={(e) => {
                  e.stopPropagation();
                  setSubmenu("assign");
                }}
              >
                <User size={14} />
                Tilldela
              </button>
              <button
                className={itemClass}
                onClick={(e) => {
                  e.stopPropagation();
                  setSubmenu("deadline");
                }}
              >
                <Calendar size={14} />
                Sätt deadline
              </button>
              <div className="border-t border-sand-dark my-1" />
              <button
                className={`${itemClass} text-rust hover:bg-rust/5`}
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(true);
                }}
              >
                <Trash2 size={14} />
                Radera
              </button>
            </>
          )}

          {submenu === "status" && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-stone">
                Status
              </div>
              {STATUS_ORDER.map((s) => (
                <button
                  key={s}
                  className={`${itemClass} ${s === task.status ? "font-medium text-sea" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateTask(task.id, { status: s });
                    setOpen(false);
                    setSubmenu(null);
                  }}
                >
                  {STATUS_LABELS[s]}
                  {s === task.status && (
                    <span className="ml-auto text-xs text-stone">nuv.</span>
                  )}
                </button>
              ))}
            </>
          )}

          {submenu === "priority" && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-stone">
                Prioritet
              </div>
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  className={`${itemClass} ${p === task.priority ? "font-medium text-sea" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateTask(task.id, { priority: p });
                    setOpen(false);
                    setSubmenu(null);
                  }}
                >
                  {PRIORITY_LABELS[p]}
                  {p === task.priority && (
                    <span className="ml-auto text-xs text-stone">nuv.</span>
                  )}
                </button>
              ))}
            </>
          )}

          {submenu === "assign" && (
            <div className="p-2" onClick={(e) => e.stopPropagation()}>
              <div className="px-1 py-1 text-[10px] font-mono uppercase tracking-widest text-stone">
                Tilldela till
              </div>
              <input
                type="text"
                value={assignValue}
                onChange={(e) => setAssignValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onUpdateTask(task.id, {
                      assigned_to: (assignValue || null) as TaskAssignee | null,
                    });
                    setOpen(false);
                    setSubmenu(null);
                  }
                }}
                placeholder="Namn..."
                className="w-full px-2 py-1.5 bg-sand border border-sand-dark rounded text-sm focus:outline-none focus:ring-1 focus:ring-sea/30"
                autoFocus
              />
              <button
                className="mt-1.5 w-full px-2 py-1 bg-sea text-white text-xs font-medium rounded hover:bg-sea-dark transition-colors"
                onClick={() => {
                  onUpdateTask(task.id, {
                    assigned_to: (assignValue || null) as TaskAssignee | null,
                  });
                  setOpen(false);
                  setSubmenu(null);
                }}
              >
                Spara
              </button>
            </div>
          )}

          {submenu === "deadline" && (
            <div className="p-2" onClick={(e) => e.stopPropagation()}>
              <div className="px-1 py-1 text-[10px] font-mono uppercase tracking-widest text-stone">
                Deadline
              </div>
              <input
                type="date"
                value={deadlineValue}
                onChange={(e) => setDeadlineValue(e.target.value)}
                className="w-full px-2 py-1.5 bg-sand border border-sand-dark rounded text-sm focus:outline-none focus:ring-1 focus:ring-sea/30"
                autoFocus
              />
              <button
                className="mt-1.5 w-full px-2 py-1 bg-sea text-white text-xs font-medium rounded hover:bg-sea-dark transition-colors"
                onClick={() => {
                  onUpdateTask(task.id, {
                    deadline: deadlineValue || null,
                  });
                  setOpen(false);
                  setSubmenu(null);
                }}
              >
                Spara
              </button>
            </div>
          )}

          {confirmDelete && (
            <div className="p-3 text-center">
              <p className="text-sm text-stone-dark mb-2">Radera uppgift?</p>
              <div className="flex gap-2">
                <button
                  className="flex-1 px-2 py-1.5 text-xs text-stone hover:bg-sand-dark rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(false);
                  }}
                >
                  Avbryt
                </button>
                <button
                  className="flex-1 px-2 py-1.5 text-xs bg-rust text-white rounded hover:bg-rust-dark transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTask(task.id);
                    setOpen(false);
                  }}
                >
                  Radera
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
