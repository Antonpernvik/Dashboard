"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Contact,
  Project,
  TaskStatus,
  TaskPriority,
  STATUS_LABELS,
  PRIORITY_LABELS,
} from "@/lib/types";
import { createBrowserSupabase } from "@/lib/supabase";
import { useToast } from "@/app/components/Toast";
import Sidebar from "@/app/components/Sidebar";
import ContactModal from "./ContactModal";
import ContactDetailModal from "./ContactDetailModal";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  BookUser,
  ChevronDown,
} from "lucide-react";

/** Task kopplad till kontakt (join mot projects) */
export interface ContactLinkedTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string | null;
  contact_id: string | null;
  /** PostgREST kan returnera objekt eller enradig array */
  projects: { name: string } | { name: string }[] | null;
}

function projectNameFromTask(t: ContactLinkedTask): string | null {
  const p = t.projects;
  if (!p) return null;
  if (Array.isArray(p)) return p[0]?.name ?? null;
  return p.name ?? null;
}

interface ContactsClientProps {
  initialContacts: Contact[];
  initialContactTasks: ContactLinkedTask[];
  projects: Project[];
  taskCountsByProject: Record<string, number>;
}

function countByContactId(tasks: ContactLinkedTask[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const t of tasks) {
    if (t.contact_id) {
      m[t.contact_id] = (m[t.contact_id] || 0) + 1;
    }
  }
  return m;
}

function companySortKey(company: string | null): string {
  const c = company?.trim();
  if (!c) return "\uffff";
  return c.toLocaleLowerCase("sv");
}

function matchesContactFields(c: Contact, qRaw: string): boolean {
  const s = qRaw.trim().toLowerCase();
  if (!s) return true;
  const hay = [c.name, c.company, c.role]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(s);
}

/** Gruppera alla kontakter per företag (tomt → __none__) */
function groupContactsByCompany(contacts: Contact[]): Map<string, Contact[]> {
  const map = new Map<string, Contact[]>();
  for (const c of contacts) {
    const key = c.company?.trim() || "";
    const label = key || "__none__";
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(c);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, "sv"));
  }
  const entries = [...map.entries()].sort(([a], [b]) => {
    if (a === "__none__") return 1;
    if (b === "__none__") return -1;
    return a.localeCompare(b, "sv");
  });
  return new Map(entries);
}

/** Sök: företagsnamn eller kontaktfält; vid träff på företagsnamn visas alla under det företaget */
function filterGroupedBySearch(
  contacts: Contact[],
  qRaw: string
): Map<string, Contact[]> {
  const base = groupContactsByCompany(contacts);
  const q = qRaw.trim().toLowerCase();
  if (!q) return base;

  const out = new Map<string, Contact[]>();
  for (const [key, list] of base) {
    const companyNameHit =
      key !== "__none__" && key.toLowerCase().includes(q);
    const filtered = list.filter(
      (c) => companyNameHit || matchesContactFields(c, qRaw)
    );
    if (filtered.length) out.set(key, filtered);
  }
  const entries = [...out.entries()].sort(([a], [b]) => {
    if (a === "__none__") return 1;
    if (b === "__none__") return -1;
    return a.localeCompare(b, "sv");
  });
  return new Map(entries);
}

function taskCountForCompany(
  list: Contact[],
  counts: Record<string, number>
): number {
  return list.reduce((sum, c) => sum + (counts[c.id] ?? 0), 0);
}

function distinctCompanyCount(all: Contact[]): number {
  const set = new Set<string>();
  let hasOther = false;
  for (const c of all) {
    const co = c.company?.trim();
    if (co) set.add(co);
    else hasOther = true;
  }
  return set.size + (hasOther ? 1 : 0);
}

