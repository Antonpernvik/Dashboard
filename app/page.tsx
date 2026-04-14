import { createServerSupabase, isConfigured } from "@/lib/supabase";
import { TaskWithRelations, Project, Contact } from "@/lib/types";
import Dashboard from "./components/Dashboard";

export const revalidate = 0;

export default async function Home() {
  let tasks: TaskWithRelations[] = [];
  let projects: Project[] = [];
  let contacts: Contact[] = [];

  if (isConfigured) {
    try {
      const supabase = createServerSupabase();
      const [tasksRes, projectsRes, contactsRes] = await Promise.all([
        supabase
          .from("tasks")
          .select(
            "*, projects(id, name, category), contacts(id, name, company)"
          )
          .order("created_at", { ascending: false }),
        supabase.from("projects").select("*").order("name"),
        supabase.from("contacts").select("*").order("name"),
      ]);
      tasks = (tasksRes.data || []) as TaskWithRelations[];
      projects = (projectsRes.data || []) as Project[];
      contacts = (contactsRes.data || []) as Contact[];
    } catch {
      // Supabase unavailable
    }
  }

  return (
    <Dashboard
      initialTasks={tasks}
      initialProjects={projects}
      initialContacts={contacts}
    />
  );
}
