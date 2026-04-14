"use client";

import { useMemo, useState } from "react";
import {
  Project,
  Contact,
  Task,
  TaskWithRelations,
  TaskFilterStatus,
  TaskStatus,
  STATUS_LABELS,
} from "@/lib/types";
import { createBrowserSupabase } from "@/lib/supabase";
import { getNextStatus, isOverdue } from "@/lib/utils";
import { useToast } from "./Toast";
import { useRealtimeTasks } from "@/lib/hooks/useRealtimeTasks";
import Sidebar from "./Sidebar";
import StatsBar from "./StatsBar";
import TaskList from "./TaskList";
import TaskModal from "./TaskModal";
import CommandSearch from "./CommandSearch";
import { Plus, Search } from "lucide-react";

interface DashboardProps {
  initialTasks: TaskWithRelations[];
  initialProjects: Project[];
  initialContacts: Contact[];
}

export default function Dashboard({
  initialTasks,
  initialProjects,
  initialContacts,
}: DashboardProps) {
  const [projects] = useState<Project[]>(initialProjects);
  const [contacts] = useState<Contact[]>(initialContacts);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<TaskFilterStatus | null>(
    null
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null);

  const supabase = useMemo(() => createBrowserSupabase(), []);
  const { toast } = useToast();

  const {
    tasks,
    optimisticUpdate,
    optimisticInsert,
    optimisticDelete,
    refetch,
    externallyUpdated,
  } = useRealtimeTasks(initialTasks, supabase, toast);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (selectedProject) {
      result = result.filter((t) => t.project_id === selectedProject);
    }
    if (selectedStatus) {
      result =
        selectedStatus === "overdue"
          ? result.filter((t) => isOverdue(t.deadline) && t.status !== "done")
          : result.filter((t) => t.status === selectedStatus);
    }
    return result;
  }, [tasks, selectedProject, selectedStatus]);

  const statusCounts = useMemo(() => {
    const base = selectedProject
      ? tasks.filter((t) => t.project_id === selectedProject)
      : tasks;
    const counts: Record<TaskFilterStatus, number> = {
      overdue: 0,
      todo: 0,
      in_progress: 0,
      waiting: 0,
      done: 0,
    };
    for (const t of base) {
      counts[t.status] += 1;
      if (isOverdue(t.deadline) && t.status !== "done") {
        counts.overdue += 1;
      }
    }
    return counts;
  }, [tasks, selectedProject]);

  const taskCountsByProject = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tasks) {
      if (t.project_id) {
        counts[t.project_id] = (counts[t.project_id] || 0) + 1;
      }
    }
    return counts;
  }, [tasks]);

  async function handleStatusAdvance(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const nextStatus = getNextStatus(task.status);
    if (nextStatus === task.status) return;
    await optimisticUpdate(taskId, { status: nextStatus });
    toast(`Status ändrad till ${STATUS_LABELS[nextStatus]}`);
  }

  async function handleDrop(taskId: string, newStatus: TaskStatus) {
    await optimisticUpdate(taskId, { status: newStatus });
    toast(`Flyttad till ${STATUS_LABELS[newStatus]}`);
  }

  async function handleUpdateTask(
    taskId: string,
    updates: Partial<TaskWithRelations>
  ) {
    await optimisticUpdate(taskId, updates);
    toast("Uppgift uppdaterad");
  }

  async function handleSave(data: Partial<Task>) {
    if (data.id) {
      const { id, ...updates } = data;
      await optimisticUpdate(id, updates);
      toast("Uppgift sparad");
    } else {
      await optimisticInsert(data);
      toast("Uppgift skapad");
    }
    setModalOpen(false);
    setEditingTask(null);
  }

  async function handleDelete(taskId: string) {
    await optimisticDelete(taskId);
    toast("Uppgift raderad", "info");
    setModalOpen(false);
    setEditingTask(null);
  }

  function openCreate() {
    setEditingTask(null);
    setModalOpen(true);
  }

  function openEdit(task: TaskWithRelations) {
    setEditingTask(task);
    setModalOpen(true);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={setSelectedProject}
        taskCounts={taskCountsByProject}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-display text-stone-dark">
                {selectedProject
                  ? projects.find((p) => p.id === selectedProject)?.name ||
                    "Projekt"
                  : "Alla uppgifter"}
              </h2>
              <p className="text-sm text-stone mt-0.5">
                {filteredTasks.length} uppgift
                {filteredTasks.length !== 1 ? "er" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const event = new KeyboardEvent("keydown", {
                    key: "k",
                    metaKey: true,
                  });
                  document.dispatchEvent(event);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-stone hover:text-stone-dark bg-white border border-sand-dark rounded-lg hover:border-stone-light transition-colors"
              >
                <Search size={14} />
                <span className="hidden sm:inline">Sök</span>
                <kbd className="hidden sm:inline-flex ml-1 items-center px-1.5 py-0.5 rounded bg-sand-dark text-[10px] font-mono text-stone">
                  ⌘K
                </kbd>
              </button>
              <button
                onClick={openCreate}
                className="flex items-center gap-1.5 px-4 py-2 bg-sea text-white text-sm font-medium rounded-lg hover:bg-sea-dark transition-colors"
              >
                <Plus size={16} />
                Ny uppgift
              </button>
            </div>
          </div>

          <div className="mb-6">
            <StatsBar
              counts={statusCounts}
              selectedStatus={selectedStatus}
              onSelectStatus={setSelectedStatus}
            />
          </div>

          <TaskList
            tasks={filteredTasks}
            contacts={contacts}
            selectedStatus={selectedStatus === "overdue" ? null : selectedStatus}
            onStatusAdvance={handleStatusAdvance}
            onTaskClick={openEdit}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDelete}
            onDrop={handleDrop}
            externallyUpdated={externallyUpdated}
          />
        </div>
      </main>

      <CommandSearch
        tasks={tasks}
        onSelectTask={openEdit}
        onStatusAdvance={handleStatusAdvance}
      />

      <TaskModal
        open={modalOpen}
        task={editingTask}
        projects={projects}
        contacts={contacts}
        onClose={() => {
          setModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
