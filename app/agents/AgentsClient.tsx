"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AgentExecution,
  AgentName,
  ASSIGNEE_LABELS,
  Contact,
  ExecutionAgent,
  PRIORITY_LABELS,
  Project,
  Task,
  TaskAssignee,
  TaskPriority,
  TaskWithRelations,
} from "@/lib/types";
import { createBrowserSupabase } from "@/lib/supabase";
import Sidebar from "@/app/components/Sidebar";
import TaskModal from "@/app/components/TaskModal";
import StatusCircle from "@/app/components/StatusCircle";
import DeadlineLabel from "@/app/components/DeadlineLabel";
import { useToast } from "@/app/components/Toast";
import {
  ArrowRightLeft,
  Bot,
  Brain,
  Plus,
  Search,
  User,
  Activity,
  Inbox,
} from "lucide-react";

const TASK_SELECT =
  "*, projects(id, name, category), contacts(id, name, company)";

const TAB_ORDER: AgentName[] = ["claude", "jarvis", "leopold"];

const CARD_ORDER: AgentName[] = ["leopold", "claude", "jarvis"];

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const EXEC_AGENT_LABELS: Record<ExecutionAgent, string> = {
  leopold: "Leopold",
  claude: "Claude",
  jarvis: "Jarvis",
  system: "System",
};

const PRIORITY_DOT: Record<TaskPriority, string> = {
  urgent: "bg-rust",
  high: "bg-amber",
  medium: "bg-amber/70",
  low: "bg-stone-light",
};

const EXEC_STATUS_STYLE: Record<AgentExecution["status"], string> = {
  started: "text-stone bg-sand-dark",
  running: "text-sea bg-sea/10",
  completed: "text-moss bg-moss/15",
  failed: "text-rust bg-rust/10",
};

const EXEC_STATUS_LABELS: Record<AgentExecution["status"], string> = {
  started: "Startad",
  running: "Kör",
  completed: "Klar",
  failed: "Misslyckades",
};

function sortAgentTasks(a: TaskWithRelations, b: TaskWithRelations): number {
  const pa = PRIORITY_ORDER[a.priority];
  const pb = PRIORITY_ORDER[b.priority];
  if (pa !== pb) return pa - pb;
  const da = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
  const db = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
  return da - db;
}

function formatRelativeSv(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffM = Math.floor(diffMs / 60000);
  if (diffM < 1) return "nyss";
  if (diffM < 60) return `${diffM} min sedan`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH} tim sedan`;
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);
  if (d >= startYesterday && d < startToday) {
    return `igår ${d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}`;
  }
  return d.toLocaleString("sv-SE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function summarizeOutput(output: Record<string, unknown> | null): string {
  if (!output) return "—";
  if (typeof output.summary === "string") return output.summary;
  if (typeof output.message === "string") return output.message;
  const s = JSON.stringify(output);
  if (s.length <= 100) return s;
  return `${s.slice(0, 97)}…`;
}

async function patchTask(
  taskId: string,
  updates: Partial<Task>
): Promise<TaskWithRelations | null> {
  const res = await fetch(`/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) return null;
  return (await res.json()) as TaskWithRelations;
}

interface AgentsClientProps {
  initialTasksOpen: TaskWithRelations[];
  initialExecutions: AgentExecution[];
  projects: Project[];
  contacts: Contact[];
  taskCountsByProject: Record<string, number>;
}

