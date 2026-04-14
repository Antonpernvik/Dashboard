import { createServerSupabase, isConfigured } from "@/lib/supabase";
import { TaskWithRelations, Project, Contact } from "@/lib/types";
import Timeline from "../components/Timeline";

export const revalidate = 0;

const TASK_WITH_PROJECTS =
  "*, projects(id, name, category), contacts(id, name, company)";

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

export default async function TimelinePage() {
  let deadlineTasks: TaskWithRelations[] = [];
  let taskCountsByProject: Record<string, number> = {};
  let projects: Project[] = [];
  let contacts: Contact[] = [];

  if (isConfigured) {
    try {
      const supabase = createServerSupabase();
      const [deadlineRes, countsRes, projectsRes, contactsRes] =
        await Promise.all([
          supabase
            .from("tasks")
            .select(TASK_WITH_PROJECTS)
            .not("deadline", "is", null)
            .order("deadline", { ascending: true }),
          supabase.from("tasks").select("project_id"),
          supabase.from("projects").select("*").order("name"),
          supabase.from("contacts").select("*").order("name"),
        ]);
      if (deadlineRes.error) {
        console.error("timeline tasks:", deadlineRes.error.message);
      }
      if (countsRes.error) {
        console.error("timeline counts:", countsRes.error.message);
      }
      deadlineTasks = (deadlineRes.data || []) as TaskWithRelations[];
      taskCountsByProject = countTasksByProject(countsRes.data || []);
      projects = (projectsRes.data || []) as Project[];
      contacts = (contactsRes.data || []) as Contact[];
    } catch (e) {
      console.error("TimelinePage:", e);
    }
  }

  return (
    <Timeline
      initialDeadlineTasks={deadlineTasks}
      initialProjects={projects}
      initialContacts={contacts}
      taskCountsByProject={taskCountsByProject}
    />
  );
}
