"use client";

import { FILTER_STATUS_LABELS, TaskFilterStatus } from "@/lib/types";
import { STATUS_ORDER, getStatusBg } from "@/lib/utils";

interface StatsBarProps {
  counts: Record<TaskFilterStatus, number>;
  selectedStatus: TaskFilterStatus | null;
  onSelectStatus: (status: TaskFilterStatus | null) => void;
}

export default function StatsBar({
  counts,
  selectedStatus,
  onSelectStatus,
}: StatsBarProps) {
  const total = Object.values(counts).reduce((s, c) => s + c, 0);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={() => onSelectStatus(null)}
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          selectedStatus === null
            ? "bg-stone-dark text-white"
            : "bg-sand-dark text-stone hover:text-stone-dark"
        }`}
      >
        Alla
        <span className="ml-1.5 font-mono text-xs opacity-70">{total}</span>
      </button>

      {(["overdue", ...STATUS_ORDER] as TaskFilterStatus[]).map((status) => {
        const count = counts[status] || 0;
        const isActive = selectedStatus === status;
        const isOverdue = status === "overdue";

        return (
          <button
            key={status}
            onClick={() => onSelectStatus(status)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              isActive
                ? isOverdue
                  ? "bg-rust/10 text-rust"
                  : getStatusBg(status)
                : isOverdue && count > 0
                ? "bg-rust/5 text-rust hover:bg-rust/10"
                : "bg-sand-dark text-stone hover:text-stone-dark"
            }`}
          >
            {FILTER_STATUS_LABELS[status]}
            <span className="ml-1.5 font-mono text-xs opacity-70">
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
