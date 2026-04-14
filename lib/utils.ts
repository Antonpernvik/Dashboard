import { TaskStatus, TaskPriority } from "./types";

export const STATUS_ORDER: TaskStatus[] = [
  "todo",
  "in_progress",
  "waiting",
  "done",
];

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  todo: "in_progress",
  in_progress: "waiting",
  waiting: "done",
  done: "done",
};

export function getNextStatus(current: TaskStatus): TaskStatus {
  return NEXT_STATUS[current];
}

export function getPriorityColor(priority: TaskPriority): string {
  const map: Record<TaskPriority, string> = {
    urgent: "border-rust",
    high: "border-amber",
    medium: "border-sea",
    low: "border-stone-light",
  };
  return map[priority];
}

export function getPriorityDot(priority: TaskPriority): string {
  const map: Record<TaskPriority, string> = {
    urgent: "bg-rust",
    high: "bg-amber",
    medium: "bg-sea",
    low: "bg-stone-light",
  };
  return map[priority];
}

export function getStatusColor(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    todo: "text-stone-dark",
    in_progress: "text-sea",
    waiting: "text-amber",
    done: "text-moss",
  };
  return map[status];
}

export function getStatusBg(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    todo: "bg-stone/10 text-stone-dark",
    in_progress: "bg-sea/10 text-sea",
    waiting: "bg-amber/10 text-amber-dark",
    done: "bg-moss/10 text-moss",
  };
  return map[status];
}

export function formatDeadline(dateStr: string | null): string | null {
  if (!dateStr) return null;

  const deadline = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffMs = deadline.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Idag";
  if (diffDays === 1) return "Imorgon";
  if (diffDays === -1) return "Igår";
  if (diffDays > 1 && diffDays <= 14) return `${diffDays}d kvar`;
  if (diffDays < -1) return `${Math.abs(diffDays)}d sen`;

  return deadline.toLocaleDateString("sv-SE", {
    day: "numeric",
    month: "short",
  });
}

export function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const deadline = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return deadline.getTime() < today.getTime();
}

export function sortTasksByStatus<T extends { status: TaskStatus }>(
  tasks: T[]
): T[] {
  return [...tasks].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  );
}

export function groupTasksByStatus<T extends { status: TaskStatus }>(
  tasks: T[]
): Map<TaskStatus, T[]> {
  const grouped = new Map<TaskStatus, T[]>();
  for (const status of STATUS_ORDER) {
    grouped.set(status, []);
  }
  for (const task of tasks) {
    grouped.get(task.status)?.push(task);
  }
  return grouped;
}
