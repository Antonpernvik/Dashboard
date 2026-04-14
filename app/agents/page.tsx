import { createServerSupabase, isConfigured } from "@/lib/supabase";
import {
  AgentExecution,
  Contact,
  Project,
  Task,
  TaskWithRelations,
} from "@/lib/types";
import AgentsClient from "./AgentsClient";

export const revalidate = 0;

function embedTask(
  raw: unknown
): Pick<Task, "id" | "title"> | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (
      first &&
      typeof first === "object" &&
      "id" in first &&
      "title" in first
    ) {
      return {
        id: String((first as { id: unknown }).id),
        title: String((first as { title: unknown }).title),
      };
    }
    return null;
  }
  if (typeof raw === "object" && "id" in raw && "title" in raw) {
    const o = raw as { id: unknown; title: unknown };
    return { id: String(o.id), title: String(o.title) };
  }
  return null;
}

const TASK_SELECT =
  "*, projects(id, name, category), contacts(id, name, company)";

function countTasksByProject(
  rows: { project_id: string | null }[] | null
): Record<string, number> {
  const counts: Record<string, number> = {};
  if (!rows) return counts;
  for (const r of rows) {
    if (r.project_id) counts[r.project_id] = (counts[r.project_id] || 0) + 1;
  }
  return counts;
}

export default async function AgentsPage() {
  let projects: Project[] = [];
  let contacts: Contact[] = [];
  let tasksOpen: TaskWithRelations[] = [];
  let executions: AgentExecution[] = [];
  let taskCountsByProject: Record<string, number> = {};

  if (isConfigured) {
    try {
      const supabase = createServerSupabase();
      const [projectsRes, contactsRes, tasksRes, execRes, countsRes] =
        await Promise.all([
          supabase.from("projects").select("*").order("name"),
          supabase.from("contacts").select("*").order("name"),
          supabase
            .from("tasks")
            .select(TASK_SELECT)
            .neq("status", "done")
            .order("priority", { ascending: false }),
          supabase
            .from("agent_executions")
            .select("*, tasks(id, title)")
            .order("created_at", { ascending: false })
            .limit(50),
          supabase.from("tasks").select("project_id"),
        ]);

      if (projectsRes.error) {
        console.error("agents projects:", projectsRes.error.message);
      }
      if (contactsRes.error) {
        console.error("agents contacts:", contactsRes.error.message);
      }
      if (tasksRes.error) {
        console.error("agents tasks:", tasksRes.error.message);
      }
      if (execRes.error) {
        console.error("agents executions:", execRes.error.message);
      }

      projects = (projectsRes.data || []) as Project[];
      contacts = (contactsRes.data || []) as Contact[];
      tasksOpen = (tasksRes.data || []) as TaskWithRelations[];
      taskCountsByProject = countTasksByProject(countsRes.data || []);

      const rawExec = execRes.data || [];
      for (const r of rawExec) {
        const row = r as Record<string, unknown>;
        const agentRaw = row.agent;
        if (typeof agentRaw !== "string") continue;
        const statusRaw = row.status;
        const status =
          statusRaw === "started" ||
          statusRaw === "running" ||
          statusRaw === "completed" ||
          statusRaw === "failed"
            ? statusRaw
            : "started";

        const agent: AgentExecution["agent"] =
          agentRaw === "leopold" ||
          agentRaw === "claude" ||
          agentRaw === "jarvis" ||
          agentRaw === "system"
            ? agentRaw
            : "system";

        executions.push({
          id: String(row.id),
          task_id: typeof row.task_id === "string" ? row.task_id : null,
          agent,
          action: typeof row.action === "string" ? row.action : "",
          status,
          input:
            row.input &&
            typeof row.input === "object" &&
            !Array.isArray(row.input)
              ? (row.input as Record<string, unknown>)
              : null,
          output:
            row.output &&
            typeof row.output === "object" &&
            !Array.isArray(row.output)
              ? (row.output as Record<string, unknown>)
              : null,
          error: typeof row.error === "string" ? row.error : null,
          started_at:
            typeof row.started_at === "string"
              ? row.started_at
              : new Date().toISOString(),
          completed_at:
            typeof row.completed_at === "string" ? row.completed_at : null,
          created_at:
            typeof row.created_at === "string"
              ? row.created_at
              : new Date().toISOString(),
          tasks: embedTask(row.tasks),
        });
      }
    } catch (e) {
      console.error("AgentsPage:", e);
    }
  }

  return (
    <AgentsClient
      initialTasksOpen={tasksOpen}
      initialExecutions={executions}
      projects={projects}
      contacts={contacts}
      taskCountsByProject={taskCountsByProject}
    />
  );
}
