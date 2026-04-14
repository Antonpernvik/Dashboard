"use client";

import { useEffect, useRef } from "react";
import {
  Contact,
  STATUS_LABELS,
  PRIORITY_LABELS,
} from "@/lib/types";
import type { ContactLinkedTask } from "./ContactsClient";
import { X } from "lucide-react";

function projectNameFromTask(t: ContactLinkedTask): string | null {
  const p = t.projects;
  if (!p) return null;
  if (Array.isArray(p)) return p[0]?.name ?? null;
  return p.name ?? null;
}

interface ContactDetailModalProps {
  open: boolean;
  contact: Contact | null;
  tasks: ContactLinkedTask[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** Modal med full kontaktinfo och kopplade tasks (ersätter slide-over) */
export default function ContactDetailModal({
  open,
  contact,
  tasks,
  onClose,
  onEdit,
  onDelete,
}: ContactDetailModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open || !contact) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && onClose()}
      className="fixed inset-0 z-[55] bg-black/25 backdrop-blur-sm flex items-start justify-center pt-[6vh] px-4"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col border border-sand-dark animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-4 py-3 border-b border-sand-dark shrink-0">
          <h2
            id="contact-detail-title"
            className="text-base font-display text-stone-dark truncate pr-2"
          >
            {contact.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone hover:bg-sand-dark shrink-0"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
          {contact.company?.trim() && (
            <p>
              <span className="text-[10px] font-mono uppercase text-stone block mb-0.5">
                Företag
              </span>
              <span className="text-stone-dark">{contact.company}</span>
            </p>
          )}
          {contact.role?.trim() && (
            <p>
              <span className="text-[10px] font-mono uppercase text-stone block mb-0.5">
                Roll
              </span>
              <span className="text-stone-dark">{contact.role}</span>
            </p>
          )}
          <p>
            <span className="text-[10px] font-mono uppercase text-stone block mb-0.5">
              Mejl
            </span>
            {contact.email ? (
              <a
                href={`mailto:${contact.email}`}
                className="text-sea hover:underline break-all"
              >
                {contact.email}
              </a>
            ) : (
              <span className="text-stone-light">—</span>
            )}
          </p>
          <p>
            <span className="text-[10px] font-mono uppercase text-stone block mb-0.5">
              Telefon
            </span>
            {contact.phone ? (
              <a
                href={`tel:${contact.phone.replace(/\s/g, "")}`}
                className="text-stone-dark hover:text-sea font-mono text-xs"
              >
                {contact.phone}
              </a>
            ) : (
              <span className="text-stone-light">—</span>
            )}
          </p>
          {contact.notes?.trim() && (
            <p>
              <span className="text-[10px] font-mono uppercase text-stone block mb-0.5">
                Anteckningar
              </span>
              <span className="text-stone-dark whitespace-pre-wrap text-xs">
                {contact.notes}
              </span>
            </p>
          )}

          <div className="pt-2 border-t border-sand-dark">
            <p className="text-[10px] font-mono uppercase text-stone mb-1.5">
              Kopplade uppgifter ({tasks.length})
            </p>
            {tasks.length === 0 ? (
              <p className="text-xs text-stone italic">Inga uppgifter.</p>
            ) : (
              <ul className="space-y-1">
                {tasks.map((t) => {
                  const pn = projectNameFromTask(t);
                  return (
                    <li
                      key={t.id}
                      className="text-[11px] bg-sand/50 rounded border border-sand-dark px-2 py-1"
                    >
                      <span className="font-medium text-stone-dark block truncate">
                        {t.title}
                      </span>
                      <span className="text-[10px] text-stone font-mono">
                        {STATUS_LABELS[t.status]} · {PRIORITY_LABELS[t.priority]}
                        {t.deadline && ` · ${t.deadline}`}
                        {pn && ` · ${pn}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex gap-2 pt-1 sticky bottom-0 bg-white pb-1">
            <button
              type="button"
              onClick={onEdit}
              className="flex-1 py-2 text-xs font-medium rounded-lg border border-sand-dark text-stone-dark hover:bg-sand-dark transition-colors"
            >
              Redigera
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="py-2 px-3 text-xs font-medium rounded-lg text-rust border border-rust/30 hover:bg-rust/10 transition-colors"
            >
              Ta bort
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
