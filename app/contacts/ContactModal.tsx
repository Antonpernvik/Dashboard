"use client";

import { useEffect, useRef, useState } from "react";
import { Contact } from "@/lib/types";
import { X } from "lucide-react";

interface ContactModalProps {
  open: boolean;
  contact: Contact | null;
  onClose: () => void;
  onSave: (data: Partial<Contact>) => void;
}

const emptyForm = {
  name: "",
  company: "",
  role: "",
  email: "",
  phone: "",
  notes: "",
};

/** Modal för att skapa eller redigera kontakt */
export default function ContactModal({
  open,
  contact,
  onClose,
  onSave,
}: ContactModalProps) {
  const [form, setForm] = useState(emptyForm);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contact) {
      setForm({
        name: contact.name,
        company: contact.company || "",
        role: contact.role || "",
        email: contact.email || "",
        phone: contact.phone || "",
        notes: contact.notes || "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [contact, open]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const isEdit = !!contact;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: Partial<Contact> = {
      name: form.name.trim(),
      company: form.company.trim() || null,
      role: form.role.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
    };
    if (isEdit && contact) data.id = contact.id;
    onSave(data);
  }

  const inputClass =
    "w-full px-3 py-2 bg-sand border border-sand-dark rounded-lg text-sm text-stone-dark placeholder:text-stone-light focus:outline-none focus:ring-2 focus:ring-sea/30 focus:border-sea transition-colors";
  const labelClass = "block text-xs font-medium text-stone-dark mb-1";

  return (
    <div
      ref={overlayRef}
      onClick={(e) => e.target === overlayRef.current && onClose()}
      className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-start justify-center pt-[8vh] px-4"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-sand-dark">
        <div className="flex items-center justify-between px-5 py-4 border-b border-sand-dark">
          <h2 className="text-lg font-display text-stone-dark">
            {isEdit ? "Redigera kontakt" : "Ny kontakt"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-sand-dark text-stone transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className={labelClass}>Namn *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
              placeholder="För- och efternamn"
            />
          </div>
          <div>
            <label className={labelClass}>Företag</label>
            <input
              type="text"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className={inputClass}
              placeholder="Bolag / organisation"
            />
          </div>
          <div>
            <label className={labelClass}>Roll</label>
            <input
              type="text"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className={inputClass}
              placeholder="t.ex. Projektledare"
            />
          </div>
          <div>
            <label className={labelClass}>E-post</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass}
              placeholder="namn@foretag.se"
            />
          </div>
          <div>
            <label className={labelClass}>Telefon</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={inputClass}
              placeholder="+46 ..."
            />
          </div>
          <div>
            <label className={labelClass}>Anteckningar</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className={inputClass + " resize-none"}
              placeholder="Möten, kontext, påminnelser..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-sand-dark">
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
