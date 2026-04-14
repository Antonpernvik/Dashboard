"use client";

import { TaskStatus } from "@/lib/types";

const STATUS_RING: Record<TaskStatus, string> = {
  todo: "border-stone bg-transparent",
  in_progress: "border-sea bg-sea/30",
  waiting: "border-amber bg-amber/20",
  done: "border-moss bg-moss",
};

const STATUS_CHECK: Record<TaskStatus, boolean> = {
  todo: false,
  in_progress: false,
  waiting: false,
  done: true,
};

interface StatusCircleProps {
  status: TaskStatus;
  onClick: (e: React.MouseEvent) => void;
}

export default function StatusCircle({ status, onClick }: StatusCircleProps) {
  return (
    <button
      onClick={onClick}
      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all hover:scale-110 ${STATUS_RING[status]}`}
      title="Flytta till nästa status"
    >
      {STATUS_CHECK[status] && (
        <svg
          width="10"
          height="8"
          viewBox="0 0 10 8"
          fill="none"
          className="text-white"
        >
          <path
            d="M1 4L3.5 6.5L9 1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
