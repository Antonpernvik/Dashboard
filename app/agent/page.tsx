import { createServerSupabase, isConfigured } from "@/lib/supabase";
import { Project } from "@/lib/types";
import AgentClient from "./AgentClient";

export const revalidate = 0;

function countTasksByProject(
  rows: { project_id: string | null }[] | null
): Record<string, number> {
  const counts: Record<string, number> = {};
  if (!rows) return counts;
  for (const r of rows) {
    if (r.project_id) {
      counts[r.project_id] = (counts[r.project_id] || 0) + 1;
    }
  }
  return counts;
}

export default async function AgentPage() {
  let projects: Project[] = [];
  let taskCountsByProject: Record<string, number> = {};

  if (isConfigured) {
    try {
      const supabase = createServerSupabase();
      const [projectsRes, countsRes] = await Promise.all([
        supabase.from("projects").select("*").order("name"),
        supabase.from("tasks").select("project_id"),
      ]);
      projects = (projectsRes.data || []) as Project[];
      taskCountsByProject = countTasksByProject(countsRes.data || []);
    } catch (e) {
      console.error("AgentPage:", e);
    }
  }

  return (
    <AgentClient
      initialProjects={projects}
      taskCountsByProject={taskCountsByProject}
    />
  );
}
