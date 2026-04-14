"use client";

import { Project, Task, CATEGORY_LABELS } from "@/lib/types";
import { isOverdue } from "@/lib/utils";
import {
  Sun, Building2, Dumbbell, Wrench, Monitor,
  UtensilsCrossed, Shield, MoreHorizontal, Clock,
} from "lucide-react";

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

interface ProjectProgressProps {
  projects: Project[];
  tasks: Task[];
  onSelectProject?: (id: string) => void;
}

function getProgressColor(pct: number): string {
  if (pct >= 80) return "bg-moss";
  if (pct >= 40) return "bg-sea";
  if (pct > 0) return "bg-amber";
  return "bg-stone-light";
}

function formatDeadline(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return `${Math.abs(days)}d försenad`;
  if (days === 0) return "Idag";
  if (days <= 7) return `${days}d kvar`;
  return date.toLocaleDateString("sv-SE", { month: "short", day: "numeric" });
}

export default function ProjectProgress({
  projects,
  tasks,
  onSelectProject,
}: ProjectProgressProps) {
  // Filtrera bara aktiva projekt med minst 1 task
  const activeProjects = projects.filter((p) => p.status === "active");

  return (
    <div className="space-y-2">
      {activeProjects.length === 0 && (
        <p className="text-sm text-stone text-center py-8">Inga aktiva projekt</p>
      )}

      {activeProjects.map((project) => {
        const projectTasks = tasks.filter((t) => t.project_id === project.id);
        const total = projectTasks.length;
        const done = projectTasks.filter((t) => t.status === "done").length;
        const overdue = projectTasks.filter(
          (t) => isOverdue(t.deadline) && t.status !== "done"
        ).length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        const deadline = formatDeadline(project.deadline);
        const projectDeadlinePast =
          project.deadline != null &&
          new Date(project.deadline) < new Date();

        return (
          <button
            key={project.id}
            onClick={() => onSelectProject?.(project.id)}
            className="w-full text-left bg-white rounded-xl border border-sand-dark hover:border-stone-light transition-colors px-4 py-3 group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-stone shrink-0">
                  {CATEGORY_ICONS[project.category]}
                </span>
                <span className="text-sm font-medium text-stone-dark truncate">
                  {project.name}
                </span>
                {overdue > 0 && (
                  <span className="shrink-0 text-[10px] font-mono bg-rust/10 text-rust px-1.5 py-0.5 rounded-full">
                    {overdue} försenad{overdue !== 1 ? "e" : ""}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                {deadline && (
                  <span
                    className={`flex items-center gap-1 text-[10px] font-mono ${
                      projectDeadlinePast ? "text-rust" : "text-stone"
                    }`}
                  >
                    <Clock size={10} />
                    {deadline}
                  </span>
                )}
                <span className="text-[10px] font-mono text-stone">
                  {done}/{total}
                </span>
              </div>
            </div>

            {/* Progressbar */}
            <div className="h-1.5 bg-sand-dark rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressColor(pct)}`}
                style={{ width: `${Math.max(pct, total === 0 ? 0 : 3)}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] font-mono text-stone">
                {CATEGORY_LABELS[project.category]}
              </span>
              <span className="text-[10px] font-mono text-stone">
                {pct}% klart
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
