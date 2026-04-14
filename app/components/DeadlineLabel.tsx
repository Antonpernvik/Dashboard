"use client";

import { formatDeadline, isOverdue } from "@/lib/utils";
import { Clock, AlertTriangle } from "lucide-react";

interface DeadlineLabelProps {
  deadline: string | null;
}

export default function DeadlineLabel({ deadline }: DeadlineLabelProps) {
  const label = formatDeadline(deadline);
  if (!label) return null;

  const overdue = isOverdue(deadline);

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-mono ${
        overdue ? "text-rust font-medium" : "text-stone"
      }`}
    >
      {overdue ? <AlertTriangle size={11} /> : <Clock size={11} />}
      {label}
    </span>
  );
}
