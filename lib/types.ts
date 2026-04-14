export type ProjectCategory =
  | "energi"
  | "bygg"
  | "gym"
  | "drift"
  | "it"
  | "hospitality"
  | "admin"
  | "ovrigt";

export type ProjectStatus = "active" | "paused" | "completed" | "archived";

export type TaskStatus = "todo" | "in_progress" | "waiting" | "done";
export type TaskFilterStatus = TaskStatus | "overdue";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskAssignee = "leopold" | "claude" | "jarvis";

/** Tilldelningsbara agenter (samma som TaskAssignee) */
export type AgentName = TaskAssignee;

/** Värden i agent_executions.agent (Supabase kan även ha "system") */
export type ExecutionAgent = TaskAssignee | "system";

export interface Project {
  id: string;
  name: string;
  category: ProjectCategory;
  description: string | null;
  status: ProjectStatus;
  deadline: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  name: string;
  company: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  project_id: string | null;
  contact_id: string | null;
  assigned_to: TaskAssignee | null;
  deadline: string | null;
  waiting_on: string | null;
  source: string | null;
  source_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskWithRelations extends Task {
  projects: Pick<Project, "id" | "name" | "category"> | null;
  contacts: Pick<Contact, "id" | "name" | "company"> | null;
}

export interface AgentExecution {
  id: string;
  task_id: string | null;
  agent: ExecutionAgent;
  action: string;
  status: "started" | "running" | "completed" | "failed";
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  /** PostgREST-embed från tasks */
  tasks: Pick<Task, "id" | "title"> | null;
}

export const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  energi: "Energi",
  bygg: "Bygg",
  gym: "Gym",
  drift: "Drift",
  it: "IT",
  hospitality: "Hospitality",
  admin: "Admin",
  ovrigt: "Övrigt",
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Att göra",
  in_progress: "Pågår",
  waiting: "Väntar",
  done: "Klar",
};

export const FILTER_STATUS_LABELS: Record<TaskFilterStatus, string> = {
  overdue: "Försenad",
  todo: "Att göra",
  in_progress: "Pågår",
  waiting: "Väntar",
  done: "Klar",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: "Urgent",
  high: "Hög",
  medium: "Medium",
  low: "Låg",
};

export const ASSIGNEE_LABELS: Record<TaskAssignee, string> = {
  leopold: "Leopold",
  claude: "Claude",
  jarvis: "Jarvis",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Aktiv",
  paused: "Pausad",
  completed: "Slutförd",
  archived: "Arkiverad",
};
