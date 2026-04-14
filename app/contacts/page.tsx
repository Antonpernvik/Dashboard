import { createServerSupabase, isConfigured } from "@/lib/supabase";
import { Contact, Project } from "@/lib/types";
import ContactsClient, { ContactLinkedTask } from "./ContactsClient";

export const revalidate = 0;

const CONTACT_TASK_SELECT =
  "id, title, status, priority, deadline, contact_id, projects(name)";

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

export default async function ContactsPage() {
  let contacts: Contact[] = [];
  let contactTasks: ContactLinkedTask[] = [];
  let projects: Project[] = [];
  let taskCountsByProject: Record<string, number> = {};

  if (isConfigured) {
    try {
      const supabase = createServerSupabase();
      const [contactsRes, tasksRes, projectsRes, countsRes] =
        await Promise.all([
          supabase
            .from("contacts")
            .select("*")
            .order("company", { ascending: true, nullsFirst: false })
            .order("name", { ascending: true }),
          supabase
            .from("tasks")
            .select(CONTACT_TASK_SELECT)
            .not("contact_id", "is", null),
          supabase.from("projects").select("*").order("name"),
          supabase.from("tasks").select("project_id"),
        ]);

      if (contactsRes.error) {
        console.error("contacts:", contactsRes.error.message);
      }
      if (tasksRes.error) {
        console.error("contact tasks:", tasksRes.error.message);
      }

      contacts = (contactsRes.data || []) as Contact[];
      contactTasks = (tasksRes.data || []) as ContactLinkedTask[];
      projects = (projectsRes.data || []) as Project[];
      taskCountsByProject = countTasksByProject(countsRes.data || []);
    } catch (e) {
      console.error("ContactsPage:", e);
    }
  }

  return (
    <ContactsClient
      initialContacts={contacts}
      initialContactTasks={contactTasks}
      projects={projects}
      taskCountsByProject={taskCountsByProject}
    />
  );
}
