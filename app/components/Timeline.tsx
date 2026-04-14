"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Project,
  Contact,
  Task,
  TaskWithRelations,
  STATUS_LABELS,
  PRIORITY_LABELS,
  ASSIGNEE_LABELS,
} from "@/lib/types";
import { createBrowserSupabase } from "@/lib/supabase";
import { useToast } from "./Toast";
import { useRealtimeDeadlineTasks } from "@/lib/hooks/useRealtimeDeadlineTasks";
import {
  isCalendarOverdue,
  taskBarBgClass,
  taskChipClass,
} from "@/lib/calendarProjectColor";
import Sidebar from "./Sidebar";
import TaskModal from "./TaskModal";
import CommandSearch from "./CommandSearch";
import { getNextStatus } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarRange,
  List,
  Search,
} from "lucide-react";

type ViewMode = "month" | "week" | "list";

interface TimelineProps {
  initialDeadlineTasks: TaskWithRelations[];
  initialProjects: Project[];
  initialContacts: Contact[];
  taskCountsByProject: Record<string, number>;
}

const WEEKDAY_LABELS = ["mån", "tis", "ons", "tor", "fre", "lör", "sön"];

function mondayIndexFromSunday(jsDay: number): number {
  return (jsDay + 6) % 7;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, d.getDate());
}

function startOfWeekMonday(d: Date): Date {
  const x = startOfDay(d);
  const dow = mondayIndexFromSunday(x.getDay());
  x.setDate(x.getDate() - dow);
  return x;
}

function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDeadlineLocal(ymd: string): Date {
  return new Date(`${ymd}T12:00:00`);
}

function sameLocalDate(a: Date, b: Date): boolean {
  return toYmdLocal(a) === toYmdLocal(b);
}

function isTodayLocal(d: Date): boolean {
  return sameLocalDate(d, new Date());
}

/** 42 dagar: måndag i första veckan som rör månaden, + 6 veckor */
function buildMonthGrid(monthAnchor: Date): Date[] {
  const firstOfMonth = new Date(
    monthAnchor.getFullYear(),
    monthAnchor.getMonth(),
    1
  );
  const start = startOfWeekMonday(firstOfMonth);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(addDays(start, i));
  }
  return days;
}

function getISOWeekLocal(d: Date): number {
  const copy = new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  );
  const dayNum = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  return Math.ceil(
    ((copy.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
}

function formatWeekRangeTitle(weekAnchor: Date): string {
  const mon = startOfWeekMonday(weekAnchor);
  const sun = addDays(mon, 6);
  const sameMonth = mon.getMonth() === sun.getMonth();
  const left = mon.toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
  });
  const right = sun.toLocaleDateString("sv-SE", {
    day: "numeric",
    month: sameMonth ? undefined : "short",
    year: "numeric",
  });
  const w = getISOWeekLocal(mon);
  return `v.${w} · ${left}–${right}`;
}

