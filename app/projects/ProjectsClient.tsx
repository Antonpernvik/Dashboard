"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Project,
  Task,
  ProjectStatus,
  TaskStatus,
  CATEGORY_LABELS,
  PROJECT_STATUS_LABELS,
  STATUS_LABELS,
  PRIORITY_LABELS,
  ASSIGNEE_LABELS,
} from "@/lib/types";
import { createBrowserSupabase } from "@/lib/supabase";
import { isOverdue } from "@/lib/utils";
import { useToast } from "@/app/components/Toast";
import Sidebar from "@/app/components/Sidebar";
import ProjectModal from "./ProjectModal";
import {
  Sun,
  Building2,
  Dumbbell,
  Wrench,
  Monitor,
  UtensilsCrossed,
  Shield,
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  X,
  ListTodo,
} from "lucide-react";

interface ProjectsClientProps {
  initialProjects: Project[];
  initialTasks: Task[];
}

const STATUS_FILTERS: { value: ProjectStatus | "alla"; label: string }[] = [
  { value: "alla", label: "Alla" },
  { value: "active", label: "Aktiva" },
  { value: "paused", label: "Pausade" },
  { value: "completed", label: "Klara" },
  { value: "archived", label: "Arkiverade" },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  energi: <Sun size={14} />,
  bygg: <Building2 size={14} />,
  gym: <Dumbbell size={14} />,
  drift: <Wrench size={14} />,
  it: <Monitor size={14} />,
  hospitality: <UtensilsCrossed size={14} />,
  admin: <Shield size={14} />,
  ovrigt: <MoreHorizontal size={14} />,
};

const TASK_STATUSES: TaskStatus[] = [
  "todo",
  "in_progress",
  "waiting",
  "done",
];

/** Aggregerar tasks per project_id inkl. antal per status (matchar Supabase-schema) */
function buildTaskStatsByProject(tasks: Task[]) {
  const map = new Map<
    string,
    { total: number; done: number; byStatus: Record<TaskStatus, number> }
  >();

  const emptyByStatus = (): Record<TaskStatus, number> => ({
    todo: 0,
    in_progress: 0,
    waiting: 0,
    done: 0,
  });

  for (const t of tasks) {
    if (!t.project_id) continue;
    if (!map.has(t.project_id)) {
      map.set(t.project_id, {
        total: 0,
        done: 0,
        byStatus: emptyByStatus(),
      });
    }
    const row = map.get(t.project_id)!;
    row.total += 1;
    row.byStatus[t.status] += 1;
    if (t.status === "done") row.done += 1;
  }
  return map;
}

function projectStatusBadgeClass(status: ProjectStatus): string {
  switch (status) {
    case "active":
      return "bg-sea/10 text-sea border-sea/20";
    case "paused":
      return "bg-amber/10 text-amber-dark border-amber/20";
    case "completed":
      return "bg-moss/10 text-moss border-moss/20";
    case "archived":
      return "bg-stone-light/30 text-stone border-sand-dark";
    default:
      return "bg-sand-dark text-stone-dark";
  }
}

function getProgressColor(pct: number): string {
  if (pct >= 80) return "bg-moss";
  if (pct >= 40) return "bg-sea";
  if (pct > 0) return "bg-amber";
  return "bg-stone-light";
}

