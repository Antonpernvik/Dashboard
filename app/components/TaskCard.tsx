"use client";

import { useRef, useState } from "react";
import {
  ASSIGNEE_LABELS,
  TaskWithRelations,
  TaskStatus,
  TaskPriority,
  TaskAssignee,
  Contact,
  STATUS_LABELS,
  PRIORITY_LABELS,
} from "@/lib/types";
import { getPriorityColor, STATUS_ORDER } from "@/lib/utils";
import StatusCircle from "./StatusCircle";
import DeadlineLabel from "./DeadlineLabel";
import TaskCardMenu from "./TaskCardMenu";
import InlineDropdown from "./InlineDropdown";
import { User, Clock3 } from "lucide-react";

type EditingField = "title" | "status" | "priority" | "deadline" | "assigned" | null;

const PRIORITIES: TaskPriority[] = ["urgent", "high", "medium", "low"];
const ASSIGNEES: TaskAssignee[] = ["leopold", "claude", "jarvis"];

interface TaskCardProps {
  task: TaskWithRelations;
  contacts: Contact[];
  onStatusAdvance: (taskId: string) => void;
  onClick: (task: TaskWithRelations) => void;
  onUpdateTask: (taskId: string, updates: Partial<TaskWithRelations>) => void;
  onDeleteTask: (taskId: string) => void;
  dragHandle?: React.ReactNode;
  isExternallyUpdated?: boolean;
}

export default function TaskCard({
  task,
  contacts,
  onStatusAdvance,
  onClick,
  onUpdateTask,
  onDeleteTask,
  dragHandle,
  isExternallyUpdated,
}: TaskCardProps) {
  const [editing, setEditing] = useState<EditingField>(null);
  const [flashField, setFlashField] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const titleRef = useRef<HTMLInputElement>(null);

  const borderColor = getPriorityColor(task.priority);

  function flash(field: string) {
    setFlashField(field);
    setTimeout(() => setFlashField(null), 300);
  }

  function saveField(field: string, updates: Partial<TaskWithRelations>) {
    onUpdateTask(task.id, updates);
    setEditing(null);
    flash(field);
  }

  function flashClass(field: string) {
    return flashField === field ? "animate-flash-save" : "";
  }

  return (
    <div
      onClick={() => {
        if (!editing) onClick(task);
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={`group bg-white rounded-lg border border-sand-dark border-l-[3px] ${borderColor} px-4 py-3 cursor-pointer transition-all hover:shadow-sm hover:border-stone-light/50 ${
        isExternallyUpdated ? "animate-pulse-external" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        {dragHandle}

        {/* Status circle — click to open status dropdown */}
        <div className="pt-0.5 relative">
          <StatusCircle
            status={task.status}
            onClick={(e) => {
              e.stopPropagation();
              if (editing === "status") {
                setEditing(null);
              } else {
                setEditing("status");
              }
            }}
          />
          {editing === "status" && (
            <InlineDropdown
              options={STATUS_ORDER.map((s) => ({
                value: s,
                label: STATUS_LABELS[s],
                active: s === task.status,
              }))}
              onSelect={(v) => saveField("status", { status: v as TaskStatus })}
              onClose={() => setEditing(null)}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Title — double-click to edit */}
          <div className={flashClass("title")}>
            {editing === "title" ? (
              <input
                ref={titleRef}
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && titleDraft.trim()) {
                    saveField("title", { title: titleDraft.trim() });
                  } else if (e.key === "Escape") {
                    setTitleDraft(task.title);
                    setEditing(null);
                  }
                }}
                onBlur={() => {
                  if (titleDraft.trim() && titleDraft.trim() !== task.title) {
                    saveField("title", { title: titleDraft.trim() });
                  } else {
                    setTitleDraft(task.title);
                    setEditing(null);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="w-full text-sm font-medium text-stone-dark bg-sand border border-sand-dark rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-sea/30"
                autoFocus
              />
            ) : (
              <p
                className="text-sm font-medium text-stone-dark leading-snug"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setTitleDraft(task.title);
                  setEditing("title");
                }}
              >
                {task.title}
              </p>
            )}
          </div>

          {/* Metadata row */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {/* Priority badge — click to edit */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(editing === "priority" ? null : "priority");
                }}
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wide transition-colors hover:bg-sand-dark ${flashClass("priority")} ${
                  task.priority === "urgent"
                    ? "text-rust"
                    : task.priority === "high"
                    ? "text-amber"
                    : task.priority === "medium"
                    ? "text-sea"
                    : "text-stone"
                }`}
              >
                {PRIORITY_LABELS[task.priority]}
              </button>
              {editing === "priority" && (
                <InlineDropdown
                  options={PRIORITIES.map((p) => ({
                    value: p,
                    label: PRIORITY_LABELS[p],
                    active: p === task.priority,
                  }))}
                  onSelect={(v) =>
                    saveField("priority", { priority: v as TaskPriority })
                  }
                  onClose={() => setEditing(null)}
                />
              )}
            </div>

            {task.projects && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-sand-dark text-stone-dark">
                {task.projects.name}
              </span>
            )}

            {/* Assigned to — click to edit */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditing(editing === "assigned" ? null : "assigned");
                }}
                className={`inline-flex items-center gap-1 text-xs text-stone hover:text-stone-dark transition-colors ${flashClass("assigned")}`}
              >
                <User size={11} />
                {task.assigned_to ? ASSIGNEE_LABELS[task.assigned_to] : "Tilldela"}
              </button>
              {editing === "assigned" && (
                <InlineDropdown
                  options={[
                    { value: "", label: "Ingen", active: !task.assigned_to },
                    ...ASSIGNEES.map((assignee) => ({
                      value: assignee,
                      label: ASSIGNEE_LABELS[assignee],
                      active: task.assigned_to === assignee,
                    })),
                  ]}
                  onSelect={(v) =>
                    saveField("assigned", {
                      assigned_to: (v as TaskAssignee) || null,
                    })
                  }
                  onClose={() => setEditing(null)}
                />
              )}
            </div>

            {/* Deadline — click to edit */}
            <div className={`relative ${flashClass("deadline")}`}>
              {editing === "deadline" ? (
                <input
                  type="date"
                  defaultValue={task.deadline || ""}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    saveField("deadline", {
                      deadline: e.target.value || null,
                    });
                  }}
                  onBlur={() => setEditing(null)}
                  className="text-xs bg-sand border border-sand-dark rounded px-1.5 py-0.5 font-mono focus:outline-none focus:ring-1 focus:ring-sea/30"
                  autoFocus
                />
              ) : (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing("deadline");
                  }}
                  className="cursor-pointer"
                >
                  <DeadlineLabel deadline={task.deadline} />
                  {!task.deadline && (
                    <span className="text-[11px] text-stone hover:text-stone-dark transition-colors">
                      + deadline
                    </span>
                  )}
                </span>
              )}
            </div>

            {task.waiting_on && (
              <span className="inline-flex items-center gap-1 text-xs text-amber font-medium">
                <Clock3 size={11} />
                {task.waiting_on}
              </span>
            )}
          </div>
        </div>

        <TaskCardMenu
          task={task}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
        />
      </div>
    </div>
  );
}
