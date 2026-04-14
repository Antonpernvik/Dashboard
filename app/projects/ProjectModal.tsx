"use client";

import { useEffect, useRef, useState } from "react";
import {
  Project,
  ProjectCategory,
  ProjectStatus,
  CATEGORY_LABELS,
  PROJECT_STATUS_LABELS,
} from "@/lib/types";
import { X } from "lucide-react";

const CATEGORIES: ProjectCategory[] = [
  "energi",
  "bygg",
  "gym",
  "drift",
  "it",
  "hospitality",
  "admin",
  "ovrigt",
];

const STATUSES: ProjectStatus[] = [
  "active",
  "paused",
  "completed",
  "archived",
];

interface ProjectModalProps {
  open: boolean;
  project: Project | null;
  onClose: () => void;
  onSave: (data: Partial<Project>) => void;
}

const emptyForm = {
  name: "",
  description: "",
  status: "active" as ProjectStatus,
  category: "ovrigt" as ProjectCategory,
  deadline: "",
};

/** Modal för att skapa eller redigera projekt */
export default function ProjectModal({
  open,
  project,
  onClose,
  onSave,
}: ProjectModalProps) {
  const [form, setForm] = useState(emptyForm);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name,
        description: project.description || "",
        status: project.status,
        category: project.category,
        deadline: project.deadline || "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [project, open]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const isEdit = !!project;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: Partial<Project> = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      status: form.status,
      category: form.category,
      deadline: form.deadline || null,
    };
    if (isEdit && project) data.id = project.id;
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
            {isEdit ? "Redigera projekt" : "Nytt projekt"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-sand-dark text-stone transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className={labelClass}>Namn *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Projektnamn"
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
              placeholder="Kort beskrivning..."
              rows={3}
              className={inputClass + " resize-none"}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Status</label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as ProjectStatus,
                  })
                }
                className={inputClass}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {PROJECT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Kategori</label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({
                    ...form,
                    category: e.target.value as ProjectCategory,
                  })
                }
                className={inputClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
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

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-sand-dark">
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
        </form>
      </div>
    </div>
  );
}