export default function AgentsClient({
  initialTasksOpen,
  initialExecutions,
  projects,
  contacts,
  taskCountsByProject,
}: AgentsClientProps) {
  const [tasksOpen, setTasksOpen] = useState<TaskWithRelations[]>(initialTasksOpen);
  const [executions] = useState<AgentExecution[]>(initialExecutions);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [tab, setTab] = useState<AgentName>("claude");
  const [jarvisOnline, setJarvisOnline] = useState<boolean | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSearch, setAssignSearch] = useState("");
  const [moveOpenFor, setMoveOpenFor] = useState<string | null>(null);
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const { toast } = useToast();

  useEffect(() => {
    function poll() {
      fetch("/api/jarvis/status")
        .then((r) => r.json())
        .then((d: { online?: boolean }) =>
          setJarvisOnline(Boolean(d.online))
        )
        .catch(() => setJarvisOnline(false));
    }
    poll();
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, []);

  const tasksForTab = useMemo(() => {
    return tasksOpen
      .filter((t) => t.assigned_to === tab)
      .slice()
      .sort(sortAgentTasks);
  }, [tasksOpen, tab]);

  const pickerCandidates = useMemo(() => {
    const q = assignSearch.trim().toLowerCase();
    return tasksOpen
      .filter((t) => t.assigned_to !== tab)
      .filter((t) => {
        if (!q) return true;
        const title = t.title.toLowerCase();
        const proj = t.projects?.name?.toLowerCase() ?? "";
        return title.includes(q) || proj.includes(q);
      })
      .slice()
      .sort(sortAgentTasks);
  }, [tasksOpen, tab, assignSearch]);

  const countsByAgent = useMemo(() => {
    const c: Record<AgentName, number> = {
      leopold: 0,
      claude: 0,
      jarvis: 0,
    };
    for (const t of tasksOpen) {
      if (t.assigned_to && t.status !== "done") {
        c[t.assigned_to] += 1;
      }
    }
    return c;
  }, [tasksOpen]);

  const latestByAgent = useMemo(() => {
    const latest: Partial<Record<AgentName | "system", AgentExecution>> = {};
    for (const ex of executions) {
      if (ex.agent === "system") {
        if (!latest.system) latest.system = ex;
        continue;
      }
      const a = ex.agent;
      if (!latest[a]) latest[a] = ex;
    }
    return latest;
  }, [executions]);

  const openEdit = useCallback((task: TaskWithRelations) => {
    setEditingTask(task);
    setModalOpen(true);
  }, []);

  const openTaskById = useCallback(
    async (taskId: string) => {
      const { data, error } = await supabase
        .from("tasks")
        .select(TASK_SELECT)
        .eq("id", taskId)
        .single();
      if (error || !data) {
        toast("Kunde inte ladda uppgiften", "info");
        return;
      }
      openEdit(data as TaskWithRelations);
    },
    [supabase, toast, openEdit]
  );

  const applyTaskUpdate = useCallback((updated: TaskWithRelations) => {
    setTasksOpen((prev) => {
      if (updated.status === "done") {
        return prev.filter((t) => t.id !== updated.id);
      }
      const i = prev.findIndex((t) => t.id === updated.id);
      if (i < 0) return [...prev, updated];
      const next = [...prev];
      next[i] = updated;
      return next;
    });
    setEditingTask((cur) => (cur?.id === updated.id ? updated : cur));
  }, []);

  const assignTo = useCallback(
    async (taskId: string, agent: TaskAssignee) => {
      let snapshot: TaskWithRelations[] = [];
      setTasksOpen((p) => {
        snapshot = p;
        return p.map((t) =>
          t.id === taskId ? { ...t, assigned_to: agent } : t
        );
      });
      const updated = await patchTask(taskId, { assigned_to: agent });
      if (!updated) {
        setTasksOpen(snapshot);
        toast("Kunde inte tilldela uppgiften", "info");
        return;
      }
      applyTaskUpdate(updated);
      toast(`Tilldelad till ${ASSIGNEE_LABELS[agent]}`, "success");
      setAssignOpen(false);
      setAssignSearch("");
      setMoveOpenFor(null);
    },
    [applyTaskUpdate, toast]
  );

  const handleSave = useCallback(
    async (data: Partial<Task>) => {
      if (!data.id) return;
      const updated = await patchTask(data.id, data);
      if (!updated) {
        toast("Kunde inte spara", "info");
        return;
      }
      applyTaskUpdate(updated);
      toast("Uppgift sparad", "success");
    },
    [applyTaskUpdate, toast]
  );

  const handleDelete = useCallback(
    async (taskId: string) => {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) {
        toast("Kunde inte radera", "info");
        return;
      }
      setTasksOpen((p) => p.filter((t) => t.id !== taskId));
      setModalOpen(false);
      setEditingTask(null);
      toast("Uppgift raderad", "info");
    },
    [toast]
  );

  const otherAgents = (current: AgentName): AgentName[] =>
    CARD_ORDER.filter((a) => a !== current);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={setSelectedProject}
        taskCounts={taskCountsByProject}
      />

      <main className="flex-1 overflow-y-auto bg-sand/40">
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-8">
          <header>
            <h1 className="text-2xl font-display text-stone-dark tracking-tight">
              Agenter
            </h1>
            <p className="text-sm text-stone mt-1 font-mono">
              Översikt, tilldelade uppgifter och exekveringshistorik
            </p>
          </header>

          {/* A. Agentkort */}
          <section aria-label="Agenter">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CARD_ORDER.map((agent) => {
                const count = countsByAgent[agent];
                const last =
                  agent === "leopold" || agent === "claude" || agent === "jarvis"
                    ? latestByAgent[agent]
                    : undefined;
                const icon =
                  agent === "leopold" ? (
                    <User size={20} className="text-stone-dark" />
                  ) : agent === "claude" ? (
                    <Brain size={20} className="text-sea" />
                  ) : (
                    <Bot size={20} className="text-stone-dark" />
                  );
                const online =
                  agent === "leopold"
                    ? true
                    : agent === "claude"
                      ? true
                      : jarvisOnline === true;
                const statusLabel =
                  agent === "leopold"
                    ? "Aktiv"
                    : agent === "claude"
                      ? "Tillgänglig"
                      : jarvisOnline === null
                        ? "Kollar…"
                        : jarvisOnline
                          ? "Online"
                          : "Offline";

                return (
                  <div
                    key={agent}
                    className="rounded-xl border border-sand-dark bg-white px-4 py-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="p-2 rounded-lg bg-sand-dark/60">
                          {icon}
                        </span>
                        <div>
                          <h2 className="font-display text-lg text-stone-dark">
                            {ASSIGNEE_LABELS[agent]}
                          </h2>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                online ? "bg-moss" : "bg-stone-light"
                              }`}
                              title={statusLabel}
                            />
                            <span className="text-xs font-mono text-stone">
                              {statusLabel}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <dl className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <dt className="text-stone font-mono text-xs">
                          Öppna uppgifter
                        </dt>
                        <dd className="font-mono text-stone-dark">{count}</dd>
                      </div>
                      <div>
                        <dt className="text-stone font-mono text-xs mb-0.5">
                          Senaste aktivitet
                        </dt>
                        <dd className="text-stone-dark text-xs leading-snug">
                          {last ? (
                            <>
                              <span className="font-mono text-stone">
                                {formatRelativeSv(last.created_at)}
                              </span>
                              {" · "}
                              {last.action}
                            </>
                          ) : (
                            <span className="text-stone">Ingen logg ännu</span>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>
                );
              })}
            </div>
          </section>

          {/* B. Tilldelade uppgifter */}
          <section
            aria-label="Tilldelade uppgifter"
            className="rounded-xl border border-sand-dark bg-white overflow-hidden shadow-sm"
          >
            <div className="border-b border-sand-dark px-4 pt-3 flex flex-wrap gap-1">
              {TAB_ORDER.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setTab(a);
                    setMoveOpenFor(null);
                  }}
                  className={`px-3 py-2 text-sm rounded-t-lg font-medium transition-colors ${
                    tab === a
                      ? "bg-sand text-stone-dark"
                      : "text-stone hover:bg-sand-dark/50"
                  }`}
                >
                  {ASSIGNEE_LABELS[a]}
                </button>
              ))}
            </div>

            <div className="px-4 py-3 flex items-center justify-between gap-2 border-b border-sand-dark/80">
              <p className="text-xs font-mono text-stone">
                {tasksForTab.length} uppgift
                {tasksForTab.length !== 1 ? "er" : ""} tilldelade{" "}
                {ASSIGNEE_LABELS[tab]}
              </p>
              <button
                type="button"
                onClick={() => {
                  setAssignOpen(true);
                  setAssignSearch("");
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-sand-dark bg-white text-stone-dark hover:border-sea/40 hover:bg-sea/5 transition-colors"
              >
                <Plus size={15} />
                Tilldela task
              </button>
            </div>

            {tasksForTab.length === 0 ? (
              <div className="px-6 py-12 flex flex-col items-center text-center text-stone">
                <Inbox className="mb-2 opacity-40" size={32} />
                <p className="text-sm">
                  Inga öppna uppgifter för {ASSIGNEE_LABELS[tab]}.
                </p>
                <p className="text-xs font-mono mt-1">
                  Använd &quot;Tilldela task&quot; för att lägga till.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-sand-dark">
                {tasksForTab.map((task) => (
                  <li key={task.id} className="relative">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => openEdit(task)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openEdit(task);
                        }
                      }}
                      className="w-full text-left px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 hover:bg-sand/50 transition-colors cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-stone-dark block truncate">
                          {task.title}
                        </span>
                        {task.projects && (
                          <span className="inline-block mt-1 text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded bg-sand-dark text-stone">
                            {task.projects.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0 flex-wrap">
                        <span
                          className={`w-2 h-2 rounded-full ${PRIORITY_DOT[task.priority]}`}
                          title={PRIORITY_LABELS[task.priority]}
                        />
                        <span className="text-xs font-mono text-stone w-16">
                          {PRIORITY_LABELS[task.priority]}
                        </span>
                        <div onClick={(e) => e.stopPropagation()}>
                          <StatusCircle
                            status={task.status}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <DeadlineLabel deadline={task.deadline} />
                        <div
                          className="relative"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setMoveOpenFor((id) =>
                                id === task.id ? null : task.id
                              )
                            }
                            className="p-1.5 rounded-md border border-transparent hover:border-sand-dark text-stone hover:text-stone-dark"
                            title="Flytta till annan agent"
                          >
                            <ArrowRightLeft size={16} />
                          </button>
                          {moveOpenFor === task.id && (
                            <div className="absolute right-0 top-full mt-1 z-20 min-w-[160px] rounded-lg border border-sand-dark bg-white shadow-lg py-1">
                              {otherAgents(tab).map((target) => (
                                <button
                                  key={target}
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-sand"
                                  onClick={() => assignTo(task.id, target)}
                                >
                                  {ASSIGNEE_LABELS[target]}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* C. Exekveringslogg */}
          <section
            aria-label="Exekveringslogg"
            className="rounded-xl border border-sand-dark bg-white overflow-hidden shadow-sm"
          >
            <div className="px-4 py-3 border-b border-sand-dark flex items-center gap-2">
              <Activity size={16} className="text-sea" />
              <h2 className="font-display text-lg text-stone-dark">
                Exekveringslogg
              </h2>
            </div>
            {executions.length === 0 ? (
              <div className="px-6 py-12 flex flex-col items-center text-center text-stone">
                <Activity className="mb-2 opacity-30" size={36} />
                <p className="text-sm max-w-md">
                  Inga exekveringar ännu — tilldela en task till Claude eller
                  Jarvis för att komma igång.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-mono uppercase tracking-wide text-stone border-b border-sand-dark bg-sand/30">
                      <th className="px-4 py-2 whitespace-nowrap">Tidpunkt</th>
                      <th className="px-4 py-2 whitespace-nowrap">Agent</th>
                      <th className="px-4 py-2">Åtgärd</th>
                      <th className="px-4 py-2">Task</th>
                      <th className="px-4 py-2 whitespace-nowrap">Status</th>
                      <th className="px-4 py-2 min-w-[120px]">Resultat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand-dark">
                    {executions.map((ex) => (
                      <tr key={ex.id} className="hover:bg-sand/40">
                        <td className="px-4 py-2 font-mono text-xs text-stone whitespace-nowrap">
                          {formatRelativeSv(ex.created_at)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-stone-dark">
                            {ex.agent === "claude" ? (
                              <Brain size={14} className="text-sea" />
                            ) : ex.agent === "jarvis" ? (
                              <Bot size={14} />
                            ) : ex.agent === "leopold" ? (
                              <User size={14} />
                            ) : (
                              <Activity size={14} className="text-stone" />
                            )}
                            <span className="text-xs">
                              {EXEC_AGENT_LABELS[ex.agent]}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-2 text-stone-dark">{ex.action}</td>
                        <td className="px-4 py-2">
                          {ex.tasks && ex.task_id ? (
                            <button
                              type="button"
                              onClick={() => openTaskById(ex.task_id as string)}
                              className="text-sea hover:underline text-left"
                            >
                              {ex.tasks.title}
                            </button>
                          ) : (
                            <span className="text-stone font-mono text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-block text-xs font-mono px-2 py-0.5 rounded ${EXEC_STATUS_STYLE[ex.status]}`}
                          >
                            {EXEC_STATUS_LABELS[ex.status]}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-stone max-w-[220px] truncate" title={summarizeOutput(ex.output)}>
                          {ex.error && ex.status === "failed"
                            ? ex.error.slice(0, 80)
                            : summarizeOutput(ex.output)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      {assignOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-dark/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assign-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setAssignOpen(false);
              setAssignSearch("");
            }
          }}
        >
          <div
            className="bg-white rounded-xl border border-sand-dark shadow-xl max-w-md w-full max-h-[min(80vh,520px)] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-sand-dark flex items-center justify-between">
              <h3
                id="assign-title"
                className="font-display text-lg text-stone-dark"
              >
                Tilldela till {ASSIGNEE_LABELS[tab]}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setAssignOpen(false);
                  setAssignSearch("");
                }}
                className="text-sm text-stone hover:text-stone-dark font-mono"
              >
                Stäng
              </button>
            </div>
            <div className="px-4 py-2 border-b border-sand-dark">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone"
                />
                <input
                  type="search"
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  placeholder="Sök titel eller projekt…"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-sand-dark font-mono"
                />
              </div>
            </div>
            <ul className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-sand-dark">
              {pickerCandidates.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-stone">
                  Inga matchande uppgifter att tilldela.
                </li>
              ) : (
                pickerCandidates.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => assignTo(t.id, tab)}
                      className="w-full text-left px-4 py-3 hover:bg-sand flex flex-col gap-0.5"
                    >
                      <span className="font-medium text-stone-dark">
                        {t.title}
                      </span>
                      <span className="text-xs font-mono text-stone">
                        {t.projects?.name ?? "Utan projekt"}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}

      <TaskModal
        open={modalOpen}
        task={editingTask}
        projects={projects}
        contacts={contacts}
        onClose={() => {
          setModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