export default function Timeline({
  initialDeadlineTasks,
  initialProjects,
  initialContacts,
  taskCountsByProject,
}: TimelineProps) {
  const [projects] = useState<Project[]>(initialProjects);
  const [contacts] = useState<Contact[]>(initialContacts);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(
    null
  );
  const [isNarrow, setIsNarrow] = useState(false);
  const wasNarrow = useRef(false);

  const supabase = useMemo(() => createBrowserSupabase(), []);
  const { toast } = useToast();

  const {
    tasks,
    optimisticUpdate,
    optimisticInsert,
    optimisticDelete,
  } = useRealtimeDeadlineTasks(initialDeadlineTasks, supabase, toast);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const fn = () => setIsNarrow(mq.matches);
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  useEffect(() => {
    if (isNarrow && !wasNarrow.current) setView("list");
    wasNarrow.current = isNarrow;
  }, [isNarrow]);

  const visibleTasks = useMemo(() => {
    if (!selectedProject) return tasks;
    return tasks.filter((t) => t.project_id === selectedProject);
  }, [tasks, selectedProject]);

  const tasksByDeadlineYmd = useMemo(() => {
    const map = new Map<string, TaskWithRelations[]>();
    for (const t of visibleTasks) {
      if (!t.deadline) continue;
      const list = map.get(t.deadline) || [];
      list.push(t);
      map.set(t.deadline, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.title.localeCompare(b.title, "sv"));
    }
    return map;
  }, [visibleTasks]);

  const monthAnchor = useMemo(
    () => new Date(cursor.getFullYear(), cursor.getMonth(), 1),
    [cursor]
  );

  const monthTitle = monthAnchor.toLocaleDateString("sv-SE", {
    month: "long",
    year: "numeric",
  });

  const headerTitle = useMemo(() => {
    if (view === "month") {
      return monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1);
    }
    if (view === "week") return formatWeekRangeTitle(cursor);
    return "Deadlines · lista";
  }, [view, cursor, monthTitle]);

  const listWeekGroups = useMemo(() => {
    const sorted = [...visibleTasks].sort((a, b) =>
      (a.deadline || "").localeCompare(b.deadline || "")
    );
    type Group = { weekStart: Date; tasks: TaskWithRelations[] };
    const map = new Map<string, Group>();
    for (const t of sorted) {
      if (!t.deadline) continue;
      const d = parseDeadlineLocal(t.deadline);
      const ws = startOfWeekMonday(d);
      const key = toYmdLocal(ws);
      if (!map.has(key)) map.set(key, { weekStart: ws, tasks: [] });
      map.get(key)!.tasks.push(t);
    }
    return Array.from(map.values()).sort(
      (a, b) => a.weekStart.getTime() - b.weekStart.getTime()
    );
  }, [visibleTasks]);

  function goPrev() {
    if (view === "month") setCursor((c) => addMonths(c, -1));
    else if (view === "week")
      setCursor((c) => addDays(startOfWeekMonday(c), -7));
  }

  function goNext() {
    if (view === "month") setCursor((c) => addMonths(c, 1));
    else if (view === "week")
      setCursor((c) => addDays(startOfWeekMonday(c), 7));
  }

  function goToday() {
    setCursor(startOfDay(new Date()));
  }

  const openTask = useCallback((t: TaskWithRelations) => {
    setEditingTask(t);
    setModalOpen(true);
  }, []);

  async function handleStatusAdvance(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const nextStatus = getNextStatus(task.status);
    if (nextStatus === task.status) return;
    await optimisticUpdate(taskId, { status: nextStatus });
    toast(`Status: ${STATUS_LABELS[nextStatus]}`);
  }

  async function handleSave(data: Partial<Task>) {
    if (data.id) {
      const { id, ...updates } = data;
      await optimisticUpdate(id, updates);
      toast("Uppgift sparad");
    } else {
      await optimisticInsert(data);
      toast("Uppgift skapad");
    }
    setModalOpen(false);
    setEditingTask(null);
  }

  async function handleDelete(taskId: string) {
    await optimisticDelete(taskId);
    toast("Uppgift raderad", "info");
    setModalOpen(false);
    setEditingTask(null);
  }

  const monthGrid = buildMonthGrid(monthAnchor);
  const weekDays = useMemo(() => {
    const mon = startOfWeekMonday(cursor);
    return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  }, [cursor]);

  const viewToggleClass = (v: ViewMode) =>
    `inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      view === v
        ? "bg-sea text-white shadow-sm"
        : "bg-white text-stone-dark border border-sand-dark hover:border-stone-light"
    }`;

  return (
    <div className="flex h-screen overflow-hidden bg-sand">
      <Sidebar
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={setSelectedProject}
        taskCounts={taskCountsByProject}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="shrink-0 border-b border-sand-dark bg-white/90 backdrop-blur-sm px-4 py-4 md:px-6">
          <div className="flex flex-col gap-4 max-w-6xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl md:text-2xl font-display text-stone-dark">
                  Kalender
                </h1>
                <p className="text-sm text-stone mt-0.5">{headerTitle}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const ev = new KeyboardEvent("keydown", {
                      key: "k",
                      metaKey: true,
                    });
                    document.dispatchEvent(ev);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-stone bg-white border border-sand-dark rounded-lg hover:border-stone-light transition-colors"
                >
                  <Search size={14} />
                  <span className="hidden sm:inline">Sök</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={viewToggleClass("month")}
                  onClick={() => setView("month")}
                >
                  <CalendarDays size={16} />
                  Månad
                </button>
                <button
                  type="button"
                  className={viewToggleClass("week")}
                  onClick={() => setView("week")}
                >
                  <CalendarRange size={16} />
                  Vecka
                </button>
                <button
                  type="button"
                  className={viewToggleClass("list")}
                  onClick={() => setView("list")}
                >
                  <List size={16} />
                  Lista
                </button>
              </div>

              {view !== "list" && (
                <div className="flex items-center gap-1 flex-wrap justify-center lg:justify-end">
                  <button
                    type="button"
                    onClick={goPrev}
                    className="p-2 rounded-lg border border-sand-dark bg-white text-stone-dark hover:bg-sand-dark transition-colors"
                    aria-label="Föregående"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={goToday}
                    className="px-3 py-2 rounded-lg border border-sand-dark bg-sand text-sm font-medium text-stone-dark hover:bg-sand-dark transition-colors"
                  >
                    Idag
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="p-2 rounded-lg border border-sand-dark bg-white text-stone-dark hover:bg-sand-dark transition-colors"
                    aria-label="Nästa"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-6xl mx-auto w-full px-4 py-6 md:px-6 md:py-8">
            {view === "month" && (
              <div className="rounded-2xl border border-sand-dark bg-white shadow-sm overflow-hidden">
                <div className="grid grid-cols-7 border-b border-sand-dark bg-sand-dark/40">
                  {WEEKDAY_LABELS.map((d) => (
                    <div
                      key={d}
                      className="py-2 text-center text-[11px] font-mono uppercase tracking-wider text-stone"
                    >
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 auto-rows-fr">
                  {monthGrid.map((day) => {
                    const ymd = toYmdLocal(day);
                    const inMonth =
                      day.getMonth() === monthAnchor.getMonth() &&
                      day.getFullYear() === monthAnchor.getFullYear();
                    const dayTasks = tasksByDeadlineYmd.get(ymd) || [];
                    const today = isTodayLocal(day);
                    const maxChips = 3;
                    const extra = Math.max(0, dayTasks.length - maxChips);

                    return (
                      <div
                        key={ymd}
                        className={`min-h-[88px] md:min-h-[110px] border-b border-r border-sand-dark p-1.5 md:p-2 flex flex-col gap-1 ${
                          !inMonth ? "bg-sand/60 text-stone" : "bg-white"
                        } ${today ? "ring-2 ring-inset ring-sea/50 bg-sea/5" : ""}`}
                      >
                        <div
                          className={`text-xs font-mono shrink-0 ${
                            today
                              ? "text-sea font-semibold"
                              : inMonth
                                ? "text-stone-dark"
                                : "text-stone"
                          }`}
                        >
                          {day.getDate()}
                        </div>
                        <div className="flex flex-col gap-0.5 min-h-0 flex-1 overflow-hidden">
                          {dayTasks.slice(0, maxChips).map((t) => {
                            const overdue = isCalendarOverdue(
                              t.deadline,
                              t.status
                            );
                            const chip = taskChipClass(
                              t.project_id,
                              overdue
                            );
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => openTask(t)}
                                title={t.title}
                                className={`w-full text-left truncate rounded px-1 py-0.5 text-[10px] md:text-[11px] font-medium leading-tight hover:brightness-95 transition-all ${chip}`}
                              >
                                {t.title}
                              </button>
                            );
                          })}
                          {extra > 0 && (
                            <span className="text-[10px] font-mono text-stone pl-0.5">
                              +{extra} till
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {view === "week" && (
              <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 md:gap-4">
                {weekDays.map((day) => {
                  const ymd = toYmdLocal(day);
                  const dayTasks = tasksByDeadlineYmd.get(ymd) || [];
                  const today = isTodayLocal(day);
                  return (
                    <div
                      key={ymd}
                      className={`rounded-xl border flex flex-col min-h-[200px] md:min-h-[280px] overflow-hidden ${
                        today
                          ? "border-sea bg-sea/5 shadow-sm"
                          : "border-sand-dark bg-white"
                      }`}
                    >
                      <div
                        className={`px-3 py-2.5 border-b border-sand-dark ${
                          today ? "bg-sea/10" : "bg-sand-dark/30"
                        }`}
                      >
                        <p className="text-[10px] font-mono uppercase text-stone">
                          {WEEKDAY_LABELS[mondayIndexFromSunday(day.getDay())]}
                        </p>
                        <p
                          className={`text-lg font-display ${
                            today ? "text-sea" : "text-stone-dark"
                          }`}
                        >
                          {day.getDate()}{" "}
                          <span className="text-sm font-sans font-normal text-stone">
                            {day.toLocaleDateString("sv-SE", {
                              month: "short",
                            })}
                          </span>
                        </p>
                      </div>
                      <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {dayTasks.length === 0 ? (
                          <p className="text-xs text-stone italic px-1 py-2">
                            Inget
                          </p>
                        ) : (
                          dayTasks.map((t) => {
                            const overdue = isCalendarOverdue(
                              t.deadline,
                              t.status
                            );
                            const barBg = taskBarBgClass(
                              t.project_id,
                              overdue
                            );
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => openTask(t)}
                                className={`w-full text-left rounded-lg border border-sand-dark p-2.5 hover:border-stone-light transition-colors bg-white ${
                                  overdue
                                    ? "ring-1 ring-rust/30 bg-rust/[0.06]"
                                    : ""
                                }`}
                              >
                                <div
                                  className={`h-1 w-full rounded-full mb-2 ${barBg}`}
                                  aria-hidden
                                />
                                <p className="text-xs font-medium text-stone-dark leading-snug mb-1.5 line-clamp-3">
                                  {t.title}
                                </p>
                                <div className="flex flex-wrap gap-1 items-center text-[10px] text-stone">
                                  {t.projects && (
                                    <span className="px-1.5 py-0.5 rounded bg-sand-dark font-mono truncate max-w-full text-stone-dark">
                                      {t.projects.name}
                                    </span>
                                  )}
                                  <span className="px-1.5 py-0.5 rounded bg-sand font-mono text-stone-dark">
                                    {PRIORITY_LABELS[t.priority]}
                                  </span>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {view === "list" && (
              <div className="space-y-8">
                {listWeekGroups.length === 0 ? (
                  <p className="text-sm text-stone text-center py-12 bg-white rounded-xl border border-sand-dark">
                    Inga tasks med deadline i denna vy.
                  </p>
                ) : (
                  listWeekGroups.map(({ weekStart, tasks: weekTasks }) => {
                    const wn = getISOWeekLocal(weekStart);
                    const label = weekStart.toLocaleDateString("sv-SE", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    });
                    return (
                      <section key={toYmdLocal(weekStart)}>
                        <h2 className="text-sm font-mono uppercase tracking-widest text-stone mb-3 flex items-center gap-2">
                          <span className="text-stone-dark font-semibold">
                            Vecka {wn}
                          </span>
                          <span className="text-stone">·</span>
                          <span>börjar {label}</span>
                        </h2>
                        <ul className="rounded-xl border border-sand-dark bg-white divide-y divide-sand-dark overflow-hidden">
                          {weekTasks.map((t) => {
                            const overdue = isCalendarOverdue(
                              t.deadline,
                              t.status
                            );
                            return (
                              <li key={t.id}>
                                <button
                                  type="button"
                                  onClick={() => openTask(t)}
                                  className={`w-full text-left px-4 py-3 flex flex-col md:flex-row md:items-center gap-2 md:gap-6 hover:bg-sand/50 transition-colors ${
                                    overdue ? "bg-rust/5" : ""
                                  }`}
                                >
                                  <span className="text-xs font-mono text-stone w-28 shrink-0">
                                    {t.deadline}
                                  </span>
                                  <span className="text-sm font-medium text-stone-dark flex-1 min-w-0">
                                    {t.title}
                                  </span>
                                  <span className="text-xs text-stone truncate md:w-36">
                                    {t.projects?.name ?? "—"}
                                  </span>
                                  <span className="text-[11px] px-2 py-0.5 rounded bg-sand-dark font-mono shrink-0">
                                    {STATUS_LABELS[t.status]}
                                  </span>
                                  <span className="text-[11px] px-2 py-0.5 rounded bg-sand font-mono shrink-0">
                                    {PRIORITY_LABELS[t.priority]}
                                  </span>
                                  <span className="text-xs text-stone shrink-0">
                                    {t.assigned_to
                                      ? ASSIGNEE_LABELS[t.assigned_to]
                                      : "—"}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <CommandSearch
        tasks={tasks}
        onSelectTask={openTask}
        onStatusAdvance={handleStatusAdvance}
      />

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
