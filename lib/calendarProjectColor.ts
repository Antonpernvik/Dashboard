import { isOverdue } from "@/lib/utils";
import type { TaskStatus } from "@/lib/types";

/** Endast bakgrund — t.ex. tidslinje-stapel i vecko-vy */
const PROJECT_BAR_BG = [
  "bg-sea",
  "bg-moss",
  "bg-sea-light",
  "bg-amber",
  "bg-stone-dark",
  "bg-moss-light",
] as const;

/** Palett för projekt-chips (Tailwind-klasser, safelist-vänliga) */
const PROJECT_CHIP_PALETTE = [
  "bg-sea text-white border border-sea-dark/40",
  "bg-moss text-white border border-moss-dark/40",
  "bg-sea-light text-stone-dark border border-sea-dark/35",
  "bg-amber text-stone-dark border border-amber-dark/50",
  "bg-stone-dark text-sand border border-stone",
  "bg-moss-light text-stone-dark border border-moss-dark/40",
] as const;

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Deadline passerad och inte klar → försenad (rust) */
export function isCalendarOverdue(
  deadline: string | null,
  status: TaskStatus
): boolean {
  return status !== "done" && isOverdue(deadline);
}

/** Chip-stil: försenad = rust, annars färg per projekt-id */
export function taskChipClass(projectId: string | null, overdue: boolean): string {
  if (overdue) {
    return "bg-rust text-white border border-rust-dark shadow-sm";
  }
  if (!projectId) {
    return "bg-stone text-white border border-stone-dark/30";
  }
  const idx = hashString(projectId) % PROJECT_CHIP_PALETTE.length;
  return PROJECT_CHIP_PALETTE[idx] ?? PROJECT_CHIP_PALETTE[0];
}

/** Smal färgstapel (vecko-vy) — samma projekt → samma färg som chip */
export function taskBarBgClass(projectId: string | null, overdue: boolean): string {
  if (overdue) return "bg-rust";
  if (!projectId) return "bg-stone";
  const idx = hashString(projectId) % PROJECT_BAR_BG.length;
  return PROJECT_BAR_BG[idx] ?? PROJECT_BAR_BG[0];
}
