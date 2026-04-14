import { createServerSupabase, isConfigured } from "@/lib/supabase";
import { Project, Task } from "@/lib/types";
import ProjectsClient from "./ProjectsClient";

export const revalidate = 0;

/** Task-fält för räkning per projekt + lista vid valt projekt */
const TASK_COLUMNS =
  "id, title, status, priority, project_id, deadline, assigned_to, created_at";

export default async function ProjectsPage() {
  let projects: Project[] = [];
  let tasks: Task[] = [];

  if (isConfigured) {
    try {
      const supabase = createServerSupabase();
      const [projectsRes, tasksRes] = await Promise.all([
        supabase.from("projects").select("*").order("created_at", { ascending: false }),
        supabase.from("tasks").select(TASK_COLUMNS).order("created_at", { ascending: false }),
      ]);
      if (projectsRes.error) {
        console.error("projects fetch:", projectsRes.error.message);
      }
      if (tasksRes.error) {
        console.error("tasks fetch:", tasksRes.error.message);
      }
      projects = (projectsRes.data || []) as Project[];
      tasks = (tasksRes.data || []) as Task[];
    } catch (e) {
      console.error("ProjectsPage Supabase:", e);
    }
  }

  return <ProjectsClient initialProjects={projects} initialTasks={tasks} />;
}