export default function ContactsClient({
  initialContacts,
  initialContactTasks,
  projects,
  taskCountsByProject,
}: ContactsClientProps) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [contactTasks, setContactTasks] =
    useState<ContactLinkedTask[]>(initialContactTasks);
  const [search, setSearch] = useState("");
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(
    () => new Set()
  );
  const [detailContact, setDetailContact] = useState<Contact | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const supabase = useMemo(() => createBrowserSupabase(), []);
  const { toast } = useToast();

  const countsByContact = useMemo(
    () => countByContactId(contactTasks),
    [contactTasks]
  );

  const visibleGrouped = useMemo(
    () => filterGroupedBySearch(contacts, search),
    [contacts, search]
  );

  const visibleContactCount = useMemo(() => {
    let n = 0;
    for (const list of visibleGrouped.values()) n += list.length;
    return n;
  }, [visibleGrouped]);

  const refetch = useCallback(async () => {
    const [cRes, tRes] = await Promise.all([
      supabase
        .from("contacts")
        .select("*")
        .order("company", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true }),
      supabase
        .from("tasks")
        .select(
          "id, title, status, priority, deadline, contact_id, projects(name)"
        )
        .not("contact_id", "is", null),
    ]);
    if (cRes.error) {
      toast(`Kunde inte ladda kontakter: ${cRes.error.message}`, "error");
      return;
    }
    if (tRes.error) {
      toast(`Kunde inte ladda uppgifter: ${tRes.error.message}`, "error");
      return;
    }
    setContacts((cRes.data || []) as Contact[]);
    setContactTasks((tRes.data || []) as ContactLinkedTask[]);
  }, [supabase, toast]);

  async function handleSaveContact(data: Partial<Contact>) {
    setBusy(true);
    try {
      if (data.id) {
        const { id, ...updates } = data;
        const { data: row, error } = await supabase
          .from("contacts")
          .update(updates)
          .eq("id", id)
          .select()
          .single();
        if (error) {
          toast(`Kunde inte spara: ${error.message}`, "error");
          return;
        }
        const updated = row as Contact;
        setContacts((prev) =>
          prev
            .map((c) => (c.id === id ? updated : c))
            .sort((a, b) => {
              const ca = companySortKey(a.company).localeCompare(
                companySortKey(b.company),
                "sv"
              );
              if (ca !== 0) return ca;
              return a.name.localeCompare(b.name, "sv");
            })
        );
        if (detailContact?.id === id) setDetailContact(updated);
        toast("Kontakt sparad");
      } else {
        const { data: row, error } = await supabase
          .from("contacts")
          .insert({
            name: data.name,
            company: data.company,
            role: data.role,
            email: data.email,
            phone: data.phone,
            notes: data.notes,
          })
          .select()
          .single();
        if (error) {
          toast(`Kunde inte skapa: ${error.message}`, "error");
          return;
        }
        setContacts((prev) =>
          [...prev, row as Contact].sort((a, b) => {
            const ca = companySortKey(a.company).localeCompare(
              companySortKey(b.company),
              "sv"
            );
            if (ca !== 0) return ca;
            return a.name.localeCompare(b.name, "sv");
          })
        );
        toast("Kontakt skapad");
      }
      setModalOpen(false);
      setEditingContact(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmDelete(contact: Contact) {
    setBusy(true);
    try {
      const { error: u } = await supabase
        .from("tasks")
        .update({ contact_id: null })
        .eq("contact_id", contact.id);
      if (u) {
        toast(`Kunde inte koppla loss uppgifter: ${u.message}`, "error");
        return;
      }
      const { error: d } = await supabase
        .from("contacts")
        .delete()
        .eq("id", contact.id);
      if (d) {
        toast(`Kunde inte ta bort: ${d.message}`, "error");
        return;
      }
      setContacts((prev) => prev.filter((c) => c.id !== contact.id));
      setContactTasks((prev) =>
        prev.filter((t) => t.contact_id !== contact.id)
      );
      if (detailContact?.id === contact.id) setDetailContact(null);
      toast("Kontakt borttagen", "info");
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  }

  function tasksForContact(contactId: string): ContactLinkedTask[] {
    return contactTasks.filter((t) => t.contact_id === contactId);
  }

  function toggleCompany(key: string) {
    setExpandedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const totalCompanies = distinctCompanyCount(contacts);

  return (
    <div className="flex h-screen overflow-hidden bg-sand">
      <Sidebar
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={setSelectedProject}
        taskCounts={taskCountsByProject}
      />

      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="max-w-5xl mx-auto px-3 sm:px-5 py-3 md:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <div className="min-w-0">
              <p className="text-[9px] font-mono text-stone mb-0.5 flex items-center gap-1">
                <BookUser size={10} />
                Adressbok
              </p>
              <h1 className="text-lg md:text-xl font-display text-stone-dark">
                Kontakter
              </h1>
            </div>
            <button
              type="button"
              onClick={() => {
                setDetailContact(null);
                setEditingContact(null);
                setModalOpen(true);
              }}
              disabled={busy}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-sea text-white text-xs font-medium rounded-lg hover:bg-sea-dark transition-colors shrink-0 disabled:opacity-50"
            >
              <Plus size={14} />
              Ny kontakt
            </button>
          </div>

          {/* Snabbräkning */}
          <div className="text-[11px] font-mono text-stone mb-2">
            {search.trim() ? (
              <span>
                Visar{" "}
                <span className="text-stone-dark font-semibold tabular-nums">
                  {visibleContactCount}
                </span>
                {" / "}
                <span className="tabular-nums">{contacts.length}</span>{" "}
                kontakter ·{" "}
                <span className="text-stone-dark font-semibold tabular-nums">
                  {visibleGrouped.size}
                </span>
                {" / "}
                <span className="tabular-nums">{totalCompanies}</span> företag
              </span>
            ) : (
              <span>
                <span className="text-stone-dark font-semibold tabular-nums">
                  {contacts.length}
                </span>{" "}
                kontakter ·{" "}
                <span className="text-stone-dark font-semibold tabular-nums">
                  {totalCompanies}
                </span>{" "}
                företag
              </span>
            )}
          </div>

          <div className="relative mb-3">
            <Search
              className="absolute left-2 top-1/2 -translate-y-1/2 text-stone"
              size={14}
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sök företag, namn, roll…"
              className="w-full pl-8 pr-2.5 py-1.5 rounded-md border border-sand-dark bg-white text-xs text-stone-dark placeholder:text-stone-light focus:outline-none focus:ring-2 focus:ring-sea/30 focus:border-sea"
            />
          </div>

          {visibleContactCount === 0 ? (
            <p className="text-xs text-stone text-center py-8 bg-white rounded-lg border border-sand-dark">
              Inga träffar.
            </p>
          ) : (
            <div className="rounded-md border border-sand-dark bg-white divide-y divide-sand-dark overflow-hidden">
              {[...visibleGrouped.entries()].map(([companyKey, list]) => {
                const label =
                  companyKey === "__none__" ? "Övriga" : companyKey;
                const expanded = expandedCompanies.has(companyKey);
                const nContacts = list.length;
                const nTasks = taskCountForCompany(list, countsByContact);

                return (
                  <div key={companyKey} className="bg-white">
                    <button
                      type="button"
                      onClick={() => toggleCompany(companyKey)}
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 text-left hover:bg-sand/60 transition-colors"
                    >
                      <ChevronDown
                        size={14}
                        className={`shrink-0 text-stone transition-transform ${
                          expanded ? "rotate-180" : ""
                        }`}
                      />
                      <span className="font-medium text-xs text-stone-dark truncate flex-1 min-w-0">
                        {label}
                      </span>
                      <span className="text-[9px] font-mono text-stone shrink-0 tabular-nums">
                        {nContacts}
                      </span>
                      <span className="text-[9px] font-mono text-stone shrink-0 tabular-nums">
                        {nTasks} t
                      </span>
                    </button>

                    {expanded && (
                      <div className="border-t border-sand-dark bg-sand/30">
                        <table className="w-full table-fixed text-left text-[11px] leading-tight">
                          <thead>
                            <tr className="border-b border-sand-dark text-[9px] font-mono uppercase tracking-wide text-stone bg-sand/50">
                              <th className="px-1.5 py-1 font-medium w-[20%]">
                                Namn
                              </th>
                              <th className="px-1.5 py-1 font-medium w-[16%]">
                                Roll
                              </th>
                              <th className="px-1.5 py-1 font-medium w-[28%]">
                                Mejl
                              </th>
                              <th className="px-1.5 py-1 font-medium w-[22%]">
                                Tel
                              </th>
                              <th className="px-1.5 py-1 font-medium w-[7%] text-right">
                                T
                              </th>
                              <th className="px-0.5 py-1 w-[7%]" aria-label="Åtgärder" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-sand-dark/70">
                            {list.map((c) => {
                              const n = countsByContact[c.id] ?? 0;
                              return (
                                <tr
                                  key={c.id}
                                  className="group hover:bg-white/95 transition-colors"
                                >
                                  <td className="px-1.5 py-0.5 align-middle">
                                    <button
                                      type="button"
                                      onClick={() => setDetailContact(c)}
                                      className="text-left font-medium text-sea hover:underline truncate w-full block"
                                    >
                                      {c.name}
                                    </button>
                                  </td>
                                  <td className="px-1.5 py-0.5 text-stone-dark truncate">
                                    {c.role?.trim() || "—"}
                                  </td>
                                  <td className="px-1.5 py-0.5 truncate">
                                    {c.email ? (
                                      <a
                                        href={`mailto:${c.email}`}
                                        className="text-sea hover:underline truncate block"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {c.email}
                                      </a>
                                    ) : (
                                      <span className="text-stone-light">—</span>
                                    )}
                                  </td>
                                  <td className="px-1.5 py-0.5 truncate font-mono text-[10px]">
                                    {c.phone ? (
                                      <a
                                        href={`tel:${c.phone.replace(/\s/g, "")}`}
                                        className="text-stone-dark hover:text-sea truncate block"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {c.phone}
                                      </a>
                                    ) : (
                                      <span className="text-stone-light">—</span>
                                    )}
                                  </td>
                                  <td className="px-1.5 py-0.5 text-right font-mono tabular-nums text-stone-dark">
                                    {n}
                                  </td>
                                  <td className="px-0.5 py-0.5 text-right whitespace-nowrap">
                                    <span className="inline-flex gap-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                      <button
                                        type="button"
                                        title="Redigera"
                                        onClick={() => {
                                          setDetailContact(null);
                                          setEditingContact(c);
                                          setModalOpen(true);
                                        }}
                                        className="p-0.5 rounded text-stone hover:bg-sand-dark"
                                      >
                                        <Pencil size={12} />
                                      </button>
                                      <button
                                        type="button"
                                        title="Ta bort"
                                        onClick={() => setDeleteTarget(c)}
                                        className="p-0.5 rounded text-rust hover:bg-rust/10"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => void refetch()}
              className="text-[10px] font-mono text-stone hover:text-sea transition-colors"
            >
              Uppdatera från server
            </button>
          </div>
        </div>
      </main>

      <ContactModal
        open={modalOpen}
        contact={editingContact}
        onClose={() => {
          setModalOpen(false);
          setEditingContact(null);
        }}
        onSave={handleSaveContact}
      />

      <ContactDetailModal
        open={detailContact !== null}
        contact={detailContact}
        tasks={detailContact ? tasksForContact(detailContact.id) : []}
        onClose={() => setDetailContact(null)}
        onEdit={() => {
          if (!detailContact) return;
          setEditingContact(detailContact);
          setDetailContact(null);
          setModalOpen(true);
        }}
        onDelete={() => {
          if (!detailContact) return;
          setDeleteTarget(detailContact);
          setDetailContact(null);
        }}
      />

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl border border-sand-dark shadow-xl max-w-md w-full p-5">
            <h2 className="text-lg font-display text-stone-dark mb-2">
              Ta bort kontakt?
            </h2>
            <p className="text-sm text-stone mb-4">
              {deleteTarget.name} tas bort. Kopplade uppgifter behålls men får
              ingen kontakt längre.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-stone hover:text-stone-dark"
              >
                Avbryt
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleConfirmDelete(deleteTarget)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-rust text-white hover:bg-rust-dark disabled:opacity-50"
              >
                Radera
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
