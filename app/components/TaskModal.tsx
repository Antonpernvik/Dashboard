"use client";

import { useEffect, useRef, useState } from "react";
import {
  Task,
  TaskWithRelations,
  Project,
  Contact,
  TaskStatus,
  TaskPriority,
  TaskAssignee,
  ASSIGNEE_LABELS,
  STATUS_LABELS,
  PRIORITY_LABELS,
} from "@/lib/types";
import { STATUS_ORDER } from "@/lib/utils";
import { X } from "lucide-react";

interface TaskModalProps {
  open: boolean;
  task: TaskWithRelations | null;
  projects: Project[];
  contacts: Contact[];
  onClose: () => void;
  onSave: (data: Partial<Task>) => void;
  onDelete?: (taskId: string) => void;
}

const PRIORITIES: TaskPriority[] = ["urgent", "high", "medium", "low"];
const ASSIGNEES: TaskAssignee[] = ["leopold", "claude", "jarvis"];

const emptyForm = {
  title: "",
  description: "",
  status: "todo" as TaskStatus,
  priority: "medium" as TaskPriority,
  project_id: "",
  contact_id: "",
  assigned_to: "",
  deadline: "",
  waiting_on: "",
  source: "",
  source_ref: "",
};

export default function TaskModal({
  open,
  task,
  projects,
  contacts,
  onClose,
  onSave,
  onDelete,
}: TaskModalProps) {
  const [form, setForm] = useState(emptyForm);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority,
        project_id: task.project_id || "",
        contact_id: task.contact_id || "",
        assigned_to: task.assigned_to || "",
        deadline: task.deadline || "",
        waiting_on: task.waiting_on || "",
        source: task.source || "",
        source_ref: task.source_ref || "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [task, open]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const isEdit = !!task;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: Partial<Task> = {
      title: form.title,
      description: form.description || null,
      status: form.status,
      priority: form.priority,
      project_id: form.project_id || null,
      contact_id: form.contact_id || null,
      assigned_to: (form.assigned_to as TaskAssignee) || null,
      deadline: form.deadline || null,
      waiting_on: form.waiting_on || null,
      source: form.source || null,
      source_ref: form.source_ref || null,
    };
    if (isEdit) data.id = task!.id;
    onSave(data);
  }

  const inputClass =
    "w-full px-3 py-2 bg-sand border border-sand-dark rounded-lg text-sm text-stone-dark placeholder:text-stone-light focus:outline-none focus:ring-2 focus:ring-sea/30 focus:border-sea transition-colors";
  const labelClass = "block text-xs font-medium text-stone-dark mb-1";

  return (
    <div
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && onClose()}
      className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-sand-dark animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-sand-dark">
          <h2 className="text-lg font-display text-stone-dark">
            {isEdit ? "Redigera uppgift" : "Ny uppgift"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-sand-dark text-stone transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className={labelClass}>Titel *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Vad ska göras?"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Beskrivning</label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Detaljer..."
              rows={2}
              className={inputClass + " resize-none"}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Status</label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as TaskStatus })
                }
                className={inputClass}
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Prioritet</label>
              <select
                value={form.priority}
                onChange={(e) =>
                  setForm({
                    ...form,
                    priority: e.target.value as TaskPriority,
                  })
                }
                className={inputClass}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Projekt</label>
              <select
                value={form.project_id}
                onChange={(e) =>
                  setForm({ ...form, project_id: e.target.value })
                }
                className={inputClass}
              >
                <option value="">Inget projekt</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Kontakt</label>
              <select
                value={form.contact_id}
                onChange={(e) =>
                  setForm({ ...form, contact_id: e.target.value })
                }
                className={inputClass}
              >
                <option value="">Ingen kontakt</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.company ? ` (${c.company})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Tilldelad</label>
              <select
                value={form.assigned_to}
                onChange={(e) =>
                  setForm({ ...form, assigned_to: e.target.value })
                }
                className={inputClass}
              >
                <option value="">Ingen</option>
                {ASSIGNEES.map((assignee) => (
                  <option key={assignee} value={assignee}>
                    {ASSIGNEE_LABELS[assignee]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Deadline</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) =>
                  setForm({ ...form, deadline: e.target.value })
                }
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Väntar på</label>
            <input
              type="text"
              value={form.waiting_on}
              onChange={(e) =>
                setForm({ ...form, waiting_on: e.target.value })
              }
              placeholder="t.ex. Oscar — SRS-rör svar"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Källa</label>
              <input
                type="text"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                placeholder="t.ex. mail, möte"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Referens</label>
              <input
                type="text"
                value={form.source_ref}
                onChange={(e) =>
                  setForm({ ...form, source_ref: e.target.value })
                }
                placeholder="URL eller anteckning"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-sand-dark">
            <div>
              {isEdit && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(task!.id)}
                  className="text-sm text-rust hover:text-rust-dark transition-colors"
                >
                  Ta bort
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-stone hover:text-stone-dark transition-colors"
              >
                Avbryt
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-sea text-white text-sm font-medium rounded-lg hover:bg-sea-dark transition-colors"
              >
                {isEdit ? "Spara" : "Skapa"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