export default function ProjectsClient({
  initialProjects,
  initialTasks,
}: ProjectsClientProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "alla">(
    "active"
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteConfirmProject, setDeleteConfirmProject] =
    useState<Project | null>(null);
  const [busy, setBusy] = useState(false);

  const supabase = useMemo(() => createBrowserSupabase(), []);
  const { toast } = useToast();

  const taskCountsByProject = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tasks) {
      if (t.project_id) {
        counts[t.project_id] = (counts[t.project_id] || 0) + 1;
      }
    }
    return counts;
  }, [tasks]);

  const taskStatsByProject = useMemo(
    () => buildTaskStatsByProject(tasks),
    [tasks]
  );

  const filteredProjects = useMemo(() => {
    if (statusFilter === "alla") return projects;
    return projects.filter((p) => p.status === statusFilter);
  }, [projects, statusFilter]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const selectedProjectTasks = useMemo(() => {
    if (!selectedProjectId) return [];
    return tasks
      .filter((t) => t.project_id === selectedProjectId)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }, [tasks, selectedProjectId]);

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const overdueTasks = tasks.filter(
    (t) => isOverdue(t.deadline) && t.status !== "done"
  ).length;
  const activeCount = projects.filter((p) => p.status === "active").length;

  const refetchAll = useCallback(async () => {
    const [pr, tr] = await Promise.all([
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase
        .from("tasks")
        .select(
          "id, title, status, priority, project_id, deadline, assigned_to, created_at"
        )
        .order("created_at", { ascending: false }),
    ]);
    if (pr.error) {
      toast(`Kunde inte ladda projekt: ${pr.error.message}`, "error");
      return;
    }
    if (tr.error) {
      toast(`Kunde inte ladda uppgifter: ${tr.error.message}`, "error");
      return;
    }
    setProjects((pr.data || []) as Project[]);
    setTasks((tr.data || []) as Task[]);
  }, [supabase, toast]);

  async function handleSaveProject(data: Partial<Project>) {
    setBusy(true);
    try {
      if (data.id) {
        const { id, ...updates } = data;
        const { data: row, error } = await supabase
          .from("projects")
          .update(updates)
          .eq("id", id)
          .select()
          .single();
        if (error) {
          toast(`Kunde inte spara: ${error.message}`, "error");
          return;
        }
        setProjects((prev) =>
          prev.map((p) => (p.id === id ? (row as Project) : p))
        );
        toast("Projekt uppdaterat");
      } else {
        const insertPayload = {
          name: data.name,
          description: data.description ?? null,
          status: data.status ?? "active",
          category: data.category ?? "ovrigt",
          deadline: data.deadline ?? null,
        };
        const { data: row, error } = await supabase
          .from("projects")
          .insert(insertPayload)
          .select()
          .single();
        if (error) {
          toast(`Kunde inte skapa: ${error.message}`, "error");
          return;
        }
        setProjects((prev) => [row as Project, ...prev]);
        toast("Projekt skapat");
      }
      setModalOpen(false);
      setEditingProject(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmDelete(project: Project) {
    setBusy(true);
    try {
      // Koppla loss tasks så FK inte blockerar (utan att ändra DB-schema)
      const { error: unassignErr } = await supabase
        .from("tasks")
        .update({ project_id: null })
        .eq("project_id", project.id);
      if (unassignErr) {
        toast(`Kunde inte koppla loss uppgifter: ${unassignErr.message}`, "error");
        return;
      }

      const { error: delErr } = await supabase
        .from("projects")
        .delete()
        .eq("id", project.id);
      if (delErr) {
        toast(`Kunde inte ta bort projekt: ${delErr.message}`, "error");
        return;
      }

      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      setTasks((prev) =>
        prev.map((t) =>
          t.project_id === project.id ? { ...t, project_id: null } : t
        )
      );
      if (selectedProjectId === project.id) setSelectedProjectId(null);
      toast("Projekt borttaget", "info");
      setDeleteConfirmProject(null);
    } finally {
      setBusy(false);
    }
  }

  function openCreate() {
    setEditingProject(null);
    setModalOpen(true);
  }

  function openEdit(e: React.MouseEvent, project: Project) {
    e.stopPropagation();
    setEditingProject(project);
    setModalOpen(true);
  }

  function openDeleteConfirm(e: React.MouseEvent, project: Project) {
    e.stopPropagation();
    setDeleteConfirmProject(project);
  }

  function toggleSelectProject(id: string) {
    setSelectedProjectId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="flex h-screen overflow-hidden bg-sand">
      <Sidebar
        projects={projects}
        selectedProject={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        taskCounts={taskCountsByProject}
      />

      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display text-stone-dark">
              Projekt
            </h1>
            <p className="text-sm text-stone mt-1">
              Översikt, progress och uppgifter per projekt
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sea text-white text-sm font-medium rounded-lg hover:bg-sea-dark transition-colors shrink-0 disabled:opacity-50"
          >
            <Plus size={16} />
            Nytt projekt
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Aktiva projekt", value: activeCount, color: "text-sea" },
            {
              label: "Totala tasks",
              value: totalTasks,
              color: "text-stone-dark",
            },
            { label: "Klara tasks", value: doneTasks, color: "text-moss" },
            { label: "Försenade", value: overdueTasks, color: "text-rust" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-sand-dark px-4 py-3"
            >
              <div className={`text-2xl font-display ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-[10px] font-mono text-stone mt-0.5">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1 mb-6">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? "bg-sea text-white"
                  : "bg-white text-stone hover:text-stone-dark border border-sand-dark"
              }`}
            >
              {f.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void refetchAll()}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone border border-sand-dark bg-white hover:bg-sand-dark transition-colors ml-auto"
          >
            Uppdatera
          </button>
        </div>

        {filteredProjects.length === 0 ? (
          <p className="text-sm text-stone text-center py-12 bg-white rounded-xl border border-sand-dark">
            Inga projekt i denna vy. Ändra filter eller skapa ett nytt projekt.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProjects.map((project) => {
              const stats = taskStatsByProject.get(project.id);
              const total = stats?.total ?? 0;
              const done = stats?.done ?? 0;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const isSelected = selectedProjectId === project.id;

              return (
                <div
                  key={project.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleSelectProject(project.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleSelectProject(project.id);
                    }
                  }}
                  className={`text-left bg-white rounded-xl border transition-all px-4 py-4 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sea/30 ${
                    isSelected
                      ? "border-sea shadow-sm ring-1 ring-sea/20"
                      : "border-sand-dark hover:border-stone-light"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-stone shrink-0 mt-0.5">
                        {CATEGORY_ICONS[project.category]}
                      </span>
                      <h2 className="text-sm font-semibold text-stone-dark truncate">
                        {project.name}
                      </h2>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => openEdit(e, project)}
                        className="p-1.5 rounded-md text-stone hover:bg-sand-dark transition-colors"
                        title="Redigera"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => openDeleteConfirm(e, project)}
                        className="p-1.5 rounded-md text-stone hover:bg-rust/10 text-rust transition-colors"
                        title="Ta bort"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wide bg-sand-dark text-stone-dark">
                      {CATEGORY_LABELS[project.category]}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono border ${projectStatusBadgeClass(project.status)}`}
                    >
                      {PROJECT_STATUS_LABELS[project.status]}
                    </span>
                  </div>

                  <p className="text-xs text-stone line-clamp-2 mb-3 min-h-[2.5rem]">
                    {project.description?.trim()
                      ? project.description
                      : "Ingen beskrivning."}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-stone mb-1.5">
                    <span>
                      {done} / {total} klara
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-sand-dark rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getProgressColor(pct)}`}
                      style={{
                        width: `${total === 0 ? 0 : Math.max(pct, 2)}%`,
                      }}
                    />
                  </div>

                  {stats && total > 0 && (
                    <div className="mt-2 pt-2 border-t border-sand-dark/80 flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] font-mono text-stone">
                      {TASK_STATUSES.map((st) => (
                        <span key={st}>
                          {STATUS_LABELS[st]}: {stats.byStatus[st]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Uppgifter för valt projekt */}
        {selectedProject && (
          <section className="mt-10 bg-white rounded-xl border border-sand-dark overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-sand-dark bg-sand/40">
              <div className="flex items-center gap-2 min-w-0">
                <ListTodo size={16} className="text-sea shrink-0" />
                <h3 className="text-sm font-semibold text-stone-dark truncate">
                  Uppgifter: {selectedProject.name}
                </h3>
                <span className="text-xs font-mono text-stone shrink-0">
                  ({selectedProjectTasks.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProjectId(null)}
                className="p-1 rounded-md text-stone hover:bg-sand-dark transition-colors"
                title="Stäng"
              >
                <X size={16} />
              </button>
            </div>
            {selectedProjectTasks.length === 0 ? (
              <p className="text-sm text-stone italic px-4 py-8 text-center">
                Inga uppgifter kopplade till detta projekt.
              </p>
            ) : (
              <ul className="divide-y divide-sand-dark">
                {selectedProjectTasks.map((t) => (
                  <li
                    key={t.id}
                    className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4"
                  >
                    <p className="text-sm font-medium text-stone-dark flex-1 min-w-0 truncate">
                      {t.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone">
                      <span className="px-1.5 py-0.5 rounded bg-sand-dark font-mono">
                        {STATUS_LABELS[t.status]}
                      </span>
                      <span className="font-mono">
                        {PRIORITY_LABELS[t.priority]}
                      </span>
                      {t.deadline && (
                        <span className="font-mono">{t.deadline}</span>
                      )}
                      {t.assigned_to && (
                        <span>{ASSIGNEE_LABELS[t.assigned_to]}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        </div>
      </main>

      <ProjectModal
        open={modalOpen}
        project={editingProject}
        onClose={() => {
          setModalOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
      />

      {deleteConfirmProject && (
        <div
          className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-project-title"
        >
          <div className="bg-white rounded-xl border border-sand-dark shadow-xl max-w-md w-full p-5">
            <h2
              id="delete-project-title"
              className="text-lg font-display text-stone-dark mb-2"
            >
              Ta bort projekt?
            </h2>
            <p className="text-sm text-stone mb-4">
              &quot;{deleteConfirmProject.name}&quot; tas bort permanent. Kopplade
              uppgifter flyttas till &quot;inget projekt&quot;.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setDeleteConfirmProject(null)}
                className="px-4 py-2 text-sm text-stone hover:text-stone-dark transition-colors"
              >
                Avbryt
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleConfirmDelete(deleteConfirmProject)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-rust text-white hover:bg-rust-dark transition-colors disabled:opacity-50"
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

